import { GoogleGenerativeAI } from '@google/generative-ai';
import { HackXRayLLMClient } from '../domain/ports';
import { LabReport } from '../domain/labReport';
import { HackXRayLLMOutputError } from '../domain/errors';

// Helper para extraer y "reparar" el JSON principal de la respuesta del modelo
function extractAndRepairJson(raw: string): string {
  let text = raw.trim();

  // Quitar fences de markdown si vienen
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Buscar el primer '{' como inicio del objeto JSON
  const first = text.indexOf('{');
  if (first === -1) {
    throw new Error('No JSON object found in model response');
  }

  text = text.slice(first);

  // Recorremos el texto contando llaves, respetando strings y escapes
  let inString = false;
  let escape = false;
  let depth = 0;
  let endIndex = text.length;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endIndex = i + 1; // cierre del objeto raíz
          break;
        }
      }
    }
  }

  let candidate = text.slice(0, endIndex);

  // Si depth > 0 significa que faltan llaves de cierre → las agregamos al final
  while (depth > 0) {
    candidate += '}';
    depth--;
  }

  return candidate;
}

// Normaliza el objeto parseado para asegurar que cumple el shape de LabReport
function normalizeLabReport(parsed: any, country: string): LabReport {
  const meta = parsed?.meta ?? {};
  const hackNormalized = parsed?.hackNormalized ?? {};
  const evaluationPanel = parsed?.evaluationPanel ?? {};
  const legalityCompliance = evaluationPanel?.legalityCompliance ?? {};
  const mathRealImpact = evaluationPanel?.mathRealImpact ?? {};
  const riskFragility = evaluationPanel?.riskFragility ?? {};
  const practicalityFriction = evaluationPanel?.practicalityFriction ?? {};
  const systemQuirkLoophole = evaluationPanel?.systemQuirkLoophole ?? {};
  const verdict = parsed?.verdict ?? {};
  const keyPoints = parsed?.keyPoints ?? {};

  const normalized: LabReport = {
    meta: {
      version: meta.version ?? '1.0',
      language: meta.language ?? 'en',
      country: meta.country ?? country,
    },
    hackNormalized: {
      title: hackNormalized.title ?? 'Untitled hack',
      shortSummary:
        hackNormalized.shortSummary ??
        'No short summary provided by the model.',
      detailedSummary:
        hackNormalized.detailedSummary ??
        'No detailed summary provided by the model.',
      // Si el modelo devuelve algo raro, caemos a "unknown"
      hackType:
        hackNormalized.hackType ??
        'unknown',
      primaryCategory:
        hackNormalized.primaryCategory ??
        'General',
    },
    evaluationPanel: {
      legalityCompliance: {
        // defaults seguros
        label:
          legalityCompliance.label ??
          'gray_area',
        notes:
          legalityCompliance.notes ??
          'Model did not provide detailed legality notes.',
      },
      mathRealImpact: {
        score0to10:
          typeof mathRealImpact.score0to10 === 'number'
            ? mathRealImpact.score0to10
            : 0,
      },
      riskFragility: {
        score0to10:
          typeof riskFragility.score0to10 === 'number'
            ? riskFragility.score0to10
            : 0,
      },
      practicalityFriction: {
        score0to10:
          typeof practicalityFriction.score0to10 === 'number'
            ? practicalityFriction.score0to10
            : 0,
      },
      systemQuirkLoophole: {
        usesSystemQuirk:
          typeof systemQuirkLoophole.usesSystemQuirk === 'boolean'
            ? systemQuirkLoophole.usesSystemQuirk
            : false,
      },
    },
    verdict: {
      label:
        verdict.label ??
        'works_only_if', // valor por defecto razonable
      headline:
        verdict.headline ??
        'Model did not provide a verdict headline.',
    },
    keyPoints: {
      keyRisks:
        Array.isArray(keyPoints.keyRisks) &&
          keyPoints.keyRisks.length > 0
          ? keyPoints.keyRisks
          : ['Model did not explicitly list key risks.'],
    },
  };

  return normalized;
}

// Fallback cuando el modelo no devuelve texto (respuesta vacía)
function buildFallbackLabReport(hackText: string, country: string): LabReport {
  const shortened =
    hackText.length > 100 ? hackText.slice(0, 97) + '...' : hackText;

  const skeleton = {
    meta: {
      version: '1.0',
      language: 'en',
      country,
    },
    hackNormalized: {
      title: 'Hack could not be analyzed',
      shortSummary:
        'The AI model did not return a valid analysis for this hack.',
      detailedSummary:
        'The AI model failed to generate a structured lab report for this hack. This is likely due to internal safety filters or transient model issues. Treat this hack with extra caution and do not rely on it for important financial decisions.',
      hackType: 'unknown',
      primaryCategory: 'General',
    },
    evaluationPanel: {
      legalityCompliance: {
        label: 'gray_area',
        notes:
          'The AI model did not provide a legality assessment. Assume this hack has unverified or unclear legal implications.',
      },
      mathRealImpact: { score0to10: 0 },
      riskFragility: { score0to10: 8 },
      practicalityFriction: { score0to10: 5 },
      systemQuirkLoophole: { usesSystemQuirk: false },
    },
    verdict: {
      label: 'works_only_if',
      headline: 'No reliable AI verdict available for this hack',
    },
    keyPoints: {
      keyRisks: [
        'The hack could be misinterpreted because it was not properly analyzed by the AI.',
        'There may be hidden costs, risks, or legal issues that were not surfaced.',
        'You should seek independent financial advice before attempting this hack.',
        `Original hack snippet: "${shortened}"`,
      ],
    },
  };

  return normalizeLabReport(skeleton, country);
}

export class HackXRayGeminiLLMClient implements HackXRayLLMClient {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || 'dummy_key';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateLabReport(hackText: string, country: string): Promise<LabReport> {
    const systemPrompt = `
You are Hintsly Hack X-Ray, an expert financial analyst AI.
Your goal is to analyze a "money hack" and generate a structured Lab Report.
You must be objective, critical, and precise.
Follow the "Your Money Your Life" (YMYL) principles: be cautious, never guarantee results, and highlight risks.

You MUST output a valid JSON object with this shape (this is an EXAMPLE, not literal output):

{
  "meta": {
    "version": "1.0",
    "language": "en",
    "country": "${country}"
  },
  "hackNormalized": {
    "title": "Short catchy title",
    "shortSummary": "One sentence summary",
    "detailedSummary": "Two or three sentence explanation",
    "hackType": "quick_fix",
    "primaryCategory": "Credit Cards"
  },
  "evaluationPanel": {
    "legalityCompliance": {
      "label": "clean",
      "notes": "Brief explanation of legality"
    },
    "mathRealImpact": { "score0to10": 7 },
    "riskFragility": { "score0to10": 6 },
    "practicalityFriction": { "score0to10": 4 },
    "systemQuirkLoophole": { "usesSystemQuirk": true }
  },
  "verdict": {
    "label": "solid",
    "headline": "Punchy verdict headline"
  },
  "keyPoints": {
    "keyRisks": ["Risk 1", "Risk 2", "Risk 3"]
  }
}

Rules:
- All fields above MUST be present in the JSON.
- All strings MUST be valid JSON strings (escape internal quotes with \").
- All numbers MUST be valid JSON numbers between 0 and 10 for score0to10 fields.
- usesSystemQuirk MUST be a boolean.
- Do NOT include any comments, explanations, markdown, or extra text outside the JSON.
- The response MUST start with '{' and end with '}'.
`;

    const userPrompt = `Analyze this hack for country ${country}:\n\n"${hackText}"`;

    try {
      const model = this.genAI.getGenerativeModel(
        {
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192, // Increased to allow complete JSON responses
            responseMimeType: 'application/json', // Force JSON output
          },
        },
        { apiVersion: 'v1beta' }, // Use v1beta for gemini-2.0
      );

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }],
          },
        ],
      });

      const response = result.response;
      let text = response.text();

      // ⚠️ Caso problemático: a veces viene vacío aunque haya candidates
      if (!text) {
        console.warn(
          'Gemini returned empty text(). Building fallback LabReport instead of throwing.',
        );
        // Opcional: loguear candidates para investigar más tarde
        console.log('Gemini raw response object:', JSON.stringify(response, null, 2));
        return buildFallbackLabReport(hackText, country);
      }

      // Extraer y "reparar" un candidato de JSON
      let jsonCandidate: string;
      try {
        jsonCandidate = extractAndRepairJson(text);
      } catch (e) {
        console.error('Failed to extract/repair JSON from response:', e);
        // En vez de romper todo, devolvemos fallback también
        return buildFallbackLabReport(hackText, country);
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonCandidate);
      } catch (e) {
        console.error(
          'Failed to parse JSON from model response:',
          e,
          'jsonCandidate:',
          jsonCandidate,
        );
        // Igual: si el JSON viene roto, devolvemos fallback
        return buildFallbackLabReport(hackText, country);
      }

      const normalized = normalizeLabReport(parsed, country);
      console.log('Normalized LabReport:', normalized);

      return normalized;
    } catch (error: any) {
      console.error('Gemini Error raw:', error);
      const msg =
        error?.response?.data?.error?.message ||
        error?.message ||
        String(error);
      throw new HackXRayLLMOutputError(`Failed to generate report: ${msg}`);
    }
  }
}

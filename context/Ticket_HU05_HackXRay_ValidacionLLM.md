# Ticket_HU05_HackXRay_ValidacionLLM.md  
**Relacionado con HU:** HU05 – Validar estructura y coherencia del Lab Report generado por el LLM  
**Módulo:** `hackXray`  
**Prioridad:** Crítica (YMYL / seguridad / integridad del sistema)  
**Tipo:** Feature – Core Validation Layer  

---

# 1. Resumen

Este ticket implementa la **capa de validación estricta** del JSON producido por el LLM antes de convertirlo en un `LabReport` apto para guardar/visualizar.

Se validan dos ejes:

1. **Validación estructural (schema)**  
2. **Validación de coherencia (reglas de negocio)**  
3. **Filtro de frases peligrosas (YMYL compliance)**

El objetivo:  
✔️ Evitar UI rotas  
✔️ Evitar incoherencias  
✔️ Evitar contenido peligroso  
✔️ Asegurar calidad del X-Ray

---

# 2. Objetivo funcional

**Como** desarrollador responsable de seguridad y calidad del sistema,  
**quiero** validar que el JSON devuelto por el LLM respeta el esquema y la lógica mínima de negocio,  
**para** evitar mostrar resultados incoherentes o peligrosos a los usuarios.

---

# 3. Alcance del ticket

## Incluye

- Validación de estructura mediante Zod o esquema propio.  
- Validación semántica: coherencia entre legalidad, riesgo, matemáticas y veredicto.  
- Detección de frases peligrosas.  
- Nuevos errores formales:  
  - `LLM_OUTPUT_INVALID`  
  - `LLM_OUTPUT_INCOHERENT`  
  - `UNSAFE_OUTPUT`  
- Integración completa en `runHackXRayUseCase`.  
- Tests unitarios exhaustivos.

## No incluye

- Validación del texto pegado por usuario (HU02).  
- Persistencia o listado (HU03/HU04).  

---

# 4. Estructura mínima obligatoria del Lab Report

```ts
interface LabReport {
  meta: {
    version: string;
    language: string;
    country: string;
    input_summary?: any;
  };
  hackNormalized: {
    title: string;
    shortSummary: string;
    detailedSummary: string;
    hackType: string;
    primaryCategory: string;
  };
  evaluationPanel: {
    legalityCompliance: { label: string; notes: string };
    mathRealImpact: { score0to10: number };
    riskFragility: { score0to10: number };
    practicalityFriction: { score0to10: number };
    systemQuirkLoophole: { usesSystemQuirk: boolean };
  };
  superhackPotential?: any;
  verdict: {
    label: string;
    headline: string;
    explanation?: string;
  };
  keyPoints: {
    keyRisks: string[];
  };
  complianceNotes?: {
    educational_only: boolean;
    must_show_disclaimer: boolean;
  };
}
```

---

# 5. Validación estructural (schema)

Crear archivo: `src/modules/hackXray/domain/llmReportSchema.ts`

Validar:

- Strings no vacíos  
- Scores entre 0–10  
- Enums permitidos  
- Arreglo de keyRisks min 1 max 6  

Si falla:

```json
{
  "errorCode": "LLM_OUTPUT_INVALID",
  "message": "The LLM returned a malformed Lab Report."
}
```

---

# 6. Validación de coherencia

Crear archivo `validateCoherence.ts`.

## Reglas:

### 6.1 Legalidad vs veredicto

```
SI legalityCompliance.label === "red_flag"
→ verdict.label NO puede ser:
   - "decent_basic"
   - "works_only_if"
   - "promising_superhack_candidate"
```

### 6.2 Riesgo alto + Impacto bajo

```
SI riskFragility >= 7 && mathRealImpact <= 3
→ verdict.label DEBE ser:
   - "trash"
   - "dangerous_for_most"
```

### 6.3 Practicality extremadamente baja

```
SI practicalityFriction <= 2 Y verdict.label !== "trash"
→ incoherente
```

### 6.4 Loophole delicado

Si `systemQuirkLoophole.usesSystemQuirk = true`  
y legalidad es “grey”  
→ veredicto NUNCA puede ser positivo.

Si falla:

```json
{
  "errorCode": "LLM_OUTPUT_INCOHERENT",
  "message": "Inconsistent evaluation panel and verdict."
}
```

---

# 7. Filtro de frases prohibidas (YMYL compliance)

Archivo: `unsafePhrases.ts`

Frases prohibidas:

- “guaranteed”
- “risk-free”
- “everyone can”
- “you will definitely”
- “free money”
- “no downside”
- “bypass the system”
- “loophole that always works”

Buscar en:

- `detailedSummary`
- `verdict.*`
- `keyRisks.*`

Si aparece:

```json
{
  "errorCode": "UNSAFE_OUTPUT",
  "message": "The LLM output contains unsafe phrasing."
}
```

---

# 8. Integración en `runHackXRayUseCase`

Flujo:

```ts
const raw = await llmClient.generateLabReport(input);

const structured = validateStructure(raw);  
validateCoherence(structured);              
ensureNoUnsafePhrases(structured);          

return structured;
```

Errores:

```ts
throw new DomainError("LLM_OUTPUT_INVALID")
throw new DomainError("LLM_OUTPUT_INCOHERENT")
throw new DomainError("UNSAFE_OUTPUT")
```

---

# 9. Tests requeridos

## 9.1 Unit tests – estructura  
- Falta de campos → falla  
- Tipos incorrectos → falla  
- Scores <0 o >10 → falla  

## 9.2 Unit tests – coherencia  
- `red_flag` + veredicto positivo → error  
- `risk>=7` + `math<=3` → requiere veredicto negativo  
- `practicality<=2` + veredicto positivo → error  

## 9.3 Unit tests – frases prohibidas  
- Detectar “risk-free” en summary → error  
- Detectar “you will definitely” en headline → error  

## 9.4 Integration tests  
- LLM mock perfecto → éxito  
- JSON incompleto → INVALID  
- Veredicto incoherente → INCOHERENT  
- Frase peligrosa → UNSAFE_OUTPUT  

---

# 10. Criterios de aceptación

- [ ] El sistema detecta errores estructurales.  
- [ ] Detecta incoherencias entre scores y veredicto.  
- [ ] Identifica contenido YMYL peligroso.  
- [ ] Retorna los códigos de error correctos.  
- [ ] Tests cubren todos los escenarios críticos.  

---

# 11. Dependencias

- HU01, HU02, HU03  
- LLM Client funcionando  

---

Fin del ticket.

# Ticket_HU01_HackXRay_Run.md  
**Relacionado con HU:** HU01 – Ejecutar un X-Ray sobre un hack pegado por el usuario  
**Módulo:** `hackXray`  
**Prioridad:** Alta  
**Tipo:** Feature  

---

## 1. Resumen

Implementar el flujo completo para que un usuario pueda:

1. Pegar un “money hack” en una pantalla `/hack-xray`.  
2. Enviar el texto a un endpoint `POST /api/hack-xray`.  
3. Recibir un `LabReport` estructurado desde el backend (vía LLM).  
4. Ver en pantalla un panel con:
   - Resumen del hack  
   - Scores principales  
   - Veredicto  
   - 2–3 bullets de riesgos clave  

Este ticket cubre **toda la vertical** de HU01, pero con un enfoque **MVP**:

- UI sencilla (sin estilos avanzados, pero usable).  
- Integración real con LLM usando el cliente definido.  
- Validación básica de respuesta JSON (no toda la lógica avanzada de HU05, eso va en otro ticket).  

---

## 2. Objetivo funcional

**Como** usuario curioso que ve hacks financieros en redes,  
**quiero** pegar el texto o link de un hack y obtener un “Lab Report Hintsly”,  
**para** entender rápidamente si es basura, peligroso o realmente útil.

---

## 3. Alcance de este ticket

### Incluye

- **Frontend**:
  - Página `/hack-xray` con:
    - `textarea` para `hackText`.
    - Campo opcional `sourceLink`.
    - Botón “Run X-Ray”.
  - Llamada al endpoint `POST /api/hack-xray`.
  - Renderizado del resultado:
    - Resumen del hack.
    - Panel con scores principales.
    - Veredicto + etiqueta visual.
    - 2–3 bullets de riesgos clave.
  - Manejo básico de estados:
    - Idle / Loading / Success / Error.

- **Backend (Next.js API Route Handler)**:
  - Implementar `POST /api/hack-xray`:
    - Validar body de entrada (Zod).
    - Invocar caso de uso `runHackXRayUseCase`.
    - Devolver `LabReportDTO` o error estándar.

- **Capa application/domain mínima**:
  - Definir tipos de dominio básicos para `HackXRayInput` y `LabReport`.
  - Implementar `runHackXRayUseCase`:
    - Llamar a `HackXRayLLMClient`.
    - Hacer una validación mínima de estructura.
    - Devolver `LabReport`.

- **Integración LLM mínima**:
  - Implementar `HackXRayLLMClient` con:
    - Prompts base (system + user).
    - Petición a API de LLM.
    - Return de JSON parseado.

### No incluye (se hace en otros tickets)

- Validación profunda del JSON del LLM (HU05).  
- Persistencia en BD de los `LabReport` (HU03).  
- Listado/filtrado de hacks (HU04).  
- Reglas de coherencia avanzadas / palabras prohibidas (HU05/HU06).

---

## 4. API Contract – `POST /api/hack-xray`

### Endpoint

`POST /api/hack-xray`

### Request body (JSON)

```json
{
  "hackText": "string (obligatorio)",
  "sourceLink": "string | null (opcional)",
  "country": "string (opcional, default 'US')"
}
```

Validaciones mínimas:

- `hackText`:
  - `string`,
  - trim() no vacío,
  - longitud mínima recomendada: 20 chars.
- `sourceLink`:
  - `string` URL válida si se provee (validación ligera).
- `country`:
  - si no se envía → `"US"`.

### Response 200 – éxito

```json
{
  "labReport": {
    "meta": { "version": "string", "language": "string", "country": "string" },
    "hackNormalized": {
      "title": "string",
      "shortSummary": "string",
      "detailedSummary": "string",
      "hackType": "string",
      "primaryCategory": "string"
    },
    "evaluationPanel": {
      "legalityCompliance": {
        "label": "string",
        "notes": "string"
      },
      "mathRealImpact": { "score0to10": 0 },
      "riskFragility": { "score0to10": 0 },
      "practicalityFriction": { "score0to10": 0 },
      "systemQuirkLoophole": { "usesSystemQuirk": false }
    },
    "verdict": {
      "label": "string",
      "headline": "string"
    },
    "keyPoints": {
      "keyRisks": ["string"]
    }
  }
}
```

### Response de error

```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "hackText is required"
}
```

```json
{
  "errorCode": "LLM_ERROR",
  "message": "Unable to generate lab report"
}
```

---

## 5. Modelos / Tipos TypeScript (MVP)

### Request DTO

```ts
export type HackXRayRequestDTO = {
  hackText: string;
  sourceLink?: string | null;
  country?: string;
};
```

### LabReport (MVP)

```ts
export type LabReport = {
  meta: { version: string; language: string; country: string };
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
  verdict: { label: string; headline: string };
  keyPoints: { keyRisks: string[] };
};
```

---

## 6. Tareas técnicas

### Frontend

- [ ] Crear página `src/app/hack-xray/page.tsx`.
- [ ] Formulario con `textarea`, `input(sourceLink)` y botón submit.
- [ ] Estado: idle/loading/success/error.
- [ ] `fetch('/api/hack-xray', ...)`.
- [ ] Crear componente `LabReportCard` con los bloques:
  - resumen,
  - scores,
  - veredicto,
  - riesgos clave.

### Backend

- [ ] Crear `src/app/api/hack-xray/route.ts`.
- [ ] Validar body con Zod.
- [ ] Llamar a `runHackXRayUseCase`.
- [ ] Manejar errores estándar.

### Domain/Application

- [ ] Crear `HackXRayInput` y `LabReport` en `/domain`.
- [ ] Crear `runHackXRayUseCase`:
  - Llamar al LLM client.
  - Validación mínima.
  - Retornar LabReport.

### Infrastructure (LLM)

- [ ] Interfaz `HackXRayLLMClient`.
- [ ] Implementación con:
  - prompts base,
  - llamada a API del LLM,
  - parseo JSON.

---

## 7. Criterios de aceptación

- [ ] Usuario puede ejecutar un X-Ray y ver resultados.  
- [ ] Si falta `hackText`, UI muestra error y no llama al backend.  
- [ ] Backend devuelve errores estructurados.  
- [ ] La UI renderiza:
  - resumen,  
  - scores,  
  - veredicto,  
  - key risks.  

---

## 8. Tests requeridos

- [ ] Unit test: `runHackXRayUseCase` con LLM mock.  
- [ ] Unit test: validación mínima de estructura.  
- [ ] Integration test: `POST /api/hack-xray` con body válido → 200.  
- [ ] Integration test: body sin `hackText` → 400.

---

## 9. Dependencias

- API key del LLM.  
- Carpeta `src/modules/hackXray/` preparada.

---

Fin del ticket.

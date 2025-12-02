# Ticket_HU06_HackXRay_EstandarizarEsquemaInternoLabReport.md

**Relacionado con HU:** HU06 – Estandarizar Esquema Interno del HackReport  
**Módulo:** `hackXray`  
**Prioridad:** Crítica (alineación con ecosistema Hintsly + preparación para Herramienta 2)  
**Tipo:** Feature – Core Schema Upgrade  

---

# 1. Resumen

Este ticket define e implementa la **versión estandarizada del LabReport**, alineada con el modelo oficial Hintsly X-Ray.

El objetivo es:

- Unificar campos, enums y estructura interna.  
- Asegurar que el backend almacena un **JSON completo y future-proof**, aunque la UI actual solo muestre parte.  
- Preparar el `LabReport` para la **Herramienta 2 – Score & Debt SuperHack Simulator**, analytics, datasets y futuros prompts.  
- Eliminar variabilidad en labels como `"solid"`, `"recommended"`, etc.

Este ticket modifica:

1. **El shape del LabReport (dominio).**  
2. **El sistemaPrompt** enviado al LLM.  
3. **La función `normalizeLabReport()`** para incorporar nuevos campos y enums.  
4. **Validaciones mínimas para los nuevos enums.**

---

# 2. Objetivo funcional

**Como** arquitecto del sistema Hintsly,  
**quiero** que el X-Ray produzca y almacene un formato de LabReport uniforme, completo y compatible con el modelo oficial,  
**para** que futuras herramientas puedan consumir los reports sin transformaciones adicionales.

---

# 3. Alcance del ticket

## Incluye

- Nueva definición unificada de `LabReport` (versión 2.0).  
- Nuevos campos requeridos:
  - `adherence`  
  - `verdict.recommendedProfiles`  
  - `verdict.notForProfiles`  
  - `systemQuirkLoophole.description`  
  - `systemQuirkLoophole.fragilityNotes`  
- Introducción de **enums oficiales Hintsly**:
  - Legalidad  
  - Adherencia  
  - Veredicto  
  - Tipo/Categoría  
- Actualización del `systemPrompt` para obligar a Gemini a devolver estos campos.  
- Cambios en `normalizeLabReport()` con defaults seguros.  
- Validación interna simple de enums.  
- Migración suave sin alterar la UI.

## No incluye

- Cambios de UI.  
- Validación de coherencia (ya cubierto en HU05).  
- Extracción de transcript o pipeline de video.

---

# 4. Nuevo Esquema Oficial del LabReport (versión 2.0)

```ts
export type LegalLabel = "clean" | "gray_area" | "red_flag";

export type AdherenceLevel =
  | "easy"
  | "intermediate"
  | "advanced"
  | "expert";

export type VerdictLabel =
  | "trash"
  | "dangerous_for_most"
  | "works_if_profile_matches"
  | "promising_superhack_part"
  | "solid";

export interface LabReportV2 {
  meta: {
    version: string;
    language: string;
    country: string;
  };

  hackNormalized: {
    title: string;
    shortSummary: string;
    detailedSummary: string;
    hackType: string;
    primaryCategory: string;
  };

  evaluationPanel: {
    legalityCompliance: {
      label: LegalLabel;
      notes: string;
    };
    mathRealImpact: { score0to10: number };
    riskFragility: { score0to10: number };
    practicalityFriction: { score0to10: number };
    systemQuirkLoophole: {
      usesSystemQuirk: boolean;
      description?: string;
      fragilityNotes?: string[];
    };
  };

  adherence: {
    level: AdherenceLevel;
    notes: string;
  };

  verdict: {
    label: VerdictLabel;
    headline: string;
    recommendedProfiles: string[];
    notForProfiles: string[];
  };

  keyPoints: {
    keyRisks: string[];
  };
}
```

---

# 5. Actualización del `systemPrompt`

### Cambios requeridos:

- Instruir a Gemini a devolver exactamente todos los campos del esquema 2.0.  
- Añadir `"adherence"` como bloque obligatorio.  
- Añadir `"recommendedProfiles"` y `"notForProfiles"`.  
- Extender `"systemQuirkLoophole"` con `description` y `fragilityNotes`.  
- Definir enums exactos en el JSON de ejemplo.  
- Mantener la regla: **la respuesta DEBE ser solo un JSON válido, sin texto extra**.

---

# 6. Cambios en `normalizeLabReport()`

Agregar:

- Funciones `asLegalLabel`, `asAdherenceLevel`, `asVerdictLabel`.  
- Defaults seguros cuando el LLM falle.  
- Construcción completa de los nuevos campos.  
- `meta.version = "2.0"` si no existe.

---

# 7. Adaptaciones al Dominio / Persistencia

- Reemplazar `LabReport` por `LabReportV2` como interfaz oficial del módulo.  
- Asegurar que el repositorio persistente guarda los nuevos campos.  
- Mantener compatibilidad con la UI (campos nuevos no afectan render).

---

# 8. Migración

No migrar datos antiguos.  
Si `meta.version !== "2.0"`, considerarlo legacy sin romper nada.

---

# 9. Tests requeridos

## 9.1 Unit tests – normalización
- Defaults para enums inválidos.  
- Arrays vacíos en perfiles.  
- Quirk sin descripción → default correcto.

## 9.2 Unit tests – estructura mínima
- Verificación de que `normalizeLabReport()` produce SIEMPRE el shape completo.

## 9.3 Integration tests con Gemini mock
- JSON válido v2.0 → éxito.  
- JSON incompleto → normalizer rellena correctamente.

---

# 10. Criterios de aceptación

- [ ] El backend devuelve **LabReport v2.0**.  
- [ ] El LLM es instruido explícitamente a usar el esquema actualizado.  
- [ ] `normalizeLabReport()` siempre produce un JSON uniforme.  
- [ ] Se guardan todos los campos en BD.  
- [ ] Tests completos funcionando.

---

# 11. Dependencias

- HU05 – Validación estructural y coherencia del LLM  
- Cliente Gemini operativo  

---

Fin del ticket.

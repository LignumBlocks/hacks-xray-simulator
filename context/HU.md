# Backlog de Historias de Usuario – Herramientas Hintsly  
*(Hack X-Ray + Score & Debt SuperHack Simulator)*

Este documento define el backlog inicial dividido en **2 fases**:

- **Fase 1**: Motor + API + UI básica de **Hintsly Hack X-Ray**.  
- **Fase 2**: Motor matemático + API + UI comparativa del **Score & Debt SuperHack Simulator**.

Cada HU sigue el formato:
**Como** <rol>, **quiero** <objetivo>, **para** <beneficio>.

---

## Fase 1 – Hintsly Hack X-Ray

### HU01 – Ejecutar un X-Ray sobre un hack pegado por el usuario

**Como** usuario curioso que ve hacks financieros en redes,  
**quiero** pegar el texto o link de un hack y obtener un “Lab Report Hintsly”,  
**para** entender rápidamente si es basura, peligroso o realmente útil.

**Criterios de aceptación**  
- Existe una pantalla `/hack-xray` con:
  - Un `textarea` grande para pegar el hack (`hackText`).
  - Un campo opcional de `sourceLink`.
  - Un botón “Run X-Ray”.
- Al enviar el formulario:
  - El frontend llama a `POST /api/hack-xray` con JSON `{ hackText, sourceLink?, country? }`.
- Si el hack es válido y el LLM responde correctamente:
  - El backend devuelve un objeto `LabReport` con todos los campos obligatorios definidos en el esquema.
  - El frontend muestra:
    - Resumen breve del hack.
    - Panel de scores.
    - Veredicto final.
    - 2–3 bullets de “Key risks”.
- Si el LLM falla o devuelve JSON inválido:
  - Backend responde `{ errorCode, message }`.
  - El frontend muestra error y permite reintentar.

---

### HU02 – Validación y manejo de errores de input del X-Ray

**Como** usuario,  
**quiero** que el sistema me avise si pego algo vacío o irrelevante,  
**para** no perder tiempo con resultados inútiles.

**Criterios de aceptación**  
- Si `hackText` está vacío:
  - Error en frontend (“Please paste a money hack first”).
- Si el texto es demasiado corto o ruido:
  - Backend → `VALIDATION_ERROR`.
- Si el LLM define que no es un money hack:
  - `classification.is_money_hack = false`.
  - Veredicto explica que el contenido no es un hack financiero.

---

### HU03 – Guardar cada Lab Report en la base de datos

**Como** product owner,  
**quiero** guardar cada Lab Report,  
**para** analizar patrones y construir luego SuperHacks.

**Criterios de aceptación**  
- Cada ejecución válida crea un registro `HackReport`.
- Guarda:
  - `id`, `createdAt`, `hackText`, `sourceLink`, `country`,
  - `hackType`, `primaryCategory`, `verdictLabel`, `riskLevel`,
  - `rawLabReport` (JSON completo).
- `id` devuelto en la respuesta.
- Recuperable con `GET /api/hack-xray/[id]`.

---

### HU04 – Listar y filtrar hacks ya analizados

**Como** analista,  
**quiero** ver una lista filtrable de hacks,  
**para** identificar patrones y candidatos a SuperHack.

**Criterios de aceptación**  
- Endpoint `GET /api/hack-xray` con filtros opcionales:
  - `hackType`, `primaryCategory`, `verdictLabel`,
  - `createdFrom`, `createdTo`.
- Paginación: `page`, `pageSize`.
- Respuesta incluye:
  - Lista de items (`id`, `createdAt`, `hackType`, `primaryCategory`, `verdictLabel`, `shortSummary`).
  - Metadatos de paginación.

---

### HU05 – Validar estructura y coherencia del Lab Report del LLM

**Como** desarrollador,  
**quiero** validar el JSON del LLM,  
**para** evitar inconsistencias o contenido peligroso.

**Criterios de aceptación**  
- Validación estricta:
  - JSON parseable.
  - Campos top-level completos.
  - Scores 0–10.
  - Enums válidos.
- Reglas de coherencia:
  - Si `legality` = red_flag → no puede tener veredicto positivo.
  - Si `risk >= 7` y `math <= 3` → veredicto = trash / dangerous.
- Tests unitarios validan casos válidos e inválidos.

---

### HU06 – Incluir disclaimers y tono prudente en el Lab Report

**Como** usuario en dominio YMYL,  
**quiero** disclaimers claros,  
**para** entender que el resultado es educativo.

**Criterios de aceptación**  
- `educational_only = true` y `must_show_disclaimer = true`.
- Texto de advertencia visible en UI.
- Prohibidas frases como “guaranteed”, “risk-free”, etc.
- Tests detectan palabras prohibidas.

---

## Fase 2 – Score & Debt SuperHack Simulator

### HU07 – Ingresar datos básicos para simular rutas

**Como** usuario con deuda,  
**quiero** introducir mis datos,  
**para** que el sistema calcule mis escenarios.

**Criterios de aceptación**  
- Formulario pide:
  - `netIncomeMonthly`,
  - `fixedExpensesMonthly`,
  - tarjetas (1–4) con `balance`, `apr`, `minPayment`,
  - `scoreRange`,
  - `mainGoal`,
  - `frictionTolerance`.
- Validación UI: números positivos, APR razonable, balance > 0.

---

### HU08 – Ver comparación entre Baseline, Hack Light y SuperHack

**Como** usuario,  
**quiero** ver una comparación clara,  
**para** entender diferencias de tiempo, intereses y score.

**Criterios de aceptación**  
- API devuelve:
  - `baseline`, `hackLight`, `superhack` con:
    - `monthsToPayoff`,
    - `totalInterestPaid`,
    - `scoreStartRange`, `scoreEndRange`,
    - resumen textual.
  - `assumptions`
  - `disclaimer`
- UI:
  - Tabla comparativa.
  - Gráfico (barras o líneas).
  - Si no existe una ruta SuperHack válida, mostrarlo explícitamente.

---

### HU09 – Aplicar modelo matemático y reglas del SuperHack

**Como** product owner,  
**quiero** reglas claras de mejora,  
**para** mantener credibilidad.

**Criterios de aceptación**  
- Funciones puras calculan:
  - payoff,
  - intereses,
  - score estimado por utilización.
- Regla SuperHack:
  - Mejora ≥15–20% en tiempo o intereses.
  - La otra métrica no empeora.
- Si no se cumple:
  - Ruta degradada (“no SuperHack”).
- Tests unitarios verifican casos sintéticos.

---

### HU10 – Guardar simulaciones para análisis

**Como** equipo de Hintsly,  
**quiero** almacenar simulaciones,  
**para** analizar patrones y mejorar SuperHacks.

**Criterios de aceptación**  
- Cada simulación crea registro `ScoreDebtSimulationRun`.
- Guarda:
  - `id`, `createdAt`,
  - `inputPayload`,
  - `baselineResult`,
  - `hackLightResult`,
  - `superhackResult`,
  - `assumptions`.
- Recuperable con `GET /api/simulator/score-debt/[runId]`.

---

### HU11 – Mostrar supuestos y disclaimers claros en el simulador

**Como** usuario,  
**quiero** ver supuestos claros,  
**para** saber cómo se calculan los resultados.

**Criterios de aceptación**  
- Backend devuelve `assumptions` claros.
- UI muestra sección de supuestos + disclaimer visible.
- Lenguaje prudente (educativo, no asesoría).

---

### HU12 – Validar inputs y avisar al usuario

**Como** usuario,  
**quiero** que el sistema valide mis inputs,  
**para** evitar resultados absurdos.

**Criterios de aceptación**  
- Backend valida:
  - ingreso > 0,
  - gastos >= 0,
  - gastos < ingreso,
  - pagos mínimos <= ingreso disponible,
  - APR razonable.
- Si falla:
  - `400` + `{ errorCode: "SIMULATION_INPUT_INVALID", message }`.
- Frontend muestra errores claros junto al formulario.

---

_Fin del documento._
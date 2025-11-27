# AGENTS.md — Reglas para el agente de código — Herramientas Hintsly (Hack X-Ray + SuperHack Simulator)

Este documento define **cómo debes trabajar dentro del código** del proyecto **Hintsly MoneyLab – Herramientas**.

Tu objetivo principal:  
Implementar y extender **dos herramientas web** siguiendo Historias de Usuario y tickets asociados, usando un enfoque **TDD/BDD**, una arquitectura escalable en **Next.js (TypeScript)** y respetando los contratos de dominio.

Herramientas en este proyecto:

1. **Hintsly Hack X-Ray**  
2. **Score & Debt SuperHack Simulator**

---

## 1. Contexto funcional (qué hace este proyecto)

Este proyecto NO es todo Hintsly MoneyLab, sino solo dos piezas iniciales:

1. **Hintsly Hack X-Ray**  
   - El usuario pega un “money hack” (texto o link de TikTok/YouTube/Reddit, etc.).  
   - El sistema llama a un **LLM** que devuelve un **“Lab Report Hintsly”** con:
     - Resumen del hack.
     - Clasificación (tipo, nivel, categorías Hintsly).
     - Panel de evaluación:
       - Legality & Compliance.
       - Math & Real Impact (0–10).
       - Risk & Fragility (0–10).
       - Practicality & Friction (0–10).
       - System Quirk / Loophole.
     - Segment Fit, Time Horizon, Behavior Fit.
     - Veredicto final (trash / works only if / promising…).
     - Notas de posible uso dentro de un SuperHack (unlocker / amplifier / consolidator).
   - Todo se devuelve como **JSON estructurado** y se puede guardar en BD.

2. **Score & Debt SuperHack Simulator**  
   - El usuario mete sus datos básicos de deuda de tarjetas + ingresos + score.  
   - El sistema simula en paralelo 3 rutas:
     - **Baseline** (seguir como está).
     - **Hack Light** (1–2 hacks sencillos, “white hat”, mismo esfuerzo mensual).
     - **SuperHack Hintsly** (estrategia cableada, ≥15–20% mejor en tiempo o coste vs baseline, sin empeorar la otra métrica).
   - Muestra:
     - Meses hasta deuda 0.
     - Intereses totales aproximados.
     - Score inicial vs estimado.
     - Tabla comparativa + gráfico simple.
     - Supuestos y disclaimers (educacional, no asesoría).

Antes de inventar nada nuevo, revisa SIEMPRE los documentos funcionales que están en la carpeta `context`.

---

## 2. Arquitectura técnica (visión rápida)

> **Stack obligatorio**: todo el proyecto se resuelve con **Next.js + TypeScript** (fullstack).  
> No se utiliza Python en el backend de producto.

### 2.1. Stack

- **Runtime**: Node.js LTS.
- **Framework fullstack**: **Next.js** (App Router preferido).
- **Lenguaje**: **TypeScript** estricto.
- **DB**: PostgreSQL (ORM recomendado: Prisma).
- **Estilos**: TailwindCSS (o similar) + componente UI (shadcn/ui opcional).
- **Integración LLM**: llamadas HTTP desde el backend Next (Route Handlers / API Routes).

### 2.2. Patrones de diseño clave

Debes estructurar el código con estos principios:

1. **Arquitectura en capas / Ports & Adapters (hexagonal “lite”)**
   - Capa **domain**: reglas de negocio puras (TS sin dependencias de Next/DB).
   - Capa **application**: casos de uso, orquestación (services).
   - Capa **infrastructure**: LLM client, repositorios DB, logging, etc.
   - Capa **interface**: Next.js (route handlers + componentes React).

2. **Separation of concerns**
   - Los **Route Handlers** solo:
     - Parsean/validan request.
     - Llaman al caso de uso.
     - Traducen el resultado a HTTP Response.
   - Los **Use Cases / Services**:
     - No saben de HTTP ni de Next.
     - Reciben DTOs y devuelven resultados de dominio.

3. **TDD / Contracts First**
   - Primero se definen:
     - Tipos TypeScript (DTOs, modelos de dominio).
     - Tests (unitarios + de contrato de endpoints).
   - Después la implementación mínima.

4. **Errores tipados**
   - Usa clases de error de dominio (`DomainError`, `ValidationError`, `LLMError`, etc.).
   - Mapea en un solo sitio (adapter HTTP) → `status code` + JSON de error.

5. **Inversión de dependencias**
   - Domain y application **no dependen** de Next ni de Prisma.
   - Los casos de uso reciben interfaces (ports):
     - `HackReportRepository`
     - `SimulationRepository`
     - `HackXRayLLMClient`
   - Las implementaciones concretas (`PrismaHackReportRepository`, `OpenAIHackXRayClient`) viven en `infrastructure`.

---

## 3. Organización de carpetas (sugerida)

En el root del proyecto Next.js:

```text
src/
  app/
    api/
      hack-xray/
        route.ts          # POST /api/hack-xray
      hack-xray/[id]/
        route.ts          # GET /api/hack-xray/:id
      simulator/score-debt/
        route.ts          # POST /api/simulator/score-debt
      simulator/score-debt/[runId]/
        route.ts          # GET /api/simulator/score-debt/:runId
    (rutas de UI: /hack-xray, /simulator, etc.)
  modules/
    hackXray/
      domain/
        labReport.ts      # tipos de dominio + lógica pura de validación
        errors.ts
      application/
        runHackXRayUseCase.ts
      infrastructure/
        hackReportPrismaRepository.ts
        hackXRayOpenAILLMClient.ts
      tests/
        domain/
        application/
        contracts/
    simulator/
      domain/
        scoreDebtModels.ts
        scoreDebtMath.ts
        errors.ts
      application/
        runScoreDebtSimulationUseCase.ts
      infrastructure/
        simulationPrismaRepository.ts
      tests/
        domain/
        application/
        contracts/
  lib/
    db/
      prismaClient.ts
    http/
      apiResponse.ts      # helpers estándar para respuestas
  tests/
    e2e/
      api_hackXray.test.ts
      api_simulator.test.ts
prisma/
  schema.prisma
```

Regla:  
- Todo lo “de negocio” del Hack X-Ray vive dentro de `src/modules/hackXray`.  
- Todo lo del simulador, en `src/modules/simulator`.  
- UI/React en `src/app`.

---

## 4. Convenciones de diseño y estilo

### 4.1. Next.js (App Router)

- Usa **Route Handlers** (`route.ts`) en `app/api/...`.
- Cada `route.ts` debe:
  - Validar la request usando Zod (u otra lib) en la capa interface.
  - Construir DTOs y llamar al caso de uso (`runHackXRayUseCase`, `runScoreDebtSimulationUseCase`, etc.).
  - Manejar errores de dominio y devolver JSON homogéneo.

### 4.2. Respuestas de error

Formato estándar:

```json
{
  "errorCode": "string",
  "message": "string"
}
```

Ejemplos:

- `VALIDATION_ERROR`
- `LLM_ERROR`
- `LLM_OUTPUT_INVALID`
- `SIMULATION_INPUT_INVALID`
- `BUSINESS_RULE_VIOLATION`
- `NOT_FOUND`
- `RATE_LIMITED`

Nunca devuelvas errores crus de la API LLM o de la DB al cliente final.

### 4.3. Timestamps

- En BD: `TIMESTAMPTZ` (UTC).
- En JSON: ISO8601 con `Z`, ej. `"2025-11-24T12:00:00Z"`.

### 4.4. YMYL / tono prudente

Es dominio **Your Money Your Life** (finanzas personales). Reglas:

- Nunca uses lenguaje de garantía absoluta:
  - NO: “you will definitely”, “guaranteed”, “risk-free”.
  - SÍ: “this could”, “estimated”, “example scenario”.
- Los modelos de dominio deben forzar:
  - `educationalOnly: true`
  - `mustShowDisclaimer: true`  
  en los resultados visibles al usuario.
- Si el LLM produce algo dudoso (evasión de impuestos, fraude, abuso obvio de términos):
  - Marca `legalityCompliance.label = "red_flag"`.
  - Asegúrate de que el `verdict` no es “promising”.

---

## 5. Rutas importantes (API)

### 5.1. Hack X-Ray

**Endpoint principal**: `POST /api/hack-xray`

- Input (JSON):
  - `hackText: string` (obligatorio).
  - `sourceLink?: string | null`.
  - `country?: string` (default `"US"`).

- Flujo:
  1. Validar con Zod en el `route.ts`.
  2. Convertir a `HackXRayInputDTO`.
  3. Llamar a `runHackXRayUseCase`.
  4. Devolver `LabReportDTO` como JSON.

- Output:  
  Objeto `LabReportDTO` que sigue el esquema acordado (Lab Report Hintsly v1).

**Endpoint de lectura**: `GET /api/hack-xray/[id]`

- Devuelve el Lab Report persistido con ese `id`.

**Endpoint listado**: `GET /api/hack-xray` (opcional v1)

- Soporta filtros por:
  - `type`
  - `verdict`
  - `createdFrom`
  - `createdTo`
- Soporta paginación simple: `page`, `pageSize`.

### 5.2. Score & Debt SuperHack Simulator

**Endpoint principal**: `POST /api/simulator/score-debt`

- Input (JSON):
  - `netIncomeMonthly: number`
  - `fixedExpensesMonthly: number`
  - `cards: Array<{ balance: number; apr: number; minPayment: number }>`
  - `scoreRange: "<580" | "580-649" | "650-699" | "700+"`
  - `mainGoal: "payoff_fast" | "improve_score"`
  - `frictionTolerance: "low" | "medium" | "high"`

- Flujo:
  1. Validar con Zod en el `route.ts`.
  2. Crear `ScoreDebtSimulationInputDTO`.
  3. Llamar a `runScoreDebtSimulationUseCase`.
  4. Devolver resultado.

- Output (JSON):

```json
{
  "runId": "uuid",
  "baseline": { /* resultado ruta baseline */ },
  "hackLight": { /* resultado ruta hack light */ },
  "superhack": { /* resultado ruta superhack hintsly */ },
  "assumptions": { /* supuestos usados */ },
  "disclaimer": "string"
}
```

**Endpoint de lectura**: `GET /api/simulator/score-debt/[runId]`

- Devuelve la simulación previamente guardada.

---

## 6. Servicios, dominio y puertos

### 6.1. Hack X-Ray

En `src/modules/hackXray`:

- `domain/labReport.ts`
  - Define tipos de dominio:
    - `LabReport`
    - Enums: `HackType`, `VerdictLabel`, `LegalityComplianceLabel`, etc.
  - Incluye funciones puras para:
    - Validar rango 0–10.
    - Coherencia entre legalidad y veredicto.
    - Normalizar y sanitizar strings peligrosos.

- `domain/errors.ts`
  - `HackXRayValidationError`
  - `HackXRayBusinessRuleError`
  - `HackXRayLLMOutputError`

- `application/runHackXRayUseCase.ts`
  - Función principal:
    ```ts
    export async function runHackXRayUseCase(
      input: HackXRayInput,
      deps: {
        hackReportRepository: HackReportRepository;
        llmClient: HackXRayLLMClient;
      }
    ): Promise<LabReport>;
    ```
  - Flujo:
    - Llama a `llmClient.generateLabReport(...)`.
    - Valida estructura y enums.
    - Aplica reglas de negocio (coherencia).
    - Persiste el report (`hackReportRepository.save(report)`).
    - Devuelve `LabReport`.

- `infrastructure/hackXRayOpenAILLMClient.ts`
  - Implementa `HackXRayLLMClient`:
    - Construye prompts.
    - Llama a la API del LLM.
    - Controla reintentos.
    - Lanza `HackXRayLLMOutputError` si el JSON es inválido.

- `infrastructure/hackReportPrismaRepository.ts`
  - Implementa `HackReportRepository` con Prisma.

### 6.2. Score & Debt SuperHack Simulator

En `src/modules/simulator`:

- `domain/scoreDebtModels.ts`
  - Tipos: `ScoreDebtSimulationInput`, `SimulationRouteResult`, `ScoreRange`, etc.

- `domain/scoreDebtMath.ts`
  - Funciones puras:
    - `simulatePayoff(...)`
    - `estimateInterest(...)`
    - `estimateScoreFromUtilization(...)`
    - Reglas de comparación `baseline` vs `superhack`.

- `application/runScoreDebtSimulationUseCase.ts`
  - Firma:
    ```ts
    export async function runScoreDebtSimulationUseCase(
      input: ScoreDebtSimulationInput,
      deps: { simulationRepository: SimulationRepository }
    ): Promise<ScoreDebtSimulationResult>;
    ```
  - Se asegura de que la ruta `superhack`:
    - Mejora ≥15–20% en tiempo o coste versus `baseline`.
    - No empeora la otra métrica.

- `infrastructure/simulationPrismaRepository.ts`
  - Implementa `SimulationRepository`.

---

## 7. Modelos y BD (Prisma)

### 7.1. Hack Reports

Ejemplo (esquema aproximado):

```prisma
model HackReport {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  hackText      String
  sourceLink    String?
  country       String   @default("US")
  hackType      String
  primaryCategory String
  verdictLabel  String
  riskLevel     String
  rawLabReport  Json
}
```

### 7.2. Simulaciones

```prisma
model ScoreDebtSimulationRun {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  inputPayload    Json
  baselineResult  Json
  hackLightResult Json
  superhackResult Json
  assumptions     Json
}
```

Si necesitas nuevos índices/campos para reporting, coordínalo con las HUs y tickets.

---

## 8. Tests: estructura y reglas

Usa el stack de tests estándar para proyectos TypeScript/Next:

- **Jest** o **Vitest** para unit/integration.
- **Playwright** o similar para E2E (opcional).

Estructura recomendada:

```text
src/
  modules/
    hackXray/
      tests/
        domain/
        application/
        contracts/
    simulator/
      tests/
        domain/
        application/
        contracts/
tests/
  e2e/
    api_hackXray.test.ts
    api_simulator.test.ts
```

Reglas:

1. Para cada nuevo caso de uso / endpoint:
   - Añade al menos:
     - 1 test de contrato de API.
     - 1 test de dominio o de caso de uso.
2. No dependas de la API real del LLM en tests:
   - Mockea `HackXRayLLMClient`.
3. Tests del simulador:
   - Verifican que `superhack` realmente mejora vs `baseline`.
   - Verifican el comportamiento cuando no se puede mejorar (edge cases documentados).

---

## 9. Patrón de trabajo para el agente

Cuando vayas a implementar algo nuevo:

1. **Identifica** la Historia de Usuario (HU) y el ticket asociados.
2. Lee:
   - Objetivo de negocio.
   - Escenarios BDD (Given/When/Then).
   - Contratos del endpoint (si aplica).
3. Elige el lugar correcto del código:
   - Interface (route handler) vs application vs domain vs infrastructure.
4. Escribe/ajusta tests primero:
   - A partir de la HU y del contrato.
5. Implementa lo mínimo para que los tests pasen.
6. Asegúrate de:
   - No romper contratos existentes.
   - Mantener el formato de error estándar.
   - Mantener el tono YMYL prudente.

---

## 10. Cosas que NO debes hacer

- No meter lógica de negocio pesada en:
  - Route Handlers.
  - Componentes React.
- No llamar a la API LLM directamente desde UI o route handlers:
  - Siempre a través de `HackXRayLLMClient` en la capa `infrastructure`.
- No cambiar nombres de campos de los contratos JSON sin:
  - Actualizar tipos TS.
  - Actualizar tests.
  - Avisar en las HUs/tickets.
- No exponer mensajes de error crudos de:
  - LLM.
  - DB.
  - Infraestructura.
- No usar un lenguaje en outputs que implique asesoría financiera personalizada o garantías absolutas.

---

Este archivo (`AGENTS.md`) es la guía operativa para tu trabajo como agente de programación dentro de este repo.  
Las **HUs y tickets** son la fuente de verdad sobre lo que el negocio necesita; esta guía define **cómo** implementarlo de forma escalable y robusta en Next.js.

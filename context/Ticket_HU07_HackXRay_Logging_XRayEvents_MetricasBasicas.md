# Ticket_HU07_HackXRay_Logging_XRayEvents_MetricasBasicas.md

**Relacionado con:**  
- HU05 – Validación del LabReport  
- HU06 – Estandarización del esquema LabReportV2  
- BD actual con tabla existente `HackReport`

**Módulo:** `hackXray`  
**Prioridad:** Alta  
**Tipo:** Feature – Observabilidad + Analytics Layer  

---

# 1. Resumen

Este ticket agrega una segunda capa de persistencia y observabilidad alrededor del X-Ray:

## 1) Nueva tabla **`xray_events`**  
Cada ejecución del X-Ray debe generar un evento independiente que capture:

- Timestamp  
- Tipo de fuente y host  
- País  
- Scores del hack  
- Veredicto  
- Hash de IP  
- User Agent  
- Snapshot de categoría y adherencia

`HackReport` representa **los hacks analizados**.  
`xray_events` representa **el uso del sistema**.

## 2) Logging estructurado  
Se registran logs no sensibles para monitoreo.

## 3) Endpoint `/api/admin/xray/stats/basic`  
Entrega métricas internas para monitorear el uso real del X-Ray.

---

# 2. Objetivo funcional

**Como** administrador y data owner de Hintsly,  
**quiero** un registro completo de cada ejecución del X-Ray,  
**para** medir uso real, alimentar analytics, mejorar el modelo y detectar abusos.

---

# 3. Alcance

## Incluye

- Tabla `xray_events`  
- Servicio `buildXRayEvent`  
- Repositorio `XRayEventRepository`  
- Integración en el flujo X-Ray  
- Hash seguro de IP  
- Logging estructurado  
- Endpoint `/api/admin/xray/stats/basic`  
- Tests unitarios + integración  

## No incluye

- Cambios a la tabla `HackReport`  
- UI o dashboards gráficos  

---

# 4. Diseño de la tabla `xray_events`

**Nombre:** `xray_events`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador del evento |
| reportId | uuid/text | FK a HackReport.id |
| submittedAt | timestamptz | Momento de ejecución |
| sourceType | text | "url" / "text" |
| sourceHost | text | Host extraído de la URL |
| country | text | País del análisis |
| clientIpHash | text | Hash irreversible de IP |
| userAgent | text | UA cliente |
| verdictLabel | text | Snapshot veredicto |
| legalityLabel | text | Snapshot legalidad |
| mathScore0to10 | int | Score |
| riskScore0to10 | int | Score |
| practicalityScore0to10 | int | Score |
| primaryCategory | text | Snapshot |
| adherenceLevel | text | easy/intermediate/advanced/expert |
| createdAt | timestamptz | Igual a submittedAt |

**Índices recomendados**

```
CREATE INDEX xray_events_reportId_idx ON xray_events(reportId);
CREATE INDEX xray_events_verdict_idx ON xray_events(verdictLabel);
CREATE INDEX xray_events_host_idx ON xray_events(sourceHost);
CREATE INDEX xray_events_country_idx ON xray_events(country);
```

---

# 5. Entidad de dominio

```ts
export type XRaySourceType = "url" | "text";

export interface XRayEvent {
  id: string;
  reportId: string;
  submittedAt: string;
  sourceType: XRaySourceType;
  sourceHost?: string;
  country: string;
  clientIpHash?: string;
  userAgent?: string;
  verdictLabel: string;
  legalityLabel: string;
  mathScore0to10: number;
  riskScore0to10: number;
  practicalityScore0to10: number;
  primaryCategory?: string;
  adherenceLevel?: string;
  createdAt: string;
}
```

---

# 6. Construcción del evento

```ts
export function buildXRayEvent(params: {
  labReport: LabReportV2;
  reportId: string;
  sourceType: "url" | "text";
  sourceHost?: string;
  country: string;
  clientIpHash?: string;
  userAgent?: string;
}): XRayEvent {
  const nowIso = new Date().toISOString();

  return {
    id: uuid(),
    reportId: params.reportId,
    submittedAt: nowIso,
    sourceType: params.sourceType,
    sourceHost: params.sourceHost,
    country: params.country,
    clientIpHash: params.clientIpHash,
    userAgent: params.userAgent,
    verdictLabel: params.labReport.verdict.label,
    legalityLabel:
      params.labReport.evaluationPanel.legalityCompliance.label,
    mathScore0to10:
      params.labReport.evaluationPanel.mathRealImpact.score0to10,
    riskScore0to10:
      params.labReport.evaluationPanel.riskFragility.score0to10,
    practicalityScore0to10:
      params.labReport.evaluationPanel.practicalityFriction.score0to10,
    primaryCategory: params.labReport.hackNormalized.primaryCategory,
    adherenceLevel: params.labReport.adherence?.level,
    createdAt: nowIso,
  };
}
```

---

# 7. Repositorio

```ts
export interface XRayEventRepository {
  save(event: XRayEvent): Promise<void>;
  getBasicStats(params: {
    from?: string;
    to?: string;
  }): Promise<BasicXRayStats>;
}
```

---

# 8. Métricas básicas (shape)

```ts
export interface BasicXRayStats {
  totalEvents: number;
  byVerdictLabel: Record<string, number>;
  bySourceHost: { host: string; count: number }[];
  byCountry: { country: string; count: number }[];
  avgScores: {
    mathScore0to10: number;
    riskScore0to10: number;
    practicalityScore0to10: number;
  };
  timeRange: {
    from?: string;
    to?: string;
  };
}
```

---

# 9. Endpoint admin

```
GET /api/admin/xray/stats/basic
```

Query

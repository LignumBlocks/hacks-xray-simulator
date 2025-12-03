# Ticket_HU08_HackXRay_AnalyticsV2_Trends_y_Filtros.md

**Relacionado con:**  
- HU07 – Logging XRay Events & Basic Metrics  
- Tabla existente `xray_events`  
- Dashboard básico ya implementado  

**Módulo:** `hackXray` / `admin`  
**Prioridad:** Media–Alta  
**Tipo:** Feature – Analytics UX & Queries  

---

# 1. Resumen

Este ticket extiende el Dashboard de Analytics del XRay para ofrecer:

1. **Tendencias en el tiempo (time series)** de volumen y scores.  
2. **Filtros avanzados** (fecha, país, host, categoría, veredicto).  
3. **Distribución de adherencia**.  
4. **Top categorías de hacks analizados**.  

Todo se implementa **sin modificar el esquema de la BD**, únicamente agregando queries adicionales sobre `xray_events`.

---

# 2. Objetivo funcional

**Como** administrador de Hintsly,  
**quiero** visualizar y filtrar la evolución del uso del X-Ray,  
**para** comprender qué tipo de hacks se analizan, detectar tendencias, priorizar contenido y optimizar la Herramienta 2.

---

# 3. Alcance

## Incluye
- Ampliación del endpoint de estadísticas para:
  - Timeline por día.
  - Timeline de scores promedio.
  - Distribución de adherencia.
  - Distribución de categorías.
- Soporte para filtros en backend:
  - `from`, `to`
  - `country`
  - `sourceHost`
  - `verdictLabel`
  - `primaryCategory`
- Actualizaciones en el dashboard admin:
  - Controles de filtros.
  - Nuevos gráficos (timeline y distribuciones).
- Tests unitarios e integración.

## No incluye
- Cambios al schema de BD.  
- Nuevos índices (opcional).  
- Exportar CSV/excel.  

---

# 4. Extensión del API existente

Usar el endpoint:

```
GET /api/admin/xray/stats/basic
```

Ampliarlo para aceptar estos **query params opcionales**:

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `from` | ISO string | Fecha inicial (incluyente) |
| `to` | ISO string | Fecha final |
| `country` | string | Filtrar por país |
| `sourceHost` | string | Host de origen (youtube.com, tiktok.com…) |
| `verdictLabel` | string | Veredicto |
| `primaryCategory` | string | Categoría |

### Reglas
- Si un parámetro no viene → no se usa como filtro.
- Todos los filtros aplican a **todas** las agregaciones.

---

# 5. Nuevo shape de respuesta: `BasicXRayStatsV2`

```ts
export interface TimeBucket {
  bucketStart: string;            // ISO date (ej: comienzo del día)
  totalEvents: number;
  avgMathScore0to10: number;
  avgRiskScore0to10: number;
  avgPracticalityScore0to10: number;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface BasicXRayStatsV2 {
  // Campos existentes (mantener compatibilidad):
  totalEvents: number;
  byVerdictLabel: Record<string, number>;
  bySourceHost: { host: string; count: number }[];
  byCountry: { country: string; count: number }[];
  avgScores: {
    mathScore0to10: number;
    riskScore0to10: number;
    practicalityScore0to10: number;
  };
  timeRange: { from?: string; to?: string };

  // NUEVOS:
  timeSeries: TimeBucket[];                 // timeline de eventos + scores
  adherenceDistribution: DistributionItem[]; // easy/intermediate/advanced/expert
  categoryDistribution: DistributionItem[];  // top categorías
}
```

---

# 6. Lógica de consultas (backend)

Implementar dentro de `XRayEventRepository.getBasicStats()`.

### 6.1 Aplicación de filtros
Todos los queries deben incluir:

```
WHERE
   (from IS NULL OR submittedAt >= from)
AND (to IS NULL OR submittedAt <= to)
AND (countryFilter IS NULL OR country = countryFilter)
AND (hostFilter IS NULL OR sourceHost = hostFilter)
AND (verdictFilter IS NULL OR verdictLabel = verdictFilter)
AND (categoryFilter IS NULL OR primaryCategory = categoryFilter)
```

---

### 6.2 Time Series (eventos & scores por día)

Pseudo-query:

```sql
SELECT
  date_trunc('day', submittedAt) AS bucketStart,
  COUNT(*) AS totalEvents,
  AVG(mathScore0to10) AS avgMath,
  AVG(riskScore0to10) AS avgRisk,
  AVG(practicalityScore0to10) AS avgPracticality
FROM xray_events
WHERE <filtros>
GROUP BY bucketStart
ORDER BY bucketStart;
```

---

### 6.3 Distribución de adherencia

```sql
SELECT adherenceLevel AS label, COUNT(*) AS count
FROM xray_events
WHERE <filtros> AND adherenceLevel IS NOT NULL
GROUP BY adherenceLevel;
```

---

### 6.4 Distribución de categorías

```sql
SELECT primaryCategory AS label, COUNT(*) AS count
FROM xray_events
WHERE <filtros> AND primaryCategory IS NOT NULL
GROUP BY primaryCategory
ORDER BY count DESC
LIMIT 10;
```

---

# 7. Actualizaciones en el dashboard (frontend)

## 7.1 Nuevos filtros UI
Agregar controles para:

- Date Range (From / To)
- Country selector
- Source Host selector
- Verdicto selector
- Categoría selector

Cada cambio → actualiza query params y recarga stats.

---

## 7.2 Nuevos gráficos

### ✔ Timeline de eventos  
- Line chart o área simple  
- X: días  
- Y: totalEvents  

### ✔ Timeline de scores  
- 3 líneas: Math, Risk, Practicidad  
- X: días  

### ✔ Distribución de adherencia  
- Easy  
- Intermediate  
- Advanced  
- Expert  

### ✔ Distribución de categorías  
- Barras horizontales  
- Top 10  

---

# 8. Tests requeridos

## 8.1 Backend
- Filtros aplicados correctamente (unit tests).  
- `timeSeries` ordenado ascendentemente.  
- Distribución de adherencia correcta.  
- Top categorías respeta límite.

## 8.2 Frontend
- Filtros generan llamadas correctas a la API.  
- Los gráficos se actualizan al cambiar filtros.  
- Manejo de “no data”.

---

# 9. Criterios de aceptación

- [ ] API extendida con filtros y nuevos campos.  
- [ ] Dashboard muestra timeline, distribution y categorías.  
- [ ] Filtros funcionales y consistentes.  
- [ ] Sin cambios de BD requeridos.  
- [ ] Tests unitarios e integración funcionando.

---

# 10. Dependencias

- HU07 – Logging completo de eventos.  
- Dashboard V1 ya funcionando.

---

**Fin del ticket.**

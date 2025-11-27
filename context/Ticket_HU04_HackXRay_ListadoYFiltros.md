# Ticket_HU04_HackXRay_ListadoYFiltros.md
**Relacionado con HU:** HU04 – Listar y filtrar hacks ya analizados  
**Módulo:** `hackXray`  
**Prioridad:** Media-Alta  
**Tipo:** Feature  
**Estado:** Nuevo

---

# 1. Resumen

Este ticket implementa el **listado y filtrado** de todos los Lab Reports previamente generados por el X-Ray y guardados en la base de datos.  
El objetivo es crear una API que permita:

1. Consultar los hacks ya radiografiados.  
2. Filtrar por tipo, categoría, veredicto y fecha.  
3. Paginar resultados de manera eficiente.  
4. Consumir esta API desde una página interna (dashboard simple).  

Este ticket **no se centra en la UI avanzada**; solo en la API, el repositorio y una vista muy básica.

---

# 2. Objetivo funcional

**Como** analista o administrador interno de Hintsly,  
**quiero** ver un listado filtrable de los hacks ya radiografiados,  
**para** estudiar patrones, evaluar calidad y detectar candidatos para SuperHacks.

---

# 3. Alcance del ticket

## Incluye

- Endpoint: `GET /api/hack-xray`  
- Soporte de filtros:
  - `hackType`
  - `primaryCategory`
  - `verdictLabel`
  - `createdFrom`
  - `createdTo`
- Paginación:
  - `page` (default 1)
  - `pageSize` (default 20)
- Respuesta con:
  - Lista de elementos con campos resumidos.
  - Metadatos (`page`, `pageSize`, `total`, `totalPages`).
- Implementar método `findManyWithFilters` en `HackReportRepository`.
- Vista interna muy simple:
  - Tabla minimalista (`id`, `createdAt`, `hackType`, `primaryCategory`, `verdictLabel`, `shortSummary`).
  - Link a `/hack-xray/[id]`.

## No incluye

- Gráficos, dashboards avanzados.
- Exportar CSV/Excel.
- Autenticación/admin completo (se asume acceso interno controlado vía env/flag simple).

---

# 4. API Contract – `GET /api/hack-xray`

## Query params

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `hackType` | string | opcional |
| `primaryCategory` | string | opcional |
| `verdictLabel` | string | opcional |
| `createdFrom` | string (ISO) | opcional |
| `createdTo` | string (ISO) | opcional |
| `page` | number | default 1 |
| `pageSize` | number | default 20 |

### Ejemplo de request

```
GET /api/hack-xray?primaryCategory=Credit_Score&verdictLabel=works_only_if&page=2&pageSize=10
```

---

# 5. Respuesta JSON

```json
{
  "items": [
    {
      "id": "abcd123",
      "createdAt": "2025-01-01T12:00:00Z",
      "hackType": "credit_score",
      "primaryCategory": "Credit_Score",
      "verdictLabel": "works_only_if",
      "shortSummary": "Pay before the statement cut..."
    }
  ],
  "pagination": {
    "page": 2,
    "pageSize": 10,
    "total": 134,
    "totalPages": 14
  }
}
```

---

# 6. Repositorio – Nueva función

En `HackReportRepository` agregar:

```ts
export interface HackReportRepository {
  ...
  findManyWithFilters(filters: HackReportFilters): Promise<{
    items: HackReportSummary[];
    total: number;
  }>;
}
```

### `HackReportFilters`:

```ts
export type HackReportFilters = {
  hackType?: string;
  primaryCategory?: string;
  verdictLabel?: string;
  createdFrom?: Date;
  createdTo?: Date;
  page: number;
  pageSize: number;
};
```

### `HackReportSummary`:

```ts
export type HackReportSummary = {
  id: string;
  createdAt: Date;
  hackType: string;
  primaryCategory: string;
  verdictLabel: string;
  shortSummary: string;
};
```

---

# 7. Implementación Prisma

En `hackReportPrismaRepository.ts`:

```ts
async findManyWithFilters(filters: HackReportFilters) {
  const { page, pageSize, ...whereFilters } = filters;

  const where: any = {};

  if (whereFilters.hackType) where.hackType = whereFilters.hackType;
  if (whereFilters.primaryCategory) where.primaryCategory = whereFilters.primaryCategory;
  if (whereFilters.verdictLabel) where.verdictLabel = whereFilters.verdictLabel;
  if (whereFilters.createdFrom || whereFilters.createdTo) {
    where.createdAt = {};
    if (whereFilters.createdFrom) where.createdAt.gte = whereFilters.createdFrom;
    if (whereFilters.createdTo) where.createdAt.lte = whereFilters.createdTo;
  }

  const total = await prisma.hackReport.count({ where });

  const rows = await prisma.hackReport.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" }
  });

  const items = rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    hackType: r.hackType,
    primaryCategory: r.primaryCategory,
    verdictLabel: r.verdictLabel,
    shortSummary: r.rawLabReport?.hackNormalized?.shortSummary ?? ""
  }));

  return { items, total };
}
```

---

# 8. Route Handler: `src/app/api/hack-xray/route.ts`

```ts
export async function GET(req: Request) {
  const url = new URL(req.url);

  const filters = {
    hackType: url.searchParams.get("hackType") ?? undefined,
    primaryCategory: url.searchParams.get("primaryCategory") ?? undefined,
    verdictLabel: url.searchParams.get("verdictLabel") ?? undefined,
    createdFrom: url.searchParams.get("createdFrom") ? new Date(url.searchParams.get("createdFrom")!) : undefined,
    createdTo: url.searchParams.get("createdTo") ? new Date(url.searchParams.get("createdTo")!) : undefined,
    page: Number(url.searchParams.get("page") ?? 1),
    pageSize: Number(url.searchParams.get("pageSize") ?? 20)
  };

  const { items, total } = await hackReportRepository.findManyWithFilters(filters);

  return NextResponse.json({
    items,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize)
    }
  });
}
```

---

# 9. Vista interna simple (opcional para este ticket)

Crear página:  
`src/app/admin/hacks/page.tsx`

Muestra una tabla básica:

| ID | fecha | hackType | primaryCategory | verdict | resumen | link |

Cada fila enlaza a:

```
/hack-xray/[id]
```

---

# 10. Tests requeridos

### Unit Tests
- `findManyWithFilters` filtra correctamente por:
  - hackType  
  - primaryCategory  
  - verdictLabel  
  - fechas  

### Integration Tests
- `GET /api/hack-xray`:
  - Sin filtros → muestra paginación correcta.  
  - Con filtros → devuelve solo coincidencias.  
  - Paginación → page=2/pageSize=10 funciona.  

### Edge cases
- Filtros vacíos → retorna todo.  
- Fechas mal formadas → ignorar filtro o devolver VALIDATION_ERROR (tu elección).  
- `page < 1` → normalizar a 1.

---

# 11. Criterios de aceptación

- [ ] Endpoint responde con listado paginado y los filtros funcionan.  
- [ ] Cada item devuelve resumen + metadatos requeridos.  
- [ ] Vista interna simple muestra resultados sin romperse.  
- [ ] Tests unitarios e integración completos.  

---

# 12. Dependencias

- HU03 completada (persistencia implementada).  
- Prisma configurado.  
- Módulo `hackXray` operativo.  

---

Fin del ticket.

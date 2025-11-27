# Ticket_HU03_HackXRay_PersistenciaLabReport.md  
**Relacionado con HU:** HU03 – Guardar cada Lab Report en la base de datos  
**Módulo:** `hackXray`  
**Prioridad:** Alta  
**Tipo:** Feature  
**Estado:** Nuevo  

---

## 1. Resumen

Este ticket implementa toda la capa de **persistencia en BD** para los resultados del X-Ray.

Cuando el usuario ejecuta un X-Ray y el sistema produce un `LabReport` **válido**, debe:

1. Guardar en la base de datos el reporte completo.  
2. Exponer un endpoint `GET /api/hack-xray/:id` para recuperarlo.  
3. Estandarizar los tipos, repositorios y adaptadores necesarios.  
4. Asegurarse de que almacenar fallas **no bloquea la devolución del Lab Report** (UX > logging).  

Este ticket introduce el modelo `HackReport` en la BD y los repositorios para interactuar con él usando Prisma.

---

## 2. Objetivo funcional

**Como** product owner de Hintsly,  
**quiero** que cada ejecución de X-Ray quede registrada en la base de datos,  
**para** poder analizar qué hacks evalúan los usuarios y construir una base sobre la cual crear SuperHacks.

---

## 3. Alcance del ticket

### Incluye

- Crear el modelo Prisma `HackReport` con los campos core.  
- Implementar el repositorio `HackReportRepository`.  
- Inyectarlo en `runHackXRayUseCase`.  
- Guardar el LabReport completo (`rawLabReport`) + metadatos útiles.  
- Crear endpoint de lectura `GET /api/hack-xray/:id`.  
- Tests unitarios + integración para:
  - Guardado exitoso  
  - Errores de BD  
  - Recuperación por ID  

### No incluye

- Listado con filtros (eso es HU04).  
- Validación compleja del JSON del LLM (HU05).  
- Importar desde URL (HU13).  

---

## 4. Modelo de BD (Prisma)

En `prisma/schema.prisma`:

```prisma
model HackReport {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())

  hackText        String
  sourceLink      String?  
  country         String   @default("US")

  hackType        String
  primaryCategory String
  verdictLabel    String
  riskLevel       String

  rawLabReport    Json
}
```

### Notas importantes:
- `rawLabReport` almacena **el JSON completo** tal como lo devuelve el LLM (validado).  
- `hackType`, `primaryCategory`, `verdictLabel`, `riskLevel` se duplican **solo para filtrar rápido** (HU04).  
- No se guarda la transcripción de URL (eso ocurre en HU13).

---

## 5. Repositorio: `HackReportRepository`

En `src/modules/hackXray/domain/ports.ts`:

```ts
export interface HackReportRepository {
  save(report: HackReportToSave): Promise<string>; // returns id
  findById(id: string): Promise<LabReport | null>;
}
```

### DTO para guardar

```ts
export type HackReportToSave = {
  hackText: string;
  sourceLink?: string | null;
  country: string;

  hackType: string;
  primaryCategory: string;
  verdictLabel: string;
  riskLevel: string;

  rawLabReport: any; // JSON completo validado
};
```

---

## 6. Implementación usando Prisma

En  
`src/modules/hackXray/infrastructure/hackReportPrismaRepository.ts`:

```ts
export class HackReportPrismaRepository implements HackReportRepository {
  async save(data: HackReportToSave): Promise<string> {
    const record = await prisma.hackReport.create({ data });
    return record.id;
  }

  async findById(id: string): Promise<LabReport | null> {
    const record = await prisma.hackReport.findUnique({ where: { id } });
    if (!record) return null;
    return record.rawLabReport as LabReport;
  }
}
```

---

## 7. Cambios en `runHackXRayUseCase`

Firma actualizada:

```ts
export async function runHackXRayUseCase(
  input: HackXRayInput,
  deps: {
    llmClient: HackXRayLLMClient;
    hackReportRepository: HackReportRepository;
  }
): Promise<{ id: string; labReport: LabReport }> {
```

Flujo:

1. `const labReport = await llmClient.generateLabReport(input);`
2. Validación mínima → HU01/HU02  
3. Construcción del objeto `HackReportToSave`
4. Guardar:

```ts
const id = await deps.hackReportRepository.save(toSave);
```

5. Retornar:

```ts
return { id, labReport };
```

### Si la BD falla:
- El X-Ray **NO se rompe**.  
- Se captura el error, se loguea, pero se devuelve el `labReport` sin ID.  
- Esto debe documentarse en el log.  
- Solo si se quiere endurecer, podría enviarse un warning.

---

## 8. Endpoint de lectura: `GET /api/hack-xray/:id`

`src/app/api/hack-xray/[id]/route.ts`:

```ts
export async function GET(req: Request, { params }) {
  const { id } = params;

  const report = await hackReportRepository.findById(id);

  if (!report) {
    return NextResponse.json(
      { errorCode: "NOT_FOUND", message: "Report not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ labReport: report });
}
```

---

## 9. Tests requeridos

### Unit tests
- Repositorio Prisma mock:
  - Guarda correctamente.  
  - Maneja error de DB.  

- Caso de uso:
  - Guarda y devuelve ID.
  - Maneja error de DB sin romper el flujo.

### Integration tests
- `POST /api/hack-xray` → obtiene ID en respuesta.  
- `GET /api/hack-xray/:id` recupera el informe.  
- Cuando se pide un ID inexistente → `404 NOT_FOUND`.

---

## 10. Criterios de aceptación

- [ ] Al ejecutar X-Ray, se guarda un registro en BD.  
- [ ] La respuesta incluye un `id`.  
- [ ] Se puede acceder al reporte vía `GET /api/hack-xray/:id`.  
- [ ] Errores de BD no bloquean el X-Ray (solo log).  
- [ ] Pruebas unitarias + integración completas.  

---

## 11. Dependencias

- HU01 implementada.  
- HU02 implementada.  
- Prisma configurado en el proyecto.  

---

Fin del ticket.

# Ticket_HU02_HackXRay_InputValidation.md
**Relacionado con HU:** HU02 – Validación y manejo de errores de input del X-Ray  
**Módulo:** `hackXray`  
**Prioridad:** Alta  
**Tipo:** Feature  

---

## 1. Resumen

Este ticket mejora la robustez de la herramienta **Hintsly Hack X-Ray** añadiendo:

1. Validaciones más estrictas del input en **frontend** y **backend**.  
2. Manejo claro y consistente de errores de entrada.  
3. Mensajes de error amigables para el usuario y códigos de error estándar para el sistema.

El objetivo es evitar:

- Envíos vacíos o casi vacíos.  
- Texto que no tiene pinta de “money hack” (ej. solo emojis o ruido).  
- Gastar tokens del LLM en inputs basura.  
- Respuestas crípticas o técnicas al usuario final.

Este ticket se apoya en la implementación existente de HU01 (formulario + endpoint + LLM) y añade la capa de “cinturón de seguridad” alrededor.

---

## 2. Objetivo funcional

**Como** usuario que no es técnico,  
**quiero** que el sistema me avise si pego algo vacío o no relacionado con un “money hack”,  
**para** no perder tiempo esperando resultados que no tienen sentido.

---

## 3. Alcance de este ticket

### Incluye

- Validaciones adicionales en **frontend** para el formulario `/hack-xray`:
  - Evitar enviar el formulario si el texto está vacío o casi vacío.
  - Mostrar mensajes de error claros bajo el campo correspondiente.
- Validaciones adicionales en **backend** (API `POST /api/hack-xray`):
  - Longitud mínima del texto (`hackText`).
  - Rechazar textos que son puro ruido (espacios, emojis sueltos, etc.).
  - Devolver `status 400` con `errorCode = "VALIDATION_ERROR"` y mensaje legible.
- Manejo uniforme de errores:
  - Diferenciar entre errores de **input** y errores de **LLM/servidor**.
- Tests unitarios e integración para cubrir casos de error típicos.

### No incluye

- Validación profunda del JSON del LLM (eso es HU05).  
- Persistencia en BD (HU03).  
- Listado y filtros (HU04).  
- Tono prudente / disclaimers (HU06).

---

## 4. Reglas de validación de input

### 4.1. Frontend (`/hack-xray`)

- Regla 1: `hackText` no puede estar vacío ni ser solo espacios.
- Regla 2: `hackText` debe tener al menos **20 caracteres** (configurable):
  - Si no se cumple:
    - Mostrar mensaje:  
      > “Please paste a bit more context about the money hack so we can analyze it.”
- Regla 3: `sourceLink` (si se rellena) debe parecer una URL:
  - Validación ligera (`startsWith('http')` o expresión regular simple).
  - Si es inválida:
    - Mostrar mensaje:  
      > “This doesn’t look like a valid link. You can leave it empty if you want.”

El frontend **no debe enviar la request** si alguna de estas validaciones falla.

### 4.2. Backend (`POST /api/hack-xray`)

Usar Zod (o similar) para:

- `hackText`:
  - `string`,
  - `.trim().length >= 20`.
- `sourceLink`:
  - `.url().optional().nullable()`.
- `country`:
  - string opcional, default `"US"`.

Además de Zod, añadir una **validación semántica ligera**:

- Regla 4: Rechazar textos con **muy baja densidad de caracteres alfabéticos**:
  - e.g. si, tras limpiar espacios, menos del 30% de caracteres son letras/números:
    - Considerar que es ruido (emojis, símbolos, etc.).
    - Devolver `VALIDATION_ERROR` con mensaje genérico:
      > “We couldn’t detect a meaningful money hack in the text. Please describe it in your own words.”

---

## 5. API Contract actualizado – `POST /api/hack-xray`

### Request body (JSON)

Sin cambios en la forma (solo se endurecen validaciones):

```json
{
  "hackText": "string (obligatorio, >= 20 chars limpios)",
  "sourceLink": "string | null (opcional, URL válida)",
  "country": "string (opcional, default 'US')"
}
```

### Responses de error relevantes para este ticket

#### 400 – Error de validación de input

```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "hackText must be at least 20 characters long."
}
```

Otros posibles mensajes:

- "hackText is required."
- "We couldn’t detect a meaningful money hack in the text. Please describe it in your own words."
- "sourceLink must be a valid URL if provided."

#### 502 – Error de LLM (no es parte de este ticket, pero debe diferenciarse)

```json
{
  "errorCode": "LLM_ERROR",
  "message": "Unable to generate lab report right now. Please try again later."
}
```

**Importante:**  
Este ticket se centra en los **400 – VALIDATION_ERROR**.  
Los 502 seguirán tratados por el ticket HU01 / ticket de integración LLM.

---

## 6. Cambios técnicos

### 6.1. Frontend – form `/hack-xray`

- Añadir lógica de validación antes del `fetch`:
  - Crear una función `validateHackXRayForm(values): { isValid: boolean; errors: { hackText?: string; sourceLink?: string } }`.
  - Mostrar errores bajo los inputs usando estado local (ej. `formErrors`).
- Si `isValid === false`:
  - No ejecutar `fetch`.
  - No cambiar a estado `loading`.

Pseudo-código:

```ts
const MIN_LENGTH = 20;

function validateHackXRayForm(values: { hackText: string; sourceLink?: string | null }) {
  const errors: { hackText?: string; sourceLink?: string } = {};

  const text = values.hackText?.trim() ?? "";
  if (!text) {
    errors.hackText = "Please paste a money hack first.";
  } else if (text.length < MIN_LENGTH) {
    errors.hackText = "Please paste a bit more context so we can analyze it.";
  }

  if (values.sourceLink) {
    const url = values.sourceLink.trim();
    const looksLikeUrl = url.startsWith("http://") || url.startsWith("https://");
    if (!looksLikeUrl) {
      errors.sourceLink = "This doesn’t look like a valid link. You can leave it empty.";
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
```

### 6.2. Backend – schema de validación (Zod)

En `src/app/api/hack-xray/route.ts`:

```ts
const HackXRaySchema = z.object({
  hackText: z.string().transform(v => v.trim()).refine(v => v.length >= 20, {
    message: "hackText must be at least 20 characters long.",
  }),
  sourceLink: z.string().url().optional().nullable(),
  country: z.string().optional(),
});
```

Después del parseo, aplicar la validación semántica ligera:

```ts
function isTextTooNoisy(text: string): boolean {
  const cleaned = text.replace(/\s+/g, "");
  if (!cleaned) return true;
  const alnumCount = (cleaned.match(/[0-9a-zA-Z]/g) || []).length;
  const ratio = alnumCount / cleaned.length;
  return ratio < 0.3;
}

// En el handler:
if (isTextTooNoisy(parsed.hackText)) {
  return NextResponse.json(
    {
      errorCode: "VALIDATION_ERROR",
      message: "We couldn’t detect a meaningful money hack in the text. Please describe it in your own words.",
    },
    { status: 400 }
  );
}
```

---

## 7. Comportamiento de la UI ante errores de validación backend

- Si el backend responde `400` con `errorCode = "VALIDATION_ERROR"`:
  - La UI debería:
    - Mostrar el `message` retornado en un bloque de error general (por ahora).
    - Mantener el contenido del `textarea` para que el usuario pueda corregir.
- No es obligatorio en este ticket mapear el error exactamente a cada campo (eso se puede posponer), pero sí:
  - No limpiar el formulario.
  - No mostrar “Something went wrong” genérico cuando se trate de un error de input.

---

## 8. Tests requeridos

### 8.1. Unit tests – Frontend

- Test de `validateHackXRayForm`:
  - Caso `hackText` vacío → `isValid = false`, error en `hackText`.
  - Caso `<20 chars` → error correspondiente.
  - Caso `sourceLink` con string que no empieza por `http` → error en `sourceLink`.
  - Caso válido → `isValid = true`, sin errores.

### 8.2. Unit tests – Backend

- Test del schema Zod:
  - `hackText` vacío → lanza error con mensaje `hackText must be at least 20 characters long.`.
  - `hackText` con espacios solamente → error.
  - `sourceLink` inválido → error.
- Test de `isTextTooNoisy`:
  - Texto de solo emojis → `true`.
  - Texto mixto con mayoría letras → `false`.

### 8.3. Integration tests – API

- `POST /api/hack-xray` con:
  - `hackText` < 20 chars → `400`, `VALIDATION_ERROR`.
  - `hackText` de emojis → `400`, `VALIDATION_ERROR` con mensaje de “meaningful money hack”.
  - `hackText` razonable + `sourceLink` válido → la petición pasa a la siguiente capa (se puede mockear el use case para no llamar al LLM).

---

## 9. Criterios de aceptación (checklist)

- [ ] El frontend no envía requests si `hackText` está vacío o es demasiado corto.  
- [ ] El usuario ve mensajes claros cuando su input no es suficiente.  
- [ ] El backend devuelve `400` + `VALIDATION_ERROR` para inputs vacíos, cortos o ruido.  
- [ ] La UI distingue visualmente entre:
  - errores de input (mensaje específico),  
  - errores de servidor/LLM (mensaje más genérico).  
- [ ] Existen tests unitarios y de integración que cubren los casos descritos.

---

## 10. Dependencias

- HU01 ya implementada (formulario y endpoint básicos).  
- Cliente LLM funcionando (aunque mockeable en tests de este ticket).

---

Fin del ticket.

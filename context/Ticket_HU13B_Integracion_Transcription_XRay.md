# Ticket_HU13B_Integracion_Transcription_XRay.md  
**Relacionado con HU:** HU13 – Importar hack desde video (flujo completo con X-Ray)  
**Módulo:** `hackXray` + `api`  
**Prioridad:** Alta  
**Tipo:** Feature – Integración Aplicación  

---

## 1. Resumen

Este ticket conecta el `YouTubeTranscriptionService` (ticket 13-A) con el flujo principal de Hintsly Hack X-Ray.

Objetivo:  
Que el endpoint `/api/hack-xray` pueda:

1. Detectar cuando el usuario envía **solo una URL de YouTube** (sin texto).  
2. Invocar el servicio de transcripción.  
3. Convertir la transcripción en un `hackText` candidato usando un LLM de extracción.  
4. Validar ese texto con HU02.  
5. Ejecutar el X-Ray normal (HU01/HU05) con ese `hackText`.  
6. Manejar errores devolviendo mensajes claros al frontend.

---

## 2. Objetivo funcional

**Como** usuario que pega un link de un vídeo donde explican un hack,  
**quiero** que Hintsly haga el trabajo de transcribir y extraer el hack del vídeo,  
**para** no tener que escribir todo el texto a mano antes de hacer el X-Ray.

---

## 3. Alcance del ticket

### Incluye

- Modificación de `POST /api/hack-xray` para soportar el modo:
  - `hackText` vacío o muy corto + `sourceLink` YouTube → HU13 flow.
- Llamada a `YouTubeTranscriptionService.transcribeFromUrl(sourceLink)`.
- Capa intermedia `HackFromTranscriptExtractor` (LLM) que:
  - Recibe `transcript`.
  - Devuelve un `hackText` corto (3–8 frases) centrado en el hack.
- Validación del `hackText` resultante usando las reglas de HU02 (misma función).
- Llamada a `runHackXRayUseCase` reutilizando el flujo actual.
- Extender `LabReport.meta.input_summary` con info de origen:
  - `extracted_from_video: true`
  - `source_link: string`
  - `transcription_meta: { provider, durationSec, ... }`
- Manejo de casos de error:
  - No se pudo transcribir.
  - No se pudo extraer un hack claro.
  - El texto extraído no pasa la validación.

### No incluye

- Feature flag ni métricas (eso es 13-C).  
- UI avanzada (todo lo que se pueda, se resuelve con mensajes genéricos reusables).  

---

## 4. Lógica de decisión en `/api/hack-xray`

Regla general:

1. Si `hackText` llega con contenido suficiente → flujo normal HU01/HU02.  
2. Si `hackText` vacío/insuficiente Y `sourceLink` ES YouTube → intentar HU13.  
3. Si HU13 falla → devolver error tipado invitando a pegar el texto a mano.

Casos:

- `hackText.length >= MIN_LENGTH` → usar `hackText` directamente.  
- `hackText.length < MIN_LENGTH` y `sourceLink` con dominio YouTube → HU13.  
- Resto → error de validación estándar.

---

## 5. Extracción del hack desde la transcripción

Crear módulo `HackFromTranscriptExtractor`:

- Input:
  - `transcript: string`
  - `options` (idioma, maxLength)
- Output:
  - `hackText: string` (texto corto, limpio, enfocado en el hack)

Uso de LLM con prompt específico:

- Ignorar intros, saludos, publicidad.
- Extraer solo el “truco financiero” en formato explicación corta.
- No hacer juicio de valor (eso es tarea del X-Ray, no de este paso).

Si el LLM no devuelve nada útil → error `EXTRACTION_FAILED`.

---

## 6. Validación del hack extraído

El `hackText` generado por `HackFromTranscriptExtractor` se pasa por el mismo validador de HU02:

- Longitud mínima.  
- Densidad de caracteres alfanuméricos.  
- No solo ruido.

Si falla:

- Se devuelve error:
  ```json
  {
    "errorCode": "EXTRACTION_FAILED",
    "message": "We couldn’t clearly detect a money hack in that video. Please describe it in your own words."
  }
  ```

---

## 7. Llamada al X-Ray

Si el `hackText` extraído es válido:

- Se construye el input estándar de `runHackXRayUseCase`:
  - `hackText`: el texto extraído.
  - `sourceLink`: URL original.
  - `country`: US (o según input).
  - `meta.input_summary.extracted_from_video = true`.

El resto del flujo (validación LLM, persistencia, etc.) permanece sin cambios.

---

## 8. Errores y respuesta al frontend

Nuevos códigos asociados a este flujo:

- `TRANSCRIPTION_FAILED`
- `VIDEO_TOO_LONG`
- `EXTRACTION_FAILED`

Todos deben mapear a mensajes comprensibles y seguros:

- “We couldn’t auto-extract the hack from this video. Please paste it in your own words and try again.”
- “This video is too long to auto-process. Try summarizing the hack yourself before running the X-Ray.”

---

## 9. Tests requeridos

### Unit tests

- Caso feliz:
  - `hackText` vacío + YouTube URL → llamada a:
    - `YouTubeTranscriptionService`
    - `HackFromTranscriptExtractor`
    - `runHackXRayUseCase`
- Caso: transcripción falla → `TRANSCRIPTION_FAILED`.  
- Caso: extractor devuelve texto pobre → `EXTRACTION_FAILED`.  
- Caso: texto extraído no pasa validación HU02 → `EXTRACTION_FAILED`.  

### Integration tests (API)

- `POST /api/hack-xray` con solo URL válida → devuelve `labReport`.  
- `POST /api/hack-xray` con URL inválida → error de validación normal.  
- `POST /api/hack-xray` sin texto y sin URL → error de validación normal.  

---

## 10. Criterios de aceptación

- [ ] Pegar solo una URL de YouTube puede, en condiciones normales, producir un Lab Report sin escribir el hack a mano.  
- [ ] Cuando la auto-extracción falla, el usuario recibe un mensaje claro invitando a escribir el hack.  
- [ ] El validador HU02 se reutiliza para texto de usuario y texto extraído.  
- [ ] La integración respeta el flujo actual de X-Ray (no lo rompe si HU13 está fallando).  

---

Fin del ticket 13-B.

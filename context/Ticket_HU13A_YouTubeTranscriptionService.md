# Ticket_HU13A_YouTubeTranscriptionService.md  
**Relacionado con HU:** HU13 – Importar hack desde video (modo laboratorio YouTube)  
**Módulo:** `hackXray` + `infrastructure/youtube`  
**Prioridad:** Media-Alta  
**Tipo:** Feature – Infraestructura (Experimental)  

---

## 1. Resumen

Implementar un servicio de infraestructura capaz de:

1. Recibir una URL de YouTube.  
2. Obtener el audio del vídeo (usando `ytdl-core`).  
3. Enviar ese audio a un proveedor de transcripción (OpenAI Whisper u otro de OpenAI).  
4. Devolver una transcripción de texto limpia + metadatos básicos.  

Este ticket **NO integra aún con el X-Ray ni con la API pública**.  
Es una pieza reusable y perfectamente encapsulada.

---

## 2. Objetivo funcional

**Como** capa de infraestructura de Hintsly,  
**quiero** un servicio `YouTubeTranscriptionService` que o bien me devuelva una transcripción, o bien me diga claramente por qué no ha podido,  
**para** poder construir encima un flujo de HU13 sin ensuciar el resto del código con `ytdl-core` ni detalles de OpenAI.

---

## 3. Alcance del ticket

### Incluye

- Creación de:
  - `YouTubeAudioFetcher` (usa `ytdl-core` internamente).
  - `TranscriptionProvider` (usa OpenAI Audio API).
  - `YouTubeTranscriptionService` que orquesta ambos.
- Gestión de errores y límites:
  - URL no válida o no YouTube.
  - Vídeo demasiado largo.
  - Timeout al descargar.
  - Timeout o error al transcribir.
- Tipos TypeScript claros para:
  - Input: `YouTubeTranscriptionRequest`.
  - Output: `YouTubeTranscriptionResult` o error tipado.

### No incluye

- Llamadas desde `/api/hack-xray`.  
- Extracción del hack desde la transcripción.  
- UX / manejo de errores en frontend.  

---

## 4. Interfaces de alto nivel

### 4.1. YouTubeTranscriptionService

Interfaz conceptual (sin código):

- `transcribeFromUrl(videoUrl: string): Promise<YouTubeTranscriptionResult>`

Donde `YouTubeTranscriptionResult` incluye:

- `transcript: string` (texto plano, sin timestamps).  
- `meta`:
  - `videoUrl`
  - `videoId`
  - `estimatedDurationSec`
  - `source: "youtube_ytdl"`
- `rawTranscript` opcional si se quiere guardar algo más detallado.

### 4.2. YouTubeAudioFetcher

Responsable de:

- Validar que la URL es de YouTube.  
- Resolver `videoId`.  
- Verificar (si es posible) la duración estimada del vídeo.  
- Proveer un stream/buffer de audio para el servicio de transcripción.

Errores típicos:

- `UNSUPPORTED_URL`
- `VIDEO_TOO_LONG`
- `FETCH_FAILED`

### 4.3. TranscriptionProvider

Responsable de:

- Recibir audio (stream o buffer).  
- Llamar a la API de OpenAI Audio.  
- Devolver texto.

Errores típicos:

- `TRANSCRIPTION_FAILED`
- `TRANSCRIPTION_TIMEOUT`

---

## 5. Límites y políticas

Definir en config/env:

- `MAX_VIDEO_DURATION_SECONDS` (ej. 1200 = 20min).  
- `MAX_TRANSCRIPTION_TIMEOUT_MS`.  
- `MAX_AUDIO_SIZE_MB` (si aplica).

Si el vídeo excede duración o tamaño:

- `YouTubeTranscriptionService` devuelve error tipado `VIDEO_TOO_LONG`.

---

## 6. Sanitización de la transcripción

Antes de devolver el texto:

- Eliminar:
  - timestamps si los hubiera,
  - líneas vacías repetidas.
- Normalizar espacios.
- Mantener el texto lo más “crudo” posible, sin resumir ni interpretar (la extracción de hack vendrá en otro ticket).

---

## 7. Manejo de errores

Definir un tipo:

```ts
type YouTubeTranscriptionErrorCode =
  | "UNSUPPORTED_URL"
  | "VIDEO_TOO_LONG"
  | "FETCH_FAILED"
  | "TRANSCRIPTION_FAILED"
  | "TRANSCRIPTION_TIMEOUT";
```

`YouTubeTranscriptionService` nunca lanza errores crudos de `ytdl-core` ni de OpenAI; siempre devuelve:

- `ok: true` + `result`, o  
- `ok: false` + `{ code: YouTubeTranscriptionErrorCode, message }`.

---

## 8. Tests requeridos

### Unit tests

- URL válida de YouTube → intenta fetch + transcribir.  
- URL no YouTube → `UNSUPPORTED_URL`.  
- Vídeo marcado como demasiado largo → `VIDEO_TOO_LONG`.  
- Simular fallo de descarga → `FETCH_FAILED`.  
- Simular fallo de transcripción → `TRANSCRIPTION_FAILED`.  

### (Opcional) Integration test

- Con un vídeo de prueba corto en YouTube (si se permite) para validar end-to-end en entorno controlado.

---

## 9. Criterios de aceptación

- [ ] `YouTubeTranscriptionService` existe y está encapsulado en infraestructura.  
- [ ] Usa internamente `ytdl-core` y OpenAI Audio, pero solo está expuesto como interfaz limpia.  
- [ ] Devuelve transcripción de vídeos cortos de YouTube correctamente en entorno de pruebas.  
- [ ] Maneja y tipa los errores básicos sin lanzar excepciones crudas.  

---

Fin del ticket 13-A.

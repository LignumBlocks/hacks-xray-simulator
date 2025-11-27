# Ticket_HU13C_FeatureFlag_y_Metricas_Ingestion.md  
**Relacionado con HU:** HU13 – Importar hack desde video (control y observabilidad)  
**Módulo:** `hackXray` + `config` + `observability`  
**Prioridad:** Media  
**Tipo:** Feature – Infra + Monitoring  

---

## 1. Resumen

Este ticket añade:

1. Un **feature flag** para poder habilitar/deshabilitar la funcionalidad experimental de auto-transcripción desde YouTube (HU13).  
2. Métricas y logging básico para medir:
   - cuántas veces se intenta usar HU13,
   - cuántas veces funciona,
   - cuántas veces falla y por qué.  

El objetivo es poder operar HU13 como **feature de laboratorio**, sin riesgo de romper el producto y con datos para decidir si merece la pena mantenerla o evolucionarla.

---

## 2. Objetivo funcional

**Como** responsable de producto y tecnología de Hintsly,  
**quiero** poder encender o apagar fácilmente la auto-extracción desde vídeo, y ver su tasa de éxito/fallo,  
**para** gestionar riesgos (ToS, coste, UX) sin tocar el resto del sistema.

---

## 3. Alcance del ticket

### Incluye

- Feature flag global:
  - `ENABLE_YOUTUBE_INGESTION` (por env/config).
- Comportamiento cuando el flag está `false`:
  - El flujo HU13 se salta completamente.
  - El backend devuelve un error tipado `FEATURE_DISABLED`.
- Logging estructurado de:
  - intentos de HU13,
  - error code (si lo hay),
  - duración de las operaciones.
- Métricas básicas:
  - contadores de:
    - `ingestion_attempts_total`
    - `ingestion_success_total`
    - `ingestion_failed_total`
  - repartidos por `errorCode` cuando falle:
    - `VIDEO_TOO_LONG`
    - `FETCH_FAILED`
    - `TRANSCRIPTION_FAILED`
    - `EXTRACTION_FAILED`
    - `FEATURE_DISABLED`

### No incluye

- Dashboard visual de métricas (Grafana, etc.).  
- Sistema de alertas.  

---

## 4. Feature flag – diseño

Leer de variables de entorno / config:

- `ENABLE_YOUTUBE_INGESTION = "true" | "false"` (string, convertido a boolean).

En el punto de entrada del flujo HU13 (p.ej. en `/api/hack-xray` antes de llamar a `YouTubeTranscriptionService`):

- Si `ENABLE_YOUTUBE_INGESTION === false`:
  - No llamar a ningún servicio de ingestión.
  - Responder:

```json
{
  "errorCode": "FEATURE_DISABLED",
  "message": "Automatic extraction from video links is not available right now. Please paste the hack in your own words."
}
```

---

## 5. Logging

Añadir logs estructurados (JSON) en:

- Cuando se intenta HU13:
  - `{ event: "youtube_ingestion_attempt", videoUrl, timestamp }`
- Cuando termina:
  - éxito:
    - `{ event: "youtube_ingestion_success", videoId, durationMs, transcriptLength }`
  - fallo:
    - `{ event: "youtube_ingestion_failed", videoId, errorCode, durationMs }`
- Cuando el flag está desactivado:
  - `{ event: "youtube_ingestion_feature_disabled", videoUrl }`

Estos logs deben ir al sistema de logging que ya uséis (stdout estructurado, etc.).

---

## 6. Métricas

Dependiendo de la solución que uséis (Prometheus, StatsD, etc.), definir contadores conceptuales:

- `hintsly_youtube_ingestion_attempts_total`
- `hintsly_youtube_ingestion_success_total`
- `hintsly_youtube_ingestion_failed_total{errorCode="TRANSCRIPTION_FAILED"}`

Si no tenéis una lib de métricas aún, al menos dejar preparada la interfaz, por ejemplo:

- `IngestionMetrics.incrementAttempt()`
- `IngestionMetrics.incrementSuccess()`
- `IngestionMetrics.incrementFailure(errorCode)`

De forma que luego se pueda enchufar fácilmente a cualquier backend de métricas.

---

## 7. Comportamiento UX cuando el flag está OFF

El frontend debe tratar `FEATURE_DISABLED` igual que otros errores “no catastróficos”:

- Mostrar mensaje suave:
  > “Right now we can’t auto-extract hacks from video links. Paste the hack description and we’ll run the X-Ray on that.”
- Mantener el formulario visible y editable.
- No bloquear el resto del flujo normal (texto pegado).

---

## 8. Tests requeridos

### Unit tests

- Cuando `ENABLE_YOUTUBE_INGESTION=false`:
  - No se llama a `YouTubeTranscriptionService`.
  - Se devuelve `FEATURE_DISABLED`.
- Cuando `ENABLE_YOUTUBE_INGESTION=true`:
  - El flujo HU13 funciona como antes.
- `IngestionMetrics`:
  - Incrementa contadores correctamente según resultado.

### Integration tests

- `POST /api/hack-xray` con solo URL:
  - Flag OFF → `FEATURE_DISABLED`.
  - Flag ON + mock de servicios → éxito.

---

## 9. Criterios de aceptación

- [ ] Existe un flag que permite activar/desactivar HU13 sin despliegue de código.  
- [ ] Cuando la feature está desactivada, el X-Ray sigue siendo usable vía texto.  
- [ ] Se registran logs útiles de intentos, éxito y fallo de la ingestión.  
- [ ] Se exponen o preparan métricas básicas para poder monitorizar la feature.  

---

Fin del ticket 13-C.

# Ticket_HU09_AdminAuthV1_SingleAdminSecret.md

**Relacionado con:**  
- HU07 – XRay Events & Métricas  
- HU08 – Analytics V2  
- Rutas actuales `/admin/xray/stats` y `/admin/hacks`

**Módulo:** `admin` / `auth` / `api`  
**Prioridad:** Crítica (seguridad de panel interno)  
**Tipo:** Feature – Seguridad / Autenticación mínima + Panel Admin

---

# 1. Resumen

Actualmente:

- `/hack-xray` es público (OK).  
- `/admin/xray/stats` y `/admin/hacks` están accesibles si conoces la URL (NO OK).  
- No existe una **home de admin** que agrupe las herramientas internas.

Este ticket implementa:

1. **Admin Auth v1** basada en un único secreto (`ADMIN_SECRET`) para proteger:
   - `/admin/*`
   - `/api/admin/*`
2. **Un Panel Admin en `/admin`** que agrupa los enlaces a:
   - `/admin/hacks`
   - `/admin/xray/stats`

---

# 2. Objetivo funcional

**Como** owner de Hintsly,  
**quiero** proteger el área administrativa con un login sencillo  
**y** tener un panel central desde donde acceder a las herramientas internas,  
**para** que el admin no tenga rutas sueltas y el sistema no quede expuesto.

---

# 3. Alcance

## Incluye

- Estrategia de Auth minimal basada en:
  - `ADMIN_SECRET` en `.env`.
  - Sesión/cookie admin (`isAdmin = true`).
- Protección de todas las rutas:
  - `/admin/*` (excepto `/admin/login`).
  - `/api/admin/*`.
- Pantalla de login `/admin/login`.
- **Nueva página `/admin` (Panel Admin)** con tarjetas/enlaces a:
  - “Hack Reports” → `/admin/hacks`.
  - “XRay Analytics” → `/admin/xray/stats`.
- Middleware / guard centralizado para comprobar auth en web y API.

## No incluye

- Sistema de usuarios ni roles múltiples.  
- OAuth / SSO.  
- Auditoría detallada de acciones.

---

# 4. Diseño de autenticación (Admin Auth v1)

### 4.1 Modelo

- Se usa una única contraseña admin configurada en:
  - `ADMIN_SECRET=...`
- Flujo:
  1. Usuario visita `/admin/login`.  
  2. Introduce contraseña admin.  
  3. Si coincide con `ADMIN_SECRET` → se crea sesión admin (`isAdmin = true`).  
  4. Con sesión válida → acceso a `/admin/*` y `/api/admin/*`.

---

# 5. Rutas protegidas

- Web:
  - `/admin` (Panel Admin)
  - `/admin/hacks`
  - `/admin/xray/stats`
- API:
  - `/api/admin/*` (ej: `/api/admin/xray/stats/basic`)

**Regla:**  
Solo accesibles si la sesión indica `isAdmin = true` y no ha expirado.

---

# 6. Panel Admin `/admin`

Crear una página `/admin` que funcione como **home del área administrativa**.

Contenido mínimo:

- Título: “Hintsly Admin Panel” (o similar).
- Dos tarjetas/botones:

  1. **Hack Reports**
     - Descripción corta: “Ver y revisar análisis individuales de hacks.”
     - Link: `/admin/hacks`.

  2. **XRay Analytics**
     - Descripción corta: “Ver métricas agregadas de uso del XRay.”
     - Link: `/admin/xray/stats`.

- Esta página:
  - Requiere sesión admin (usa el mismo guard).
  - Si se accede sin sesión → redirige a `/admin/login`.

---

# 7. Página de login `/admin/login`

- Formulario:
  - Campo `password`: “Admin password”.
  - Botón “Login”.
- Comportamiento:
  - Si ya hay sesión admin válida → redirigir a `/admin`.
  - Si el password es correcto → crear sesión admin + redirigir a:
    - la ruta originalmente solicitada (si se guarda), o
    - `/admin` por defecto.
  - Si el password es incorrecto:
    - Mostrar mensaje genérico: “Invalid admin password.”

---

# 8. Middleware / Guard

Aplicar a:

- Todas las páginas bajo `/admin` (excepto `/admin/login`).  
- Todas las rutas `/api/admin/*`.

Lógica:

1. Leer sesión.
2. Verificar:
   - `isAdmin === true`.
   - Sesión no expirada.
3. Si falla:
   - Web: redirect → `/admin/login`.
   - API: `401 Unauthorized` con JSON:

```json
{
  "error": "UNAUTHORIZED",
  "message": "Admin authentication required."
}

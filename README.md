# Élite Educativa Frontend Web App

Aplicación del lado del cliente (Frontend) para la plataforma de venta y consumo de cursos y libros. Está diseñada como una interfaz de usuario híbrida que consume la API del backend para manejar usuarios, compras y acceso al material.

## 2. Stack tecnológico

- Astro: `^7.2.6` (Renderizado Server-Side - SSR)
- React: `^19.2.6` (Componentes interactivos e islas)
- TailwindCSS: `^4.3.0` (vía `@tailwindcss/vite`)
- Nanostores: `^1.3.0` (vía `@nanostores/react` para estado global)
- @astrojs/vercel: `^11.0.8` (Adaptador de despliegue)

## 3. Requisitos previos

- Node.js: `>=22.12.0` (requerido explícitamente en el campo `engines` de `package.json`)
- npm (Gestor de paquetes usado por defecto)
- Backend de Élite Educativa corriendo (local o en la nube)
- Credenciales del cliente de PayPal (sandbox o live)

## 4. Variables de entorno

Todas las variables son accesibles en el código cliente mediante `import.meta.env.*`.

| Variable | Descripción |
|----------|-------------|
| `PUBLIC_API_URL` | URL base del backend donde reside la API (ej. `http://localhost:3000`). Se usa en todos los servicios (`src/services`). |
| `PUBLIC_PAYPAL_CLIENT_ID` | Client ID público proporcionado por PayPal para renderizar el botón de pagos inteligente en el navegador. |

## 5. Instalación y arranque

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev
```


## 6. Estructura del proyecto

El proyecto sigue una estructura basada en el ruteo por archivos de Astro, inyectando interactividad vía React:

```text
src/
├── components/
│   ├── admin/       # Paneles de gestión exclusivos para administradores
│   ├── auth/        # Formularios (Login, Forgot/Reset Password)
│   ├── courses/     # Visor de lecciones LMS, editor de cuestionarios
│   └── ui/          # Componentes visuales genéricos y Modales
├── pages/           # Rutas automáticas de Astro (ej. /cursos, /login)
├── services/        # Capa de consumo HTTP contra el Backend (fetch API)
└── store/           # Estado global reactivo con Nanostores (authStore, adminStore)
```

## 7. Mapa de módulos principales

- `auth`: Páginas de inicio de sesión, registro y restablecimiento de contraseña (`login.astro`, `forgot-password.astro`, `reset-password.astro`).
- `cursos`: Catálogo público (`cursos.astro`), panel de creación (`/cursos/crear.astro`) y la vista avanzada del LMS (`/cursos/[id]/aprender.astro`).
- `libros`: Catálogo literario (`libros.astro`) y páginas dinámicas de producto (`/libros/[id].astro`).
- `admin`: Panel de control para administradores (`/admin/usuarios.astro`).
- `biblioteca`: Acceso privado a los productos comprados (`mis-cursos.astro`, `mis-libros.astro`).

## 8. Roles y permisos

En el frontend, la interfaz se adapta visualmente según el rol del usuario (`ESTUDIANTE`, `PROFESOR`, `ADMIN`) consultando el estado global en `adminStore` y `authStore`. Por ejemplo, si el usuario es administrador, se muestra el botón de "Gestionar Destacados" condicionalmente en React. 
*(Nota: El frontend asume que el backend es el dueño de la verdad; toda acción restringida que se intente desde la UI es validada finalmente por los `AuthGuard` y `RolesGuard` del backend).*

## 9. Documentación de API

Consume API del backend a través de las clases de servicio (`src/services/`):

- `authService`: Login, registro, reseteo.
- `coursesService`: Gestión integral del catálogo de cursos, lecciones y quizzes.
- `bookService`: Consulta, creación y eliminación de libros.
- `usersAdminService`: Listado y manejo de usuarios para el panel admin.
- `categoryService` / `courseCategoryService`: Obtención de taxonomías para filtros y creación.

## 10. Decisiones de arquitectura no obvias

- **Astro Islands (`client:only="react"`):** Se utiliza Astro para generar el cascarón HTML de las páginas rápidamente (SSR) para SEO. Sin embargo, herramientas pesadas como el *Visor de PDF* o el *Gestor de Quizzes* están aisladas en componentes de React que solo cargan JavaScript en el cliente cuando es estrictamente necesario.
- **Adaptador SSR (`output: 'server'`):** En `astro.config.mjs`, se configuró la app para ejecutarse del lado del servidor (no es un sitio estático). Esto permite interceptar la cookie `accessToken` en tiempo real y denegar el acceso a las páginas protegidas antes de enviar un solo byte al navegador del cliente.
- **Transición de Pagos Sin Recarga:** Al aprobar un pago con el botón inteligente de PayPal, el componente React actualiza el estado de la compra e inyecta la URL del contenido de forma reactiva, evitando las molestas redirecciones (redirects) de página.

## 11. Testing

La interfaz utiliza Vitest para probar la lógica de sus componentes y servicios:

```bash
# Ejecutar todas las pruebas una vez
npm run test

# Ejecutar las pruebas en modo observador (watch mode)
npm run test:watch
```

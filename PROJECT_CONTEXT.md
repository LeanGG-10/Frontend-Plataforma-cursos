# Contexto del Proyecto: Élite Educativa (Plataforma E-learning)

Este documento es la "memoria técnica completa" de la plataforma **Élite Educativa**, diseñado para que cualquier IA o desarrollador adquiera el contexto absoluto sin necesidad de preguntar, revisar repositorios o leer el historial.

---

## 1. Resumen Ejecutivo

**Élite Educativa** es una plataforma de educación digital (E-learning) y venta de recursos (libros y cursos). 
- **Propósito:** Permitir a los usuarios comprar, almacenar en su biblioteca personal y consumir contenido educativo (actualmente libros PDF y, en desarrollo, cursos en video).
- **Usuarios:** Estudiantes (consumidores), Autores/Profesores (creadores de contenido) y Administradores (gestión de catálogo y usuarios).
- **Objetivo del Negocio:** Vender acceso a material educativo con un sistema robusto contra la piratería (URLs firmadas temporales) y prevención de cuentas compartidas (sesión única por usuario).
- **Estado Actual:** El módulo de venta y lectura de libros digitales está completo y funcional, integrado con PayPal. El módulo de **Cursos** se encuentra en desarrollo activo (modelos de base de datos creados, pero frontend en construcción).

---

## 2. Arquitectura General

El sistema se basa en una **Arquitectura Cliente-Servidor (Desacoplada)** con renderizado híbrido y validación de identidad distribuida.

- **Capa Cliente (Frontend - Astro + React):** Utiliza **Islands Architecture**. Astro se encarga del SSR/SSG para optimizar el SEO y el First Contentful Paint (FCP). React se usa exclusivamente para componentes altamente interactivos (formularios complejos, pasarela de pagos, filtros en caliente).
- **Capa de Servidor (Backend - NestJS):** API RESTful que centraliza la lógica de negocio, validaciones transaccionales y seguridad. Sigue un patrón de inyección de dependencias estricto.
- **Capa de Identidad y Almacenamiento (Supabase):** Se delega la autenticación (Supabase Auth) y el almacenamiento de binarios (Supabase Storage para PDFs y portadas).
- **Capa de Persistencia (PostgreSQL + Prisma ORM):** Base de datos relacional para guardar el catálogo, perfiles, historial de compras (biblioteca) y estados de órdenes.
- **Flujo de Datos:** El cliente se comunica con la API mediante peticiones HTTP REST con tokens JWT (`Bearer`). La API verifica la identidad directamente contra Supabase, inyecta el usuario en el contexto (decorador `@CurrentUser`), procesa en PostgreSQL y responde.
- **Decisión Arquitectónica:** Se eligió Astro por su inigualable rendimiento para plataformas de contenido (catálogos), delegando interactividad solo donde es necesario. NestJS aporta tipado fuerte y estructura enterprise.

---

## 3. Tecnologías

- **Frontend:**
  - **Astro (v6.x):** Framework principal. Elegido por su velocidad y soporte para múltiples frameworks UI. (**Confirmado**)
  - **React (v19):** Para islas interactivas (Auth, filtros de catálogo). (**Confirmado**)
  - **TailwindCSS (v4):** Sistema de estilos utilitario, para desarrollo ágil de interfaces. (**Confirmado**)
  - **Nano Stores:** Gestión de estado global ligero (ej. estado de "Modo Edición" del admin). (**Confirmado**)
  - **PayPal JS SDK:** Pasarela de pagos embebida. (**Confirmado**)

- **Backend:**
  - **NestJS (v11):** Framework Node.js progresivo. Elegido por su estructura modular y escalabilidad. (**Confirmado**)
  - **Prisma ORM (v6.x):** Capa de acceso a datos (Type-safe). (**Confirmado**)
  - **Supabase (Auth & Storage):** BaaS para delegar complejidad criptográfica de passwords y almacenamiento de PDFs protegidos. (**Confirmado**)
  - **PostgreSQL:** Motor de base de datos relacional. (**Confirmado**)
  - **pdf-lib:** Librería para procesar PDFs en memoria y extraer metadatos (como el conteo de páginas). (**Confirmado**)

---

## 4. Estructura del Proyecto

El sistema está dividido en dos repositorios lógicos (aunque residen en la misma máquina para desarrollo).

### Frontend (`Frontend-plataforma/src/`)
- `assets/`: Imágenes estáticas y recursos.
- `components/`: 
  - `auth/`: Islas React para login/registro.
  - `ui/`: Primitivas de diseño.
  - `admin/`: Componentes para el CRUD administrativo.
  - `paypal-button.ts` y `PayPalPaymentButton.astro`: Orquestadores críticos del flujo de cobro.
- `layouts/`: Plantillas base (`Layout.astro`).
- `pages/`: Enrutamiento basado en archivos (`/libros/[id].astro`, `/login.astro`, `/cursos/crear.astro`).
- `services/`: Patrón Singleton para llamadas a la API (`auth.service.ts`, `book.service.ts`). Encapsulan el uso de `fetch`.
- `store/`: Nano Stores (`adminStore.ts`).

### Backend (`plataforma-cursos/src/` - *Inferencia por configuración*)
- `controllers/`: Exponen endpoints REST.
- `services/`: Lógica de negocio (Products, Payments, Auth).
- `guards/`: `AuthGuard` y `RolesGuard` para protección de rutas.
- `prisma/schema.prisma`: Fuente de verdad de los datos.

---

## 5. Flujo Completo de la Aplicación (Ejemplo: Compra de Libro)

1. **Visitante:** Entra a `/libros` (Astro renderiza HTML rápido).
2. **Autenticación:** Va a `/login`. React maneja el form. `auth.service.login` envía POST a NestJS.
3. **Backend Auth:** NestJS valida con Supabase, genera un `activeSessionId` en PostgreSQL (para evitar multicuentas) y devuelve el JWT y el sessionId.
4. **Almacenamiento Local:** El cliente guarda en `localStorage` el JWT, sessionId y rol.
5. **Acceso al Producto:** El usuario va a `/libros/123`. El cliente (Astro/React) verifica en background `GET /products/123/read-url`.
6. **Bloqueo:** NestJS responde HTTP 403 (No comprado).
7. **Pago:** El frontend inyecta el SDK de PayPal. El usuario pulsa pagar.
8. **Orden:** `createOrder` envía POST a NestJS (enviando solo el ID del libro; la identidad se extrae del JWT para seguridad). NestJS crea la orden en Prisma y llama a la API de PayPal.
9. **Aprobación:** El usuario paga en PayPal. `onApprove` envía POST a `capture-order` en NestJS.
10. **Captura:** NestJS captura los fondos, marca la orden como `COMPLETED`, añade el libro a `user_library` en Prisma.
11. **Consumo:** El frontend muta dinámicamente y muestra el botón "LEER OBRA". Al pulsarlo, pide una URL firmada válida por 1 hora a Supabase Storage y la abre en nueva pestaña.

---

## 6. Base de Datos (Esquema Prisma)

**Tablas Críticas:**
- `profiles`: Extensión de usuarios de Supabase. Guarda `role` (`ESTUDIANTE`, `ADMIN`, etc.) y `active_session_id`.
- `products`: Catálogo central. Tiene `type` (`BOOK`, `COURSE`), `price`, `status`.
- `book_metadata` / `course_metadata`: Tablas de especialización de productos (relación 1:1). `book_metadata` guarda el `file_url` (ruta privada).
- `user_library`: Tabla pivote (N:M). Registra qué usuario posee qué producto (`profile_id`, `product_id`). **Es la fuente de verdad del acceso**.
- `orders`: Historial transaccional. Guarda `paypal_order_id` y `status` (`CREATED`, `CAPTURED`).

**Restricciones importantes:** 
- Cascada al borrar productos (`onDelete: Cascade` en metadata).
- `user_library` no permite borrar un producto si alguien lo compró (`onDelete: Restrict`).

---

## 7. Modelos del Dominio

- **Profile:** Representa la identidad. Atributos: `id` (mismo de Supabase), `email`, `role`, `active_session_id`.
- **Product:** Representación comercial abstracta. Atributos: `title`, `price`. Se ramifica mediante relaciones en **BookMetadata** (tiene PDF y páginas) o **CourseMetadata** (tiene instructor y duración).
- **Order:** Representación de pago. Controlada mediante un flujo de estados (`CREATED` -> `CAPTURED`).

---

## 8. APIs (Endpoints Principales Inferidos)

- `POST /auth/login` y `/auth/signup`: Gestión de identidad.
- `GET /products`: Catálogo público.
- `GET /products/:id`: Detalle del producto.
- `GET /products/:id/read-url`: **Crítico**. Devuelve una Signed URL de Supabase si el usuario tiene el producto en su `user_library`.
- `POST /payments/paypal/create-order`: Crea orden en DB y en PayPal Sandbox.
- `POST /payments/paypal/capture-order`: Confirma pago, otorga acceso en DB.
- `POST /webhook/paypal`: Conciliación asíncrona de pagos caídos.

---

## 9. Frontend

- **Estructura Híbrida:** Páginas `.astro` (estáticas/SSR) + islas `.tsx` (dinámicas).
- **Gestión de Estado:** `localStorage` para tokens. `nanostores` para estados de UI compartidos (ej: `adminStore.ts` define `isEditing` para el modo CRUD visual).
- **Seguridad en UI:** Renderizado condicional en componentes. Los botones de pago y lectura mutan en caliente evaluando las respuestas HTTP, sin fiarse únicamente del estado local (defensa en profundidad).
- **Estilos:** Tailwind CSS de extremo a extremo.

---

## 10. Backend

- **Capas:** Controladores (REST) -> Servicios (Reglas de Negocio) -> Repositorios/Prisma (Datos).
- **Protección:** `AuthGuard` verifica el JWT y el `x-session-id`. `RolesGuard` asegura que las mutaciones de catálogo sean de un `ADMIN`.
- **Inyección de Dependencias:** Uso nativo del sistema de IoC de NestJS.
- **Manejo de Archivos:** Interceptores de Nest (`FileFieldsInterceptor`) para subir archivos a Supabase Storage con validación de tipo MIME (solo PDF para libros) y tamaño (20MB max).

---

## 11. Flujo de Autenticación

1. El usuario envía credenciales. NestJS llama a Supabase Auth.
2. Supabase devuelve un JWT.
3. NestJS genera un `activeSessionId` (UUID) aleatorio y lo guarda en la base de datos (invalidando el anterior).
4. El cliente recibe el JWT y el SessionID. Los manda en cada petición en los Headers (`Authorization: Bearer <token>` y `x-session-id`).
5. **Expiración:** Manejada por el JWT de Supabase.
6. **Control anti-compartir:** Si el usuario A inicia sesión, su `activeSessionId` cambia. Si intenta usar el token viejo en otro PC, el backend rechaza la petición por desajuste del SessionID.

---

## 12. Autorización

- **Roles:** `ESTUDIANTE`, `PROFESOR`, `ADMIN`.
- **Middleware/Guards:** NestJS `@Roles(UserRole.ADMIN)` protege las rutas.
- **Bypass de Acceso:** Un `ADMIN` obtiene un bypass automático para ver cualquier libro (status 200/201 al pedir lectura), sin verificar `user_library`.

---

## 13. Dependencias Importantes

- **Frontend:** `@nanostores/react`, `lucide-react` (iconos), `tailwindcss` (v4).
- **Backend:** `@prisma/client` (comunicación con DB), `@supabase/supabase-js` (identidad/archivos), `pdf-lib` (validación e inspección profunda de PDFs), `nestjs` ecosistema.

---

## 14. Variables de Entorno

**Frontend (`.env`):**
- `PUBLIC_API_URL`: Ruta del backend NestJS. Si falta, fallan los fetch.
- `PUBLIC_PAYPAL_CLIENT_ID`: Llave de la app de PayPal Sandbox para renderizar el widget.

**Backend (`.env` - *Inferido*):**
- `DATABASE_URL` / `DIRECT_URL`: Conexiones a PostgreSQL.
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`: Conexión al BaaS.
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`: Credenciales para captura de fondos.

---

## 15. Configuración

- **Frontend:** 
  - `astro.config.mjs`: Configura el framework, integraciones de react y tailwind.
  - `tailwind.config.mjs`: Tokens de diseño de la marca (colores "Élite").
- **Backend:** 
  - `prisma/schema.prisma`: Contrato sagrado de datos.
  - `nest-cli.json`: Compilación.

---

## 16. Flujo de Datos (Visual)

```mermaid
graph TD
    A[Usuario (Browser)] -->|Pide HTML| B(Astro Frontend)
    A -->|Clic Pagar PayPal| C(Widget PayPal)
    C -->|onApprove| D[NestJS API - POST /capture]
    D -->|Valida JWT| E(Supabase Auth)
    D -->|Confirma Pago| F(PayPal REST API)
    D -->|Otorga Acceso| G[(PostgreSQL - Prisma)]
    D -->|Devuelve Success| A
    A -->|Pide Lectura| D
    D -->|Firma URL Temp| H(Supabase Storage)
    H -->|Devuelve Signed URL| A
    A -->|Abre PDF| H
```

---

## 17. Decisiones de Diseño Detectadas

- **Aislamiento de Identidad (Seguridad Crítica):** El frontend *nunca* envía el ID del usuario en el payload (`body`) al hacer una compra. El backend lo extrae estrictamente del JWT (usando `@CurrentUser`). Esto evita manipulación de requests (Suplantación). (**Confirmado**)
- **URLs Firmadas vs Streaming:** Se optó por URLs firmadas de tiempo muy corto (1 hora) de Supabase Storage en lugar de streamear el PDF a través de NestJS. Esto reduce la carga del backend a cero durante la lectura, delegando el ancho de banda al CDN de Supabase, manteniendo el contenido inaccesible de forma pública. (**Inferencia/Confirmado**)
- **Control Activo de Sesión (Anti-Piratería):** La creación del `active_session_id` existe explícitamente para impedir que un usuario comparta su cuenta (y sus libros) con 10 personas más al mismo tiempo. Al iniciar sesión de nuevo, revoca las anteriores. (**Confirmado**)
- **Islands Architecture:** React se usa solo como "parches" interactivos en HTML estático (Astro), buscando máximo rendimiento y evitar un SPA pesado. (**Confirmado**)

---

## 18. Patrones Utilizados

- **Islands Architecture (Frontend):** Mezcla de HTML SSR estático (`.astro`) e hidratación parcial (`.tsx`).
- **Singleton (Frontend):** Servicios instanciados globalmente (`export const authService = new AuthService()`).
- **MVC y Decorators (Backend):** Estructura clásica de NestJS con separación de Controller/Service/Repository.
- **Guards / Interceptors:** Lógica de autenticación ortogonal.
- **Soft-Delete Inverso (Rollbacks):** Si falla la inserción en DB al registrar un usuario, el backend hace un rollback eliminándolo de Supabase.

---

## 19. Convenciones del Proyecto

- **Nombres:** Rutas en minúsculas y guiones (kebab-case) para archivos Astro. PascalCase para componentes React/Astro. camelCase para servicios.
- **Respuestas de API:** Se usa manejo nativo de excepciones de NestJS (`HttpException`), devolviendo objetos JSON con `message`, `error` y `statusCode`.
- **Frontend Fetch:** El cliente captura respuestas que no son `ok` y hace `throw` del JSON de error para que la UI reaccione.

---

## 20. Estado Actual

- **Completos:** Módulo de Autenticación, Gestión de Sesiones, Pasarela PayPal, Catálogo de Libros, Administración CRUD de Libros y Categorías, Visor PDF.
- **Incompletos / Pendientes (WIP):** 
  - **Módulo de Cursos (Videocursos):** Se detecta que el schema de base de datos ya soporta `CourseMetadata`, `CourseSection`, `CourseLesson`, y que el frontend tiene un archivo abierto `src/pages/cursos/crear.astro` lo que indica que se está construyendo la interfaz de creación de cursos para administradores.

---

## 21. Riesgos Técnicos

- **Dependencia fuerte con `localStorage`:** Los tokens y estados dependen de ello; susceptible a limpieza del usuario o scripts (XSS).
- **Estado de Transacción:** Si el webhook de PayPal falla y el usuario cierra la pestaña antes de `capture-order`, la orden podría quedarse atascada en estado `CREATED`. (Aunque el backend posee webhook para mitigarlo).
- **Doble carga de estilos:** Asegurar que Tailwind en Astro y las islas React compartan el mismo contexto CSS para evitar discrepancias visuales.

---

## 22. Cómo Continuar el Desarrollo (Guía para IA)

1. **Por dónde empezar (Cursos):** Analiza `src/pages/cursos/crear.astro`. El backend ya soporta `ProductType.COURSE`. Debes replicar el comportamiento de subida del formulario de libros (`BookCardReact`, `adminStore`) adaptándolo a Cursos (Secciones, Lecciones, URL de video).
2. **Archivos a leer primero:** `src/components/paypal-button.ts` (para entender cómo muta la UI sin recargar) y `src/services/auth.service.ts` (para el manejo de tokens).
3. **Regla inquebrantable:** *NUNCA* mandes un `userId` en el payload (body) hacia el backend para acciones de mutación o compra; el backend ya lo sabe vía Header.
4. **Al crear componentes:** Si no necesita interactividad fuerte en el cliente, usa `.astro`. Si necesita estado complejo o hooks, usa `.tsx` e hidrátalo con `client:load` o `client:visible`.

---

## 23. Prompts Recomendados para Otra IA

- *"Implementa la interfaz de creación de Secciones de Cursos en `crear.astro`, respetando la arquitectura de estado con Nano Stores de `adminStore.ts` y enviando multipart form data al backend."*
- *"Refactoriza el manejo de errores en `courses.service.ts` para que coincida exactamente con el patrón de captura de excepciones de `book.service.ts`."*
- *"Crea el componente `CourseCard.astro` basándote en la convención y estilos de `BookCard.astro`, implementando el renderizado condicional de precios o el botón 'Ir al curso'."*

---

## 24. Glosario

- **activeSessionId:** UUID generado en login para garantizar una única sesión activa por cuenta y dispositivo.
- **Signed URL:** Enlace temporal emitido por Supabase Storage que caduca en minutos, usado para acceder a archivos PDF privados.
- **Nano Stores:** Gestor de estados minimalista para compartir datos entre componentes React e instancias aisladas en la arquitectura de islas de Astro.

---

## 25. Resumen Final

**Élite Educativa** cuenta con un backend robusto en NestJS y Prisma que garantiza transacciones seguras con PayPal sin exponer vulnerabilidades de suplantación de identidad. El frontend en Astro ofrece un catálogo estático ultrarrápido y SEO-friendly, delegando interacciones complejas a React. La persistencia dual (Supabase Auth/Storage + PostgreSQL) protege eficazmente los recursos comerciales (libros y futuros cursos). Su desarrollo es altamente predecible, basado en contratos DTO fuertes y componentes tipados en TypeScript.

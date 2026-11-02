# MacroLog

PWA **local-first** para registrar calorías y macronutrientes **gramo a gramo**, con **cuentas familiares**, perfiles independientes dentro de cada cuenta y sincronización privada en Cloudflare.

- Cada integrante entra con su propia cuenta y ve solo sus datos.
- Se puede usar offline; los cambios se sincronizan al volver la conexión.
- Perfiles para etapas, planes, clientes o miembros del hogar.
- Biblioteca de alimentos **global**, compartida por todas las cuentas y perfiles, con valores por 100 g en crudo y limpio.
- Optimizada para móvil, tablet y escritorio.

> Repositorio: [github.com/leoandrescl/macrolog](https://github.com/leoandrescl/macrolog)
> App: [macrolog.leoandrescl.workers.dev](https://macrolog.leoandrescl.workers.dev)

---

## Funcionalidades

### Cuentas y sincronización

- Login rápido con correo y contraseña. La sesión se mantiene activa hasta 180 días con renovación al usarla.
- Registro familiar protegido por un **código de familia**.
- Sesiones con cookie `HttpOnly`, contraseñas con PBKDF2 y rate limiting básico en login.
- Sincronización automática entre dispositivos mediante Cloudflare **Workers + D1**.
- Copia local en IndexedDB para funcionar offline; los cambios pendientes se reintentan al reconectar.
- El primer registro en un dispositivo que ya tenía datos locales los vincula a la cuenta nueva, sin perderlos.
- Cerrar sesión borra la copia local del dispositivo. Los datos quedan en la cuenta.
- Cambio de contraseña desde Ajustes; las demás sesiones se revocan.
- No hay recuperación automática de contraseña ni verificación por correo. Si se olvida, el administrador debe restablecerla.

### Perfiles

- Crear, editar, cambiar y eliminar perfiles dentro de una cuenta.
- Meta diaria independiente por perfil: kcal, proteína, carbohidratos y grasa.
- **Distribuciones automáticas de macros** con presets: Equilibrado, Alta proteína, Rendimiento, Metabólico y Alta energía. Al cambiar las calorías se recalculan los gramos.
- Opción **Manual** para ajustar los gramos de cada macro.
- La distribución queda guardada en el perfil y se muestra en su tarjeta.
- Bloques de comida propios de cada perfil: desayuno, almuerzo, once, cena o bloques personalizados.
- Agregar, renombrar, reordenar y eliminar bloques. Si tienen historial, se archivan para conservar los registros.

### Biblioteca de alimentos

- Biblioteca **global**: los alimentos están disponibles para todas las cuentas y todos los perfiles.
- Los cambios y eliminaciones se propagan automáticamente entre dispositivos y cuentas.
- Valores por 100 g: kcal, proteína, carbohidratos y grasa.
- Búsqueda insensible a tildes y mayúsculas.
- Snapshot por registro: editar o eliminar un alimento no altera el historial.
- Borrado lógico con tombstones para que una eliminación no “resucite” en otro dispositivo.
- Todos los pesos son en crudo, sin cáscaras, huesos ni desperdicios.

### Diario

- Vista diaria con selector de fecha y retorno rápido a hoy.
- Registro por bloques de comida.
- Búsqueda rápida con alimentos recientes.
- Gramos con presets, steppers y vista previa de macros en tiempo real.
- Edición de gramos y bloque, eliminación con “Deshacer”.
- Resumen con calorías restantes, macros restantes y sobregiro.

### Datos y apariencia

- Exportación e importación JSON.
- Borrado completo de la cuenta con confirmación.
- Tema oscuro por defecto y selector oscuro / claro / sistema.
- Instalación como PWA y actualización automática del service worker al confirmar.

---

## Stack

| Capa          | Tecnología                                            |
| ------------- | ----------------------------------------------------- |
| UI            | React 19 + TypeScript                                 |
| Build         | Vite 8                                                |
| Estilos       | Tailwind CSS 4 + design tokens                        |
| Datos locales | Dexie 4 / IndexedDB                                   |
| Routing       | React Router 8                                        |
| Formularios   | React Hook Form + Zod 4                               |
| PWA           | vite-plugin-pwa 2 / Workbox                           |
| Backend       | Cloudflare Workers                                    |
| Base de datos | Cloudflare D1                                         |
| Auth          | Sesiones opacas + cookies HttpOnly + PBKDF2 WebCrypto |
| Tests         | Vitest 5 + fake-indexeddb                             |
| Lint/format   | Biome 2                                               |
| Deploy        | Wrangler 4                                            |

Sin componentes de UI pesados ni librerías de gráficos. El dashboard usa SVG y CSS.

---

## Desarrollo

Requiere Node.js 20.19+ (probado con Node 24).

La app necesita el Worker de API y D1 para autenticar y sincronizar.

```bash
npm install

# 1. Base de datos local
npx wrangler d1 migrations apply macrolog-db --local

# 2. API local
npm run dev:api        # http://127.0.0.1:8787

# 3. App (en otra terminal)
npm run dev            # http://127.0.0.1:5173
```

Crea un archivo `.dev.vars` local (ignorado por Git) con el código de registro. Puedes copiar el ejemplo:

```bash
copy .dev.vars.example .dev.vars
```

```dotenv
FAMILY_SIGNUP_CODE=TU-CODIGO-FAMILIAR
```

Vite redirige `/api/*` al Worker local. La app no necesita CORS.

### Scripts

```bash
npm run dev          # cliente Vite
npm run dev:api      # Worker + D1 local
npm run build        # typecheck cliente/worker + build
npm run preview      # sirve dist
npm test             # tests
npm run typecheck    # TypeScript cliente y Worker
npm run lint         # Biome
npm run db:migrate   # aplica migraciones D1 remotas
npm run user:reset-password -- --email correo@ejemplo.cl --password "NuevaClave123"
npm run deploy       # build + deploy a Cloudflare Workers
```

---

## Arquitectura

```text
worker/
├─ index.ts           # Router de API y endpoints
├─ auth.ts            # Sesiones y password lookup
├─ data.ts            # Snapshot gzip por cuenta, revisiones y conflictos
├─ foods.ts           # Biblioteca global: validación, listado y upsert
├─ types.ts           # Bindings y entidades del Worker
└─ utils.ts           # Cookies, hashing, gzip, rate limit y validación

migrations/
├─ 0001_initial.sql   # users, sessions, user_data, auth_attempts
└─ 0002_global_foods.sql # foods compartida, updated_at y deleted_at

src/
├─ app/               # bootstrap, auth, sync, router y shell
├─ components/        # UI y layout
├─ db/                # Dexie y repositorios
├─ features/          # auth, diario, alimentos y perfiles
├─ hooks/
├─ lib/               # API, nutrición, fechas, merge y validación
├─ pages/
├─ styles/
└─ types/
```

### Autenticación

- Registro con nombre, correo, contraseña y código de familia.
- Contraseñas con PBKDF2-SHA256 (100.000 iteraciones, límite de Cloudflare Workers) y sal aleatoria.
- Tokens de sesión de 32 bytes; en D1 solo se guarda su hash SHA-256.
- Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en HTTPS.
- Renovación deslizante de 180 días.
- Rate limiting por IP y correo en login/registro.
- Validación de `Origin` para operaciones de escritura.
- No se registran correos ni contraseñas en logs.
- Si una persona olvida su contraseña, el administrador puede restablecerla con `npm run user:reset-password -- --email ... --password ...`. El script revoca todas las sesiones abiertas de esa cuenta. Usa `--local` para la base de desarrollo.

### Sincronización

La sincronización tiene dos canales independientes:

1. **Datos privados de la cuenta** (`/api/data`): perfiles, bloques, registros y perfil activo. Se envían como un snapshot completo comprimido con gzip.
2. **Biblioteca global** (`/api/foods`): alimentos compartidos por todas las cuentas. Se suben los alimentos locales y luego se descarga la tabla global; la fusión conserva el `updatedAt` más reciente por ID.

- La app escribe primero en IndexedDB y notifica al coordinador correspondiente.
- `user_data.revision` implementa concurrencia optimista; un conflicto devuelve 409.
- Ante un conflicto de cuenta, el cliente descarga, une registros por ID eligiendo el `updatedAt` más reciente y reintenta.
- Los alimentos no viajan dentro del snapshot privado. Cualquier snapshot antiguo que todavía los incluya se migra automáticamente a la tabla global al leerlo o guardarlo.
- Si no hay red, los cambios quedan pendientes y se reintentan al reconectar, enfocar la app o periódicamente.
- El snapshot de cuenta se limita a 8 MB sin comprimir y 1,9 MB comprimido.
- Logout y “Borrar mis datos” requieren conexión para no dejar una sesión o copia huérfana. La biblioteca global se conserva.

### Modelo local

- `profiles`: perfil, color, metas y distribución porcentual opcional.
- `foods`: biblioteca global, valores por 100 g y `deletedAt` para borrado lógico.
- `meals`: bloques por perfil, orden y archivado lógico.
- `entries`: registros con fecha local, gramos y snapshot del alimento.
- `meta`: perfil activo y metadatos.
- `macrolog.sync` en localStorage: owner, revisión, estado pendiente y última sincronización de la cuenta.
- `macrolog.foods.sync` en localStorage: última sincronización de la biblioteca global.

### Modelo remoto en D1

- `users`: cuenta, email único y credenciales hasheadas.
- `sessions`: hashes de tokens, usuario y expiración.
- `user_data`: un snapshot gzip por cuenta, revisión y fecha. No contiene alimentos.
- `foods`: biblioteca global compartida, con `updated_at` y `deleted_at`.
- `auth_attempts`: ventanas de rate limiting.

Cada consulta de datos privados usa el `user.id` obtenido de la sesión; nunca se acepta un propietario enviado por el cliente. La biblioteca de alimentos es de lectura y escritura para cualquier cuenta autenticada, porque es global por diseño.

---

## Privacidad

- Sin analytics de terceros ni tracking publicitario.
- Los datos de la cuenta se guardan en Cloudflare D1 y se transmiten por HTTPS.
- Cada cuenta está aislada por sesión; un miembro de la familia no puede leer los perfiles ni registros de otro sin sus credenciales.
- La biblioteca de alimentos es global y compartida por diseño: no contiene datos personales, solo valores nutricionales.
- La copia local permite usar la app offline. Al cerrar sesión se borran perfiles y registros del dispositivo; la biblioteca global puede permanecer cacheada.
- El respaldo JSON sigue disponible para portabilidad y como copia independiente.
- No hay cifrado de extremo a extremo; Cloudflare cifra el almacenamiento de D1 en reposo según su plataforma.

---

## PWA y offline

- Manifest instalable con iconos normales y maskable.
- Service worker con precache del app shell y chunks de rutas.
- Fallback de navegación SPA para deep links.
- Actualización de versión: el botón activa el worker en espera, espera `controllerchange` y recarga.
- Tema aplicado antes del primer paint.
- Safe areas iOS y navegación inferior adaptada.
- Solicitud de almacenamiento persistente después del primer perfil.
- Una sesión previamente validada permite abrir la copia local sin conexión.

---

## Cloudflare

El deploy incluye el cliente estático y el Worker de API en el mismo proyecto.

```bash
npx wrangler login

# La base ya está creada en este proyecto.
npx wrangler d1 migrations apply macrolog-db --remote

# Código compartido para que se registre la familia.
npx wrangler secret put FAMILY_SIGNUP_CODE

npm run deploy
```

`wrangler.jsonc` configura:

- `main: worker/index.ts`
- `assets.directory: ./dist`
- `assets.not_found_handling: "single-page-application"`
- `assets.run_worker_first: ["/api/*"]`
- Binding D1 `DB`.
- Cabeceras CSP y cache en `public/_headers`.

Para Workers Builds:

- Build: `npm ci && npm run build`
- Deploy: `npx wrangler deploy`
- Configura `FAMILY_SIGNUP_CODE` como secreto del Worker.

---

## Testing y QA

```bash
npm test
npm run lint
npm run build
```

Los tests cubren nutrición, fechas locales, búsqueda, perfiles, snapshots, archivado, backups, distribuciones de macros, restauración, merge de snapshots en la nube y fusión de la biblioteca global con tombstones.

### Smoke test del deploy

```bash
export MACROLOG_FAMILY_CODE="tu-codigo-familiar"
npm run qa:deploy
```

El script crea una cuenta temporal, verifica registro/login, distribución automática de macros, sincronización, recarga de sesión, exportación, deep links, PWA offline, logout y login posterior. Además crea una segunda cuenta y comprueba que ve el alimento creado por la primera, validando la biblioteca global. Usa `playwright-core` con Chrome instalado.

---

## Decisiones de producto

- La **cuenta** es la persona; los **perfiles** son planes/etapas/clientes dentro de esa persona.
- La biblioteca de alimentos es **global**: se comparte entre todas las cuentas y todos los perfiles.
- Editar o eliminar un alimento afecta a toda la familia; los registros históricos conservan su snapshot.
- La unidad es gramos, sin tazas ni porciones.
- El peso es siempre en crudo y limpio.
- Los macros se calculan sin redondear y se formatean al mostrar.
- Las metas se calculan desde kcal + distribución porcentual o manualmente en gramos.
- Las fechas del diario son locales, nunca UTC.
- Los snapshots de alimento hacen inmutable el historial.
- La sincronización es last-write-wins por entidad y prioriza no perder información.

## Licencia

Proyecto privado de Leo Andrés. Todos los derechos reservados.

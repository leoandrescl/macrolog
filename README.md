# MacroLog

PWA local-first para registrar calorías y macronutrientes **gramo a gramo**, con perfiles independientes y una biblioteca de alimentos basada en valores **por 100 g en crudo y limpio**.

- Sin cuentas, sin servidores de datos y sin tracking.
- Funciona completamente offline.
- Optimizada para móvil, con layout adaptativo para tablet y escritorio.
- Lista para desplegar como sitio estático en Cloudflare Workers.

> Repositorio: [github.com/leoandrescl/macrolog](https://github.com/leoandrescl/macrolog)
> Demo: [macrolog.leoandrescl.workers.dev](https://macrolog.leoandrescl.workers.dev)

---

## Funcionalidades

### Perfiles

- Crear, editar, cambiar y eliminar perfiles locales.
- Meta diaria independiente por perfil: kcal, proteína, carbohidratos y grasa.
- **Distribuciones automáticas de macros** con presets de porcentajes: Equilibrado, Alta proteína, Rendimiento, Metabólico y Alta energía. Al cambiar las calorías se recalculan los gramos objetivo automáticamente.
- Opción **Manual** para ajustar los gramos de cada macro cuando se necesite. La distribución seleccionada se guarda con el perfil y se muestra en su tarjeta.
- Bloques de comida propios de cada perfil: desayuno, almuerzo, once, cena o bloques personalizados.
- Los bloques se pueden agregar, renombrar, reordenar y eliminar. Si un bloque tiene historial, se archiva para conservar los registros pasados.

### Biblioteca de alimentos

- Biblioteca compartida entre todos los perfiles del dispositivo.
- Valores por 100 g: kcal, proteína, carbohidratos y grasa.
- Búsqueda insensible a tildes y mayúsculas.
- Al registrar un alimento se guarda un snapshot: editar o eliminar el alimento no altera el historial.
- Regla estricta: todos los pesos son en crudo y sin cáscaras, huesos ni desperdicios.

### Diario

- Vista diaria con selector de fecha y retorno rápido a hoy.
- Registro por bloques de comida.
- Búsqueda rápida con alimentos recientes.
- Cantidad en gramos con presets, steppers y vista previa de macros en tiempo real.
- Edición de gramos y bloque, eliminación con opción de deshacer.
- Resumen con calorías restantes, macros restantes y estado de sobregiro.

### Datos

- Exportación e importación JSON de todos los perfiles, alimentos, bloques y registros.
- Store persistente request automático después del primer perfil.
- Borrado completo con confirmación.
- Tema oscuro por defecto y selector oscuro / claro / sistema.

---

## Stack

| Capa             | Tecnología                                    |
| ---------------- | --------------------------------------------- |
| UI               | React 19 + TypeScript                         |
| Build            | Vite 8                                        |
| Estilos          | Tailwind CSS 4 + design tokens CSS            |
| Datos locales    | Dexie 4 sobre IndexedDB                       |
| Routing          | React Router 8                                |
| Formularios      | React Hook Form + Zod 4                       |
| PWA              | vite-plugin-pwa 2 / Workbox                   |
| Fechas y números | Intl nativo                                   |
| Tests            | Vitest 5 + fake-indexeddb                     |
| Lint/format      | Biome 2                                       |
| Deploy           | Cloudflare Workers Static Assets + Wrangler 4 |

Sin componentes de UI pesados, sin librería de gráficos y sin dependencias de red en runtime. Los gráficos son SVG/CSS.

---

## Desarrollo

Requiere Node.js 20.19+ (probado con Node 24).

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

### Scripts

```bash
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve el build con soporte SPA
npm test           # tests con Vitest
npm run typecheck  # solo TypeScript
npm run lint       # Biome check
npm run format     # Biome format
npm run deploy     # build + deploy a Cloudflare Workers
```

---

## Arquitectura

```text
src/
├─ app/               # bootstrap, providers, router y shell
├─ components/        # primitives de UI y layout
├─ db/                # Dexie, esquema y repositorios
├─ features/          # diario, alimentos y perfiles
├─ hooks/             # hooks compartidos
├─ lib/               # nutrición, fechas, formato y validación
├─ pages/             # pantallas
├─ styles/            # tokens y CSS global
└─ types/             # modelo de dominio
```

### Modelo de datos

- `profiles`: perfil, color y metas diarias.
- `foods`: biblioteca global, valores por 100 g.
- `meals`: bloques por perfil, orden y archivado lógico.
- `entries`: registros del diario con `profileId`, `date` local, gramos y snapshot del alimento.
- `meta`: perfil activo y metadatos de la app.

Los IDs son UUID generados en cliente, y cada registro incluye `createdAt`/`updatedAt`. Esto deja preparado el modelo para una futura sincronización sin cambiar el dominio.

### Privacidad

El MVP es **local-first**: toda la información vive en IndexedDB dentro del navegador. Cloudflare solo entrega los archivos estáticos de la PWA. No hay endpoints de datos ni analytics de terceros. El respaldo JSON es la vía para mover información entre dispositivos.

Si se requiere sincronización multidispositivo o acceso de clientes desde otros teléfonos, se debe añadir una fase con Cloudflare Workers + D1 + autenticación. No forma parte de esta versión.

---

## PWA y offline

- Manifest instalable con iconos normales y maskable.
- Service worker con precache del app shell y de los chunks de rutas.
- Navegación SPA offline mediante fallback a `index.html`.
- Aviso de nueva versión con acción para actualizar.
- Tema aplicado antes del primer paint mediante `public/theme-init.js`.
- Safe areas de iOS y navegación inferior adaptada.
- El almacenamiento persistente se solicita automáticamente después del primer perfil.

**Importante:** los datos de un navegador pueden borrarse desde sus ajustes. Exporta respaldos periódicos desde Ajustes.

---

## Cloudflare Workers

El proyecto se despliega como assets estáticos, sin Worker script ni base de datos.

```bash
npx wrangler login
npm run deploy
```

`wrangler.jsonc` configura:

- `assets.directory = ./dist`
- `assets.not_found_handling = "single-page-application"` para rutas como `/diario/2026-11-01`.
- Cabeceras de seguridad y cache en `public/_headers`.

Para conectar el repositorio a Workers Builds, usa:

- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy`

También es compatible con Cloudflare Pages usando `dist` como output directory y una regla SPA; la configuración incluida prioriza Workers Static Assets.

### Variables y secretos

Ninguno. La app no realiza peticiones a APIs.

---

## Testing y QA

```bash
npm test
npm run lint
npm run build
```

Los tests cubren:

- Cálculos de porciones y macros.
- Fechas locales, cambios de día y DST.
- Búsqueda sin tildes.
- Creación de perfiles y bloques por defecto.
- Snapshots históricos al editar o eliminar alimentos.
- Archivado de bloques con historial.
- Borrado de perfiles en cascada.
- Round-trip de respaldo.
- Restauración de registros con “Deshacer”.

### QA visual y PWA

Hay dos scripts opcionales que usan `playwright-core` con Chrome instalado:

```bash
# con el servidor de desarrollo corriendo en :5173
node scripts/visual-check.mjs

# con el build de producción servido en :4173
npm run build
npm run preview -- --port 4173
node scripts/pwa-check.mjs

# smoke test contra el deploy de Cloudflare
npm run qa:deploy
```

Las capturas quedan en `.artifacts/` (ignorado por Git). El script de PWA verifica registro del service worker, recarga offline y navegación offline. El smoke test de deploy comprueba cabeceras CSP, registro de perfil, alta de alimento, registro en gramos, descarga de respaldo, deep links, service worker y recarga offline.

---

## Decisiones de producto

- Biblioteca de alimentos compartida entre perfiles; el diario y las metas son independientes.
- La unidad es siempre gramos, sin conversiones a tazas, unidades o porciones.
- El peso siempre representa alimento crudo y limpio.
- Los macros se calculan sin redondear y se formatean solo al mostrar.
- Las metas pueden calcularse desde calorías y una distribución porcentual (P/C/G) o definirse manualmente en gramos.
- Las fechas del diario usan fecha local, nunca UTC.
- Los registros guardan un snapshot para que el historial sea inmutable frente a cambios en la biblioteca.

## Licencia

Proyecto privado de Leo Andrés. Todos los derechos reservados.

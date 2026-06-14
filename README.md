# Portafolio — Andrés Galdino

Sitio personal de diseño de producto. Estático, sin frameworks ni bundler — HTML, CSS y JS vanilla.

**Dominio:** [andresgaldino.com](https://andresgaldino.com)

---

## Estructura de archivos

```
Portafolio final/
│
├── index.html                          # Home (depth 0) — hero cinematic + parallax + fluid ink WebGL
│
├── sitemap.xml                         # Sitemap XML para Googlebot y otros crawlers
├── robots.txt                          # Directivas para crawlers (incluye GPTBot, ClaudeBot, PerplexityBot)
├── llms.txt                            # Perfil en Markdown para modelos de lenguaje (estándar Answer.AI)
├── readme.html                         # Página pública de perfil — HTML semántico sin JS
│
├── components/
│   └── nav.html                        # Fragmento de nav inyectado vía fetch en todas las páginas
│
├── css/
│   ├── tokens.css                      # Design tokens (colores, tipografía, nav vars)
│   ├── main.css                        # Estilos globales compartidos + cursor
│   └── proyecto-page.css               # Layout de dos columnas para páginas de proyecto
│
├── js/
│   └── loader.js                       # Carga async de componentes + lógica completa del nav
│
├── paginas/                            # Profundidad 1
│   ├── sobre-mi.html
│   ├── proyectos.html                  # Galería de strips interactivos
│   ├── contacto.html
│   └── proyectos/                      # Profundidad 2
│       ├── universitario.html
│       ├── victoria-regia.html
│       ├── moda-week-international.html
│       ├── chiper.html
│       ├── dreams.html
│       ├── farmalaxia.html
│       └── museo.html
│
└── assets/                             # Imágenes, vídeos, favicon, og-image
```

---

## Cómo correr el proyecto

Abrir con **Live Server** (extensión VS Code). La URL base es `http://127.0.0.1:5500/`.

> El fetch de `components/nav.html` requiere protocolo HTTP. Abrir el HTML con `file://` rompe el nav — Live Server es obligatorio.

---

## SEO y descubribilidad para IA

### Archivos de infraestructura

| Archivo | Propósito |
|---|---|
| `sitemap.xml` | 12 URLs con prioridades y `lastmod` — para Googlebot y otros |
| `robots.txt` | Permite explícitamente: `Googlebot`, `GPTBot`, `ClaudeBot`, `PerplexityBot`, `CCBot`, `Google-Extended` |
| `llms.txt` | Perfil estructurado en Markdown para que modelos de lenguaje indexen la identidad y trabajo de Andrés |
| `readme.html` | Página pública de perfil semántica — sin JS, sin animaciones, accesible para scrapers |

### JSON-LD (Schema.org Person)

Inyectado en `<head>` de `index.html` y `paginas/sobre-mi.html`. Contiene nombre, rol, ubicación, idiomas, URLs canónicas de RRSS y email de contacto.

### Open Graph

Todas las páginas tienen `og:title`, `og:description`, `og:image`, `og:url` apuntando a:
- Imagen: `/assets/og-image.png`
- Dominio canonical: `https://andresgaldino.com`

---

## Arquitectura CSS

### Cascada de tres capas

```
tokens.css          →  variables CSS (:root)
main.css            →  reset, cursor, utilidades, #nav-container min-height
proyecto-page.css   →  layout de páginas de proyecto (importado solo en ellas)
<style> inline      →  overrides mínimos por página (solo cuando los valores difieren del default)
```

### tokens.css

Define todas las variables globales:

| Variable | Uso |
|---|---|
| `--font` | `'Poppins', system-ui, sans-serif` |
| `--nh` | Altura del nav: `44px` |
| `--nbg` / `--ndbg` | Fondo del nav y dropdown |
| `--nfg` / `--nmuted` | Colores de texto del nav |
| `--nblur` | `blur(24px) saturate(180%)` — backdrop del nav |
| `--nbdr` | Borde inferior del nav |
| `--text` / `--muted` | Colores de texto de páginas |

`html.dark-hero` sobreescribe `--text` para páginas con hero oscuro.

### main.css

- Reset universal (`box-sizing`, `margin`, `padding`)
- Cursor personalizado `.cursor` + `.cursor.big` — `mix-blend-mode: multiply`
- `cursor: none` en `button`, `a` (solo `@media (pointer: fine)`)
- `.page-content` — padding-top para compensar el nav fijo
- `#nav-container { min-height: var(--nh, 44px) }` — reserva espacio antes del fetch para evitar layout shift (CLS)

### proyecto-page.css

Layout de dos columnas: panel izquierdo `.vr-info` (texto) + panel derecho `.vr-video-panel` (vídeo). Usado por todos los proyectos individuales excepto `museo.html`.

---

## Sistema de inyección de componentes (loader.js)

El nav se define una sola vez en `components/nav.html` y se inyecta en cada página con `fetch()`.

### Flujo de carga

```
1. HTML de la página se parsea → <div id="nav-container"></div> existe pero está vacío
   → main.css ya reservó su altura (min-height: 44px) — sin layout shift

2. loader.js ejecuta arrancarLoader()
   → calcula la ruta relativa con resolveRoot() según el meta[name="base-depth"]
   → llama loadComponent('nav-container', '../components/nav.html', initNav)

3. fetch() trae nav.html
   → el bloque <style> se extrae y se inyecta en <head> UNA SOLA VEZ (_injectedStyles cache)
   → el HTML restante se inyecta en #nav-container via innerHTML

4. initNav() se ejecuta como callback onReady
   → vincula toda la lógica del nav
   → dispatch('navReady') para que páginas como proyectos.html sepan que el nav está listo

5. CustomEvent 'navReady' dispara callbacks dependientes (ej: bindHover en proyectos.html)
```

### Resolución de rutas (resolveRoot)

Cada HTML tiene `<meta name="base-depth" content="N">`:

| Archivo | depth | Ruta nav |
|---|---|---|
| `index.html` | `0` | `components/nav.html` |
| `paginas/*.html` | `1` | `../components/nav.html` |
| `paginas/proyectos/*.html` | `2` | `../../components/nav.html` |

`patchNavLinks()` convierte todos los `href="/..."` absolutos del nav a rutas relativas, necesario para servir desde `file://` o rutas no-root.

---

## Lógica del nav (initNav)

### Event delegation

Todos los clicks del nav se manejan con **un solo listener en `document.body`**, no con listeners directos en cada botón. Esto es necesario porque el nav se inyecta de forma asíncrona.

```js
document.body.addEventListener('click', function (e) {
  var t = e.target;
  if (t.closest('#cnSBtn'))       → openSearch / closeSearch
  if (t.closest('#cnHam'))        → openMob / closeMob
  if (t.closest('#cnMobProyBtn')) → openAcc / closeAcc
  if (t.closest('#cnSPCls'))      → closeSearch
  // Outside-click detection:
  if (spOpen  && !sp.contains(t))         → closeSearch
  if (mobOpen && !mob.contains(t) && ...) → closeMob
});
```

### Overlay fx

Un `<div>` creado desde JS (backdrop blur + semi-opaco) se monta en `document.body` con `z-index: 896`. El nav tiene `z-index: 900`, así el nav queda por encima y sigue recibiendo clicks aunque el overlay esté activo.

---

## Hero de index.html — componentes principales

### Cinema letterbox

Video de introducción (`heroVideo`) que se reproduce una sola vez al cargar. El evento `ended` dispara el dismiss del modo cinema. Atributos requeridos: `autoplay muted playsinline preload="auto"` — sin `loop`.

### Fluid ink (WebGL)

Dos instancias de simulación de fluidos:
- **Hero ink** — tinta negra sobre fondo oscuro
- **inkSection ink** — tinta blanca; el texto superpuesto usa `mix-blend-mode: difference` intencionalmente — cuando la tinta oscura pasa debajo del texto blanco, el blend invierte el color haciéndolo legible

> **Regla crítica de WebGL:** `Material.setKeywords()` debe llamarse **antes** de `Material.bind()`. Si el orden se invierte, `activeProgram` es `null` en el primer frame y los uniforms fallan con `INVALID_OPERATION`.

### Parallax scroll

Driver en `index.html` (aprox. líneas 1362–1458). Usa `window.scrollY` + `requestAnimationFrame` para animar `svVideo`. Requiere que `overscroll-behavior-y: none` esté en `html` (no en `body`) — Chrome deja de actualizar `window.scrollY` si la propiedad está en `body`.

```css
/* index.html — inline style */
html { overscroll-behavior-y: none; }
```

---

## Estrategia de vídeo por página

| Página | Vídeo | Atributos | Razón |
|---|---|---|---|
| `index.html` | heroVideo | `autoplay muted playsinline preload="auto"` | Cinema intro — sin loop |
| `index.html` | svVideo | `muted playsinline preload="auto"` | Controlado por scroll — sin autoplay |
| `universitario.html` | lumi.mov | `autoplay muted loop playsinline` | Audio embebido pero es animación de fondo — muted para autoplay iOS |
| `victoria-regia.html` | — | `controls loop playsinline preload="auto"` | Audio intencional — usuario controla playback |
| `moda-week-international.html` | — | `controls loop playsinline preload="auto"` | Audio intencional |
| `chiper.html` | chiper.MOV | `controls loop playsinline` | Audio intencional |
| `chiper.html` | marquilla.mov | `controls loop playsinline` | Audio intencional |
| `farmalaxia.html` | — | `controls loop playsinline` | Audio intencional |

**Regla iOS autoplay:** solo `muted + playsinline` permite reproducción automática. Videos con audio requieren `controls` para que el usuario inicie la reproducción manualmente.

---

## Mobile polish

- `overscroll-behavior-y: none` en `html` — elimina el elastic bounce de iOS sin romper el parallax en desktop
- `contacto.html` usa `min-height: 100svh` (Small Viewport Height) para compensar el chrome del navegador móvil
- Cursor personalizado desactivado en `@media (pointer: coarse)` — no aparece en táctil
- Hover states protegidos con `@media (hover: hover)` donde aplica

---

## Bug de Live Server + SVG — Causa raíz y solución

Live Server inyecta su script de live-reload dentro de los elementos `<svg>` cuando el archivo HTML no tiene `</body>`. `nav.html` tiene dos SVG inline → dos inyecciones → `Content-Length` incorrecto → el archivo llega truncado al navegador.

**Síntomas:** `document.getElementById('cnSP')` → `null`, menú móvil incompleto.

**Solución permanente:** `</body>` al final de `components/nav.html` — Live Server lo usa como punto de inyección. El navegador ignora el tag huérfano al parsear con `innerHTML`.

**Defensa en JS:** `initNav()` crea el panel de búsqueda y las filas faltantes dinámicamente si no los encuentra en el DOM.

---

## Páginas de proyecto: convención de estructura

```html
<head>
  <meta name="base-depth" content="2">
  <link rel="stylesheet" href="../../css/tokens.css">
  <link rel="stylesheet" href="../../css/main.css">
  <link rel="stylesheet" href="../../css/proyecto-page.css">
  <style>
    /* Solo overrides específicos de esta página */
    .vr-title { font-size: clamp(42px, 4.8vw, 72px); }
  </style>
</head>
<body>
  <div id="nav-container"></div>
  <div class="cursor" id="cursor" aria-hidden="true"></div>
  <!-- contenido -->
  <script src="../../js/loader.js"></script>
</body>
```

---

## Agregar una nueva página de proyecto

1. Duplicar cualquier `paginas/proyectos/*.html` existente
2. Actualizar `meta[name="base-depth"]` a `2`
3. Añadir la entrada en el array `PAGES` en `js/loader.js` (buscador)
4. Añadir el link en `components/nav.html` — dropdown desktop y menú móvil
5. Añadir la URL en `sitemap.xml`
6. Si el título o tagline difiere del default, añadir un `<style>` inline mínimo

---

## Notas de producción

- Las rutas de `href` en `nav.html` usan `/` absolutos. `patchNavLinks()` las convierte a relativas automáticamente en desarrollo local. Con dominio propio en producción funcionan directamente.
- El cursor personalizado está desactivado en `@media (pointer: coarse)` (móvil/táctil).
- `mix-blend-mode: difference` en el cursor de páginas oscuras requiere que `.cursor` esté fuera del `#nav-container` en el DOM.
- El error de consola `Permissions-Policy: browsing-topics` es un header del servidor de GitHub Pages — no es un error de código y no afecta funcionalidad ni SEO.

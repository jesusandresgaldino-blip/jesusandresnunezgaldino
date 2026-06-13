# Portafolio — Andrés Galdino

Portfolio personal de diseño. Sitio estático sin frameworks ni bundler — HTML, CSS y JS vanilla.

---

## Estructura de archivos

```
Portafolio final/
│
├── index.html                          # Home (depth 0)
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
- `#nav-container { min-height: var(--nh, 44px) }` — **reserva espacio antes del fetch** para evitar layout shift (CLS)

### proyecto-page.css

Layout de dos columnas: panel izquierdo `.vr-info` (texto) + panel derecho `.vr-video-panel` (vídeo). Usado por todos los proyectos individuales excepto `museo.html`.

Cada página de proyecto solo incluye un `<style>` mínimo si necesita sobreescribir valores como `font-size` del título o propiedades de un tagline específico.

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

Todos los clicks del nav se manejan con **un solo listener en `document.body`**, no con listeners directos en cada botón. Esto es necesario porque el nav se inyecta de forma asíncrona — si se vincularan listeners directos justo después del fetch, podrían fallar si el DOM no había terminado de actualizarse.

```js
document.body.addEventListener('click', function (e) {
  var t = e.target;
  if (t.closest('#cnSBtn'))       → openSearch / closeSearch
  if (t.closest('#cnHam'))        → openMob / closeMob
  if (t.closest('#cnMobProyBtn')) → openAcc / closeAcc
  if (t.closest('#cnSPCls'))      → closeSearch
  // Outside-click detection:
  if (spOpen  && !sp.contains(t))              → closeSearch
  if (mobOpen && !mob.contains(t) && ...)      → closeMob
});
```

### Overlay fx

Un `<div>` creado desde JS (backdrop blur + semi-opaco) se monta en `document.body` con `z-index: 896`. El nav tiene `z-index: 900`, así el nav queda por encima y sigue recibiendo clicks aunque el overlay esté activo.

### Clases CSS del menú móvil

El menú móvil usa `is-open` en **dos** elementos simultáneamente:
- `ham.classList.add('is-open')` → anima las barras del hamburger a ×
- `mob.classList.add('is-open')` → dispara la animación `cnMobIn` en las filas (`.cn-mob.is-open .cn-mob-row`)

Sin la clase en `mob`, las filas permanecen invisibles (`opacity: 0` en el CSS base).

---

## Bug de Live Server + SVG — Causa raíz y solución

### El problema

Live Server (extensión VS Code) inyecta su script de live-reload dentro de los elementos `<svg>` cuando el archivo HTML no tiene `</body>`. Esto pasa porque:

1. Live Server busca `</body>` para inyectar su script
2. Si no lo encuentra, activa el modo "SVG support" y lo inyecta dentro de cada `<svg>` con comentarios CDATA
3. `nav.html` tiene dos SVG inline (ícono de búsqueda y chevron) → **dos inyecciones**
4. Live Server calcula `Content-Length` asumiendo **una** sola inyección: `file_size + 1493 = 14235` bytes
5. El cliente HTTP para de leer al llegar a `Content-Length` bytes
6. El archivo queda truncado **antes** de llegar al panel de búsqueda `#cnSP` y a las filas Perfil/Contacto del menú móvil

### Síntomas

- `document.getElementById('cnSP')` → `null`
- Menú móvil: solo muestra "Inicio" y "Proyectos" (los primeros ítems antes del primer SVG inyectado)
- Lupa visible en la barra pero sin reacción al hacer click
- `Content-Length: 14235` pero el archivo en disco mide 12742 bytes

### Solución permanente

Se añadió `</body>` al final de `components/nav.html`. Live Server encuentra ese tag y **redirige la inyección ahí**, en lugar de dentro de los SVG. El navegador ignora el `</body>` huérfano al parsear el fragmento con `innerHTML`.

### Solución de defensa en JS (loader.js)

Para cubrir cualquier futura regresión, `initNav()` crea el panel de búsqueda y las filas del menú **dinámicamente** si no los encuentra en el DOM:

```js
// Si #cnSP no llegó, se crea desde JS
if (!sp) {
  sp = document.createElement('div');
  sp.id = 'cnSP'; sp.className = 'cn-sp';
  sp.innerHTML = /* HTML del panel */;
  document.body.appendChild(sp);
}

// Si faltan Perfil/Contacto en el menú móvil, se añaden
if (!mob.querySelector('a[href*="sobre-mi"]')) { /* añadir fila */ }
if (!mob.querySelector('a[href*="contacto"]')) { /* añadir fila */ }
```

El CSS de `.cn-sp` ya está disponible porque llega en el bloque `<style>` del nav, que se inyecta antes del truncamiento.

---

## Páginas de proyecto: convención de estructura

```html
<head>
  <meta name="base-depth" content="2">
  <link rel="stylesheet" href="../../css/tokens.css">
  <link rel="stylesheet" href="../../css/main.css">
  <link rel="stylesheet" href="../../css/proyecto-page.css">
  <style>
    /* Solo overrides específicos de esta página — fuera del default */
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

Regla: si la página usa los valores default de `proyecto-page.css`, el `<style>` inline se omite completamente.

---

## Agregar una nueva página de proyecto

1. Duplicar cualquier `paginas/proyectos/*.html` existente
2. Actualizar `meta[name="base-depth"]` (value `2` para páginas en `proyectos/`)
3. Añadir la entrada en el array `PAGES` en `js/loader.js` (para que aparezca en el buscador)
4. Añadir el link en el dropdown del nav en `components/nav.html` y en el menú móvil
5. Si el título o tagline difiere del default, añadir un `<style>` inline mínimo

---

## Consideraciones para producción

- `fetch()` con `cache: 'no-store'` y `?_=Date.now()` en la URL — asegura que nunca se sirva un nav cacheado. Considerar cambiar a `cache: 'default'` con versionado de archivos (`nav.v2.html`) en producción.
- Las rutas de `href` en `nav.html` usan `/` absolutos. `patchNavLinks()` las convierte a relativas automáticamente para desarrollo local. En producción con dominio propio las absolutas funcionan directamente.
- El cursor personalizado está desactivado en `@media (pointer: coarse)` (móvil/táctil).
- `mix-blend-mode: difference` en el cursor blanco de páginas oscuras requiere que el elemento `.cursor` esté fuera del `#nav-container` en el DOM.

# Auditoría de Código — Portafolio Andrés Galdino
**Fecha:** 2026-06-14 · **Modo:** Solo lectura — cero cambios aplicados  
**Revisado por:** Claude Sonnet 4.6 (Senior Frontend + UX/UI Architect role)

---

## Archivos Críticos que Controlan Animaciones, Parallax y Videos

Antes de tocar cualquier cosa, ten claro qué archivo controla qué:

| Archivo | Controla | Riesgo si se toca |
|---|---|---|
| `index.html` (líneas 626–897) | Hero parallax, dot-grid canvas, FuzzyText canvas | ALTO — tres sistemas entrelazados en un solo scope |
| `index.html` (líneas 900–1257) | Fluid WebGL (tinta oscura del hero) | MUY ALTO — 350+ líneas de WebGL puro; un error rompe el efecto |
| `index.html` (líneas 1327–1425) | Scroll-cinematic video driver (parallax por scroll) | ALTO — `#svVideo`, `#svScene`, `CHAPTERS`, `tick()` |
| `index.html` (líneas 1428–1610) | Fluid WebGL (tinta blanca del inkSection) | MUY ALTO — segunda instancia del motor WebGL |
| `index.html` (líneas 1259–1325) | Cinema letterbox intro handler | MEDIO — controla cuándo aparece el hero |
| `js/loader.js` | Nav inyectado vía fetch + buscador funcional | MEDIO — fallo aquí = nav no aparece en ninguna página |
| `components/nav.html` | Estructura del nav, dropdown, menú móvil | MEDIO — CSS inline + HTML del nav en un solo archivo |
| `css/tokens.css` | Variables globales de color, tipografía, nav | ALTO — un cambio de variable afecta todo el sitio |
| `css/main.css` | Reset, cursor personalizado, utilidades globales | MEDIO |
| `css/proyecto-page.css` | Layout compartido de páginas de proyecto | BAJO — solo afecta páginas de proyecto |

---

## BLOQUE 1 — Funcionalidad Crítica y Mobile

### 1.1 Videos iOS — Atributos playsinline / muted / autoplay

#### Revisión completa de etiquetas `<video>`

| Video | Archivo | autoplay | muted | playsinline | loop | Riesgo |
|---|---|---|---|---|---|---|
| `#heroVideo` (videohero.mp4) | index.html:498 | ✅ | ✅ | ✅ | — | Sin riesgo |
| `#svVideo` (parallax.mp4) | index.html:539 | ❌ | ✅ | ✅ | — | Bajo (controlado por JS) |
| Trailer moda-week (amazonas-fashion-week-trailer.mp4) | moda-week-international.html:283 | ✅ | ❌ **AUSENTE** | ✅ | ✅ | **CRÍTICO** |
| Trailer victoria-regia (victoria-regia-trailer.mp4) | victoria-regia.html:279 | ✅ | ❌ **AUSENTE** | ✅ | ✅ | **CRÍTICO** |
| chiper.MOV | chiper.html:1701 | ✅ | ✅ | ✅ | ✅ | Formato MOV ⚠️ |
| marquilla.MOV | chiper.html:2178 | ✅ | ✅ | ✅ | — | Formato MOV ⚠️ |
| Farmalaxia video | farmalaxia.html:1289 | ✅ | ✅ | ✅ | ✅ | Sin riesgo |
| lumi.mov | universitario.html:1565 | ✅ | ✅ | ✅ | — | Formato MOV ⚠️ |

#### Hallazgos críticos

**CRÍTICO — Muted ausente en dos videos de proyecto**  
`moda-week-international.html:283` y `victoria-regia.html:279` tienen `autoplay` pero **no tienen `muted`**.  
Safari iOS y Chrome en Android bloquean autoplay de video con audio por política del navegador.  
**Resultado en producción**: el video no se reproduce, la sección de portada queda en negro.  
Riesgo de tocarlo: BAJO. Solo hay que añadir el atributo `muted`.

**ADVERTENCIA — Archivos .MOV / .mov**  
`chiper.MOV`, `marquilla.MOV` y `lumi.mov` son contenedores QuickTime.  
Safari en iOS/macOS los reproduce sin problema. Android Chrome y Firefox **no los garantizan** — pueden mostrar error o reproductor en blanco.  
Los archivos físicos existen en `/assets/chiper/` y `/assets/lumi/`.  
Riesgo de convertirlos: BAJO en producción final, pero requiere reencoder a MP4 con H.264 sin tocar el código.

**NOTA — `#svVideo` sin autoplay (scroll video)**  
No es un error. El parallax de scroll controla `currentTime` via JS, no reproduce el video. La línea `vid.addEventListener('play', function() { vid.pause(); });` en index.html:1338-1340 fuerza la pausa intencional. El `#t=0.001` en el `src` es una técnica para forzar renderizado del primer frame en WebKit sin autoplay — funciona en Safari pero **no está soportado universalmente** como fragment URI en todos los navegadores. Si el primer frame no se muestra en Android, puede quedar en negro.

---

### 1.2 Mobile Landscape & Z-Index

#### Mapa del Stacking Context (index.html)

| Elemento | Z-Index | Tipo | Riesgo |
|---|---|---|---|
| Fluid WebGL canvas (hero) | 2 | fixed | Bajo el nav ✅ |
| `#dot-grid` | 3 | fixed | Bajo el nav ✅ |
| `#svSticky` (scroll video) | 3 | fixed | Bajo el nav ✅ |
| `.hero` | 4 | relative | Bajo el nav ✅ |
| `#svText` (overlays de texto) | 5 | absolute | Bajo el nav ✅ |
| `#svProgress` (dots) | 6 | absolute | Bajo el nav ✅ |
| `#inkSection` | 10 | relative | Bajo el nav ✅ |
| `#cinemaWrap` (intro) | 500 | fixed | Solo durante intro → luego `display:none` ✅ |
| `.cn` (nav) | **900** | fixed | Siempre encima de todo ✅ |
| `.cn-sp` (búsqueda) | 901 | fixed | Por encima del nav ✅ |
| `.cursor` | 99999 | fixed | Último en el stack ✅ |

**El nav nunca queda oculto tras videos o efectos.** El stacking context está bien diseñado.

#### Landscape en `sobre-mi.html`

**ADVERTENCIA — Layout fixed sin media query de landscape**  
`sobre-mi.html` usa `position:fixed; inset:0; top:var(--nh)` para el `.page-wrap` y `overflow:hidden` en `html,body`.  
En iPhone SE (568×320 landscape), el layout queda con ~276px de altura útil.  
El panel de contenido tiene `padding:28px 32px` que consume 56px verticales solo de padding — queda muy poco espacio para el contenido antes de hacer scroll.  
No existe ningún `@media (orientation: landscape)` en esta página.  
Riesgo de tocar: MEDIO. Añadir `padding` reducido en landscape no afecta animaciones.

#### Landscape en `index.html`

La sección `.hero` tiene `min-height:100vh; max-height:100vh; overflow:hidden`.  
En landscape en mobile, `100vh` puede ser la altura del viewport con la barra de herramientas del navegador visible, causando que los botones CTA queden cortados. No hay `@media (orientation:landscape)` aquí tampoco.

---

### 1.3 Ergonomía Táctil — Touch Targets < 44×44px

La guía de Apple HIG y Material Design establece 44×44px como mínimo táctil. Estos elementos no lo cumplen:

| Elemento | Selector | Tamaño real | Problema |
|---|---|---|---|
| Botón "Omitir intro" | `#skipBtn` | ~29px altura (padding: 9px + 11px font) | **Difícil de tocar en iOS** |
| Logo del nav | `.cn-logo` | 28×28px | **< 44×44px** |
| Botón hamburguesa | `.cn-ham` | ~36px (padding:8px + 20px ícono) | Borderline — debería tener 44px mínimo |
| Sidebar icons (sobre-mi) | `.sb-icon`, `.sb-toggle` | 38×38px | **6px bajo el mínimo** |
| Botón cerrar sidebar | `.sb-close-btn` | 26×26px | **CRÍTICO — muy pequeño** |
| Íconos sociales (contacto) | `.pc-soc` | ~18×18px (SVG sin área táctil) | **CRÍTICO — prácticamente invisible** |
| Botón contactar (contacto) | `.pc-btn` | ~31px altura (padding: 9px top/bottom) | **< 44px** |

**Recomendación de intervención**: Los elementos de contacto son el único CTA de conversión. El `.pc-soc` con solo 18px es prácticamente imposible de tocar con precisión en mobile. Añadir `min-width: 44px; min-height: 44px` a `.pc-soc` con `display:flex; align-items:center; justify-content:center` es seguro y no rompe nada.

---

## BLOQUE 2 — UX, Performance y Optimización

### 2.1 Hover Fantasma — Selectores `:hover` sin `@media (hover: hover)`

En táctil, el primer tap activa `:hover` que queda "pegado" visualmente hasta que el usuario interactúa con otro elemento. Esto es especialmente molesto con `transform:translateY(-3px)` porque las cards se mueven al tocar.

#### Selectores afectados (no encapsulados en media query):

**index.html (inline `<style>`):**
- `#skipBtn:hover` → línea 77
- `.btn-dark:hover` → línea 144
- `.btn-light:hover` → línea 153

**sobre-mi.html (inline `<style>`):**
- `.sb-toggle:hover, .sb-icon:hover` → línea 24
- `.sb-close-btn:hover` → línea 35
- `.sb-item:hover` → línea 37
- `.card:hover` → línea 55 — **VISIBLE**: desplaza la card 3px en táctil
- `.hero-card:hover .hero-img-slot img` → línea 66 — Zoom en imagen al tocar
- `.tl-entry:hover .tl-dot` → línea 82
- `.swatch:hover` → línea 95
- `.hobby-card:hover .hobby-img img` → línea 99 — Zoom en imagen al tocar
- `.lang-card:hover .lang-img img` → línea 115
- `.skill-tag:hover` → línea 128 — Cambia de color al tocar
- `.proc-card:hover .proc-num` → línea 132
- `.exp-role-item:hover` → línea 155

**contacto.html (inline `<style>`):**
- `.pc-soc:hover` → línea 154
- `.pc-btn:hover` → línea 164

**components/nav.html:**
- `.cn-item:hover>.cn-btn` → Sin media query pero el nav desktop se oculta en mobile
- `.cn-item:hover>.cn-drop` → Dropdown de desktop — en táctil esta interacción no ocurre gracias a `display:none!important` del `.cn-list` en mobile ✅ (riesgo bajo)

**css/proyecto-page.css:**
- `.tool-pill:hover` → línea 96
- `.btn-primary:hover` → línea 109
- `.btn-secondary:hover` → línea 123
- `.ctrl-btn:hover` → línea 151

**Patrón de corrección (sin riesgo para las animaciones):**
```css
/* ANTES — problemático en táctil */
.card:hover { transform: translateY(-3px); }

/* DESPUÉS — solo en dispositivos con mouse real */
@media (hover: hover) {
  .card:hover { transform: translateY(-3px); }
}
```

---

### 2.2 Limpieza de DOM — Divitis y Código Duplicado

#### Motor WebGL duplicado (riesgo al tocar: MUY ALTO)

El motor de simulación de fluido WebGL está implementado **dos veces** en `index.html`:
1. Primera instancia: líneas 900–1257 (hero, tinta oscura, `mix-blend-mode:screen`)
2. Segunda instancia: líneas 1428–1610 (inkSection, tinta blanca, `mix-blend-mode:normal`)

Ambas instancias son casi idénticas (~350 líneas cada una). La diferencia es el color generado (`generateColor()` vs `genColor()`) y los parámetros de configuración.

**Riesgo de refactorizar**: MUY ALTO. Son dos contextos WebGL independientes con sus propios FBOs, shaders compilados y loops de animación. No se deben tocar sin pruebas exhaustivas. La duplicación es intencional para mantener independencia entre instancias.

#### CSS completamente inline

Todo el CSS de `sobre-mi.html` (302 líneas minificadas) está dentro de un `<style>` en el `<head>`. Esto:
- Aumenta el tamaño HTML
- Impide el caching del CSS
- Dificulta el mantenimiento

Riesgo de moverlo a un archivo externo: MEDIO (no afecta animaciones, sí requiere ajustar la ruta).

#### `cache: 'no-store'` en el loader del nav

`js/loader.js:38` hace `fetch(path + '?_=' + Date.now(), { cache: 'no-store' })`.  
Esto fuerza una descarga fresca del `nav.html` en cada carga de página, sin ningún beneficio de HTTP cache.  
El parámetro `?_=Date.now()` ya bustaría el cache si estuviese activado. El `no-store` es redundante y empeora el LCP (Largest Contentful Paint).  
**Riesgo de tocar**: BAJO. Solo hay que quitar `{ cache: 'no-store' }` del fetch.

---

### 2.3 Assets y Carga

#### og:image — AUSENTE (impacto crítico en marketing)

`/assets/og-image.jpg` **no existe**. El archivo físico es `og-image.jpg.txt` (un archivo de texto con instrucciones).  
Todas las páginas referencian `/assets/og-image.jpg`. Al compartir el sitio en LinkedIn, Twitter, WhatsApp o Slack, el preview de imagen estará **completamente roto**.  
Este es el error de mayor impacto visible para un portafolio profesional.

#### Formatos de imagen

| Tipo | Estado | Archivos afectados |
|---|---|---|
| Thumbnails de proyectos | ✅ WebP | `proj-01-*.webp` a `proj-07-*.webp` |
| Imagen de perfil (sobre-mi) | ✅ WebP | `perfil1.webp` |
| Foto de contacto | ❌ JPG | `profile.jpg` |
| Fondo de contacto | ❌ JPG | `contact-bg.jpg` — usada con `background:fixed`, carga completa siempre |
| Assets de Chiper | ❌ PNG/JPG | `catalogo.png`, `chiper.jpg`, `pepsi.jpg`, `logochiper.png` |
| Assets de Farmalaxia | ❌ PNG/JPG | `colores.jpg`, `feed.jpg`, `1-4.png`, `logo azul.png` |
| Assets de Lumi | ❌ PNG/JPG | `buho.png`, `ciervo.png`, `portada.png`, múltiples card `.jpg` |
| Hobbies (físicos en disco) | ❌ JPG | Archivos de Unsplash con nombre largo |

#### Preload de video — consumo de datos

`svVideo` y los videos de proyecto usan `preload="auto"`. En mobile, esto fuerza al navegador a descargar el video entero en background. Podría representar 30-50MB de descarga silenciosa.  
Recomendación: `preload="metadata"` en páginas con varios videos pesados.

#### Imágenes sin lazy loading (sobre-mi)

Imágenes que se cargan siempre aunque no estén en viewport inicial:
- Todos los logos de herramientas: `figma.svg`, `illustrator.svg`, `notion-icon.svg`, `vscode.svg`, `claude.svg`, `chatgpt.svg`, `gemini.svg`, `unity.svg` — Son SVG pequeños, impacto bajo pero pueden añadir `loading="lazy"`.
- Logos de inspiración: `apple.svg`, `adidas.svg`, `netflix.svg`, `nike.svg` — Mismo caso.
- Logos de experiencia: `victoria-regia.svg`, `chiperos.svg`, `modaweek.svg`

---

### 2.4 Tipografía y Estilos

#### FOUT — Flash of Unstyled Text

Las fuentes se cargan con `display=swap` (Google Fonts). Esto previene texto invisible pero produce un flash visible de fuente de sistema antes de que cargue Poppins.  
El canvas de FuzzyText (`#heroName`) usa `document.fonts.load()` en index.html:890 para esperar a Poppins antes de dibujar — eso está bien. Pero el texto en el resto del hero (`hero-sub`, botones CTA) puede flashear si la red es lenta.

**No hay `<link rel="preload">` para la fuente** en ninguna página excepto `sobre-mi.html` (que preloads la imagen de perfil, no la fuente). El preconnect es correcto pero el preload de la fuente principal podría mejorar el LCP.

#### Espaciado hardcoded — Sistema de escala ausente

`tokens.css` solo define tokens de color, tipografía base y nav. No hay sistema de escala de espaciado.  
Resultado: cada componente define sus propios valores de `padding`, `margin`, `gap`, `font-size` y `border-radius`. Ejemplos encontrados:

- `padding: 9px 18px` (skipBtn), `padding: 12px 28px` (btn-dark), `padding: 9px 16px` (pc-btn) — tres paddings distintos para botones similares
- `border-radius: 100px` (skipBtn), `border-radius: var(--pill)` (btn-dark), `border-radius: 999px` (pc-btn) — tres formas de escribir el mismo pill
- `font-size: 11px` (skipBtn tag), `font-size: 10px` (cn-lbl), `font-size: 10px` (skill-tag)

Para v1 esto es aceptable. Para v2 se recomienda escala tipográfica tokenizada.

---

## BLOQUE 3 — Calidad de Contenido y SEO

### 3.1 SEO y Metadatos

#### Open Graph — estado por página

| Página | og:type | og:title | og:description | og:url | og:image | twitter:card |
|---|---|---|---|---|---|---|
| `index.html` | ✅ | ✅ | ✅ | ✅ | ❌ (archivo roto) | ✅ |
| `sobre-mi.html` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `proyectos.html` | ❌ | ✅ | ❌ | ❌ | ❌ (roto) | ✅ |
| `contacto.html` | ❌ | ✅ | ❌ | ❌ | ❌ (roto) | ✅ |

`sobre-mi.html` **no tiene ningún meta OG**. Si alguien comparte tu página de Perfil en LinkedIn, aparecerá sin título, sin imagen y sin descripción.

#### Jerarquía de encabezados

| Página | H1 | H2 | H3 | Problema |
|---|---|---|---|---|
| `index.html` | ❌ Ausente | ✅ 5 h2 en scrollVideo | — | El nombre "Andrés Galdino" está en un `<canvas>`, invisible para crawlers |
| `sobre-mi.html` | ❌ Ausente | ❌ Ausente | ❌ Ausente | Toda la estructura semántica son `<div>` con clases `.ph-title` |
| `proyectos.html` | ❌ Ausente | ✅ 7 h2 strip-title | — | Sin contexto de H1 para los crawlers |
| `contacto.html` | ❌ Ausente | ❌ Ausente | ❌ Ausente | Nombre en `<div class="pc-name">` |

**Impacto SEO**: Google usa el H1 como señal principal de relevancia de página. Ninguna página del portafolio tiene H1. Para un portfolio que quiere aparecer en búsquedas de "Designer Colombia" o "Andrés Galdino designer", esto es un obstáculo.

**Solución de bajo riesgo**: Añadir H1 visualmente oculto (`.sr-only`) en cada página no afecta ninguna animación ni layout visual.

#### Canonical ausente

Ninguna página tiene `<link rel="canonical">`. Si el sitio es accesible tanto en `https://andres-galdino.com/` como en `https://www.andres-galdino.com/`, los motores pueden indexarlos como contenido duplicado y dividir el page rank.

---

### 3.2 Humanización del Copy

#### Textos que funcionan — voz auténtica

Estos textos son sólidos y deben conservarse:
- **Bio card**: "Crecí entre planos y maquetas..." — Personal, concreto, memorable.
- **Mantra**: "Prefiero rehacerlo cien veces antes que entregar algo que no se siente exactamente como debería." — Honesto, no corporativo.
- **Cita hero ink**: "Todo gran diseño empieza con el valor de no saber qué vas a crear." — Original y relevante para el perfil.
- **Filosofía 01**: "Antes de abrir Figma, cierro la boca." — La mejor línea del sitio.
- **scrollVideo chapters**: "Interfaces que desaparecen", "La historia detrás de cada pieza" — Copy de calidad publicitaria.

#### Textos que deben refinarse

**Contacto — `pc-desc` (visible en la tarjeta de contacto):**
> "Product & Creative Designer enfocado en crear experiencias visuales que conectan."

"Que conectan" es uno de los tres clichés más usados en marketing de diseñadores (junto con "impacto" y "soluciones"). Propuesta más directa:
> "Diseñador que construye desde la identidad visual hasta la interfaz terminada — con criterio, no con plantillas."

---

**og:description del index.html (line 9):**
> "Portafolio de Andrés Galdino, Product & Creative Designer. Proyectos de branding, UX/UI, motion y sistemas de diseño."

Lista de palabras clave. No invita a hacer clic. Propuesta:
> "Diseñador con 8 años construyendo marcas e interfaces desde Bogotá. Aquí vive el trabajo real — sin mockups vacíos."

---

**meta description de contacto (line 8):**
> "Product & Creative Designer. Bogotá · Colombia · Remote."

Demasiado escueto para el snippet de Google. Propuesta:
> "Escríbeme directamente. Andrés Galdino, diseñador con base en Bogotá disponible para proyectos de branding, producto y dirección creativa."

---

**Inspiración — Adidas:**
> "Identidad que trasciende el deporte. Un masterclass en construir marca relevante entre culturas y décadas sin perder la esencia."

"Masterclass" y "sin perder la esencia" son frases de blog corporativo. Propuesta:
> "Identidad que sobrevive décadas sin actualizarse. Adidas enseña que una marca sólida no necesita reinventarse para seguir siendo relevante."

---

**Inspiración — Nike:**
> "Emoción condensada en simplicidad. El diseño más poderoso es el que comunica exactamente lo que necesita y mueve a actuar."

La segunda oración es genérica. Propuesta:
> "El poder de un símbolo bien construido. Nike demostró que el diseño más memorable no necesita ni el nombre de la marca."

---

**Fun Fact triplicado — El origen con el padre arquitecto**

Este dato aparece en tres lugares distintos:
1. Bio card (sobre-mi, panel Perfil)
2. Fun fact #01 (sobre-mi, panel Perfil)
3. Timeline entry #01 (sobre-mi, panel Historia)

La repetición diluye el impacto de un dato que es genuinamente diferenciador. Recomendación: conservarlo en la Bio y en la Historia. En los Fun Facts, reemplazar el #01 por algo distinto — por ejemplo, la edad a la que trabajó por primera vez ("16 años en Moda Week").

---

**Panel "Ahora mismo" — item Construyendo:**
> "Este portafolio — Figma + IA"

Una vez el portafolio esté en producción y publicado, esta línea lo hace ver como trabajo en progreso. Actualizar a un proyecto actual o a algo más aspiracional.

---

## Resumen Ejecutivo por Prioridad

### Errores Críticos (impacto funcional inmediato)

1. **`og-image.jpg` no existe** — El preview de redes sociales está roto en todo el sitio. Sin imagen real, cualquier publicación en LinkedIn o Instagram sobre el portafolio aparece en blanco. Crear una imagen 1200×630px y guardarla como `assets/og-image.jpg`. **Riesgo de tocarlo: CERO.**

2. **Falta `muted` en 2 videos de proyecto** — `moda-week-international.html:283` y `victoria-regia.html:279`. Sin este atributo, Safari iOS y Chrome Android bloquean el autoplay y la portada de ambas páginas de proyecto queda en negro. Añadir `muted` al `<video>`. **Riesgo de tocarlo: CERO.**

3. **Touch targets críticos en Contacto** — Los íconos de Instagram y LinkedIn en `contacto.html` son de ~18px y físicamente imposibles de tocar con precisión. La página de contacto es el único CTA de conversión del sitio. **Riesgo de tocarlo: MUY BAJO.**

### Mejoras de Código (performance / higiene)

4. **Selectores `:hover` sin `@media (hover: hover)`** — En móvil (sobre todo en `sobre-mi.html`) el tap activa estados hover que quedan "pegados". El más visible es `.card:hover { transform:translateY(-3px) }`. Encapsular en `@media (hover: hover)` es quirúrgico y no toca ninguna animación. **Riesgo: BAJO.**

5. **`cache: 'no-store'` en loader.js:38** — Fuerza descarga del nav en cada visita. Quitar el objeto `{ cache: 'no-store' }` y dejar solo el `?_=Date.now()` si se quiere forzar el bust. **Riesgo: BAJO.**

6. **H1 semántico ausente** — Añadir un `<h1 class="sr-only">` en cada página no toca ningún visual ni animación, pero mejora el SEO estructuralmente. **Riesgo: CERO.**

7. **Open Graph incompleto en páginas interiores** — `sobre-mi.html` no tiene ningún meta OG. Agregar og:title, og:description, og:url y og:type. **Riesgo: CERO.**

8. **Archivos .MOV en páginas de proyecto** — Convertir `chiper.MOV`, `marquilla.MOV` y `lumi.mov` a `.mp4` (H.264) y actualizar los `src` en el HTML. Asegura reproducción en Android. **Riesgo: BAJO** (solo cambio de ruta de archivo).

9. **`preload="auto"` en videos pesados** — Cambiar a `preload="metadata"` en los videos de sección paralax y proyecto para evitar descarga silenciosa en mobile. Verificar que el script de scroll siga funcionando tras el cambio. **Riesgo: MEDIO** — el `#svVideo` depende de `vid.readyState >= 2` en tick(); con `preload="metadata"` puede tardar más en estar disponible.

### Pulido de Copy

10. **Crear og:image real** — Junto con el punto #1, diseñar una imagen de 1200×630px con el nombre, rol y una foto de perfil. Esta imagen es lo primero que un reclutador o cliente ve al recibir el link.

11. **Actualizar `pc-desc` en contacto** — Reemplazar "enfocado en crear experiencias visuales que conectan" por algo más específico y directo al perfil real.

12. **Actualizar og:description del index** — El snippet de Google es la segunda impresión después del título. La versión actual es una lista de tags, no una invitación.

13. **Eliminar el fun fact duplicado** — El dato del padre arquitecto aparece tres veces. Conservarlo en Bio e Historia; reemplazar en Fun Facts por el dato de los 16 años en Moda Week.

14. **Actualizar "Construyendo: Este portafolio"** — Una vez el sitio esté en producción, este texto comunica que el trabajo no está terminado.

---

*Auditoría de solo lectura completada. Ningún cambio fue aplicado al código. Todos los hallazgos son sugerencias para validación manual antes de implementar.*

/**
 * loader.js — Cargador de componentes + lógica de navegación
 * Portafolio Andrés Galdino
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     Índice de páginas para el buscador
  ───────────────────────────────────────────── */
  var PAGES = [
    { title: 'Inicio',                url: '',                                             tags: 'home portafolio' },
    { title: 'Proyectos',             url: 'paginas/proyectos/',                           tags: 'trabajos diseño ux ui' },
    { title: 'Perfil',                url: 'paginas/sobre-mi/',                            tags: 'bio historia habilidades skills sobre mi' },
    { title: 'Contacto',              url: 'paginas/contacto/',                            tags: 'email linkedin behance redes' },
    { title: 'Universidad',           url: 'paginas/proyectos/universitario/',             tags: 'editorial educacion universitario' },
    { title: 'Victoria Regia',        url: 'paginas/proyectos/victoria-regia/',            tags: 'branding naturaleza cosmeticos amazonia' },
    { title: 'Moda Week',             url: 'paginas/proyectos/moda-week-international/',   tags: 'branding eventos moda' },
    { title: 'Chiper',                url: 'paginas/proyectos/chiper/',                    tags: 'b2b e-commerce app' },
    { title: 'Farmalaxia',            url: 'paginas/proyectos/farmalaxia/',                tags: 'branding salud farmacia identidad' },
    { title: 'Dreams',                url: 'paginas/proyectos/dreams/',                    tags: 'ux ui app motion producto juego 3d cozy' },
    { title: 'Museo',                 url: 'paginas/proyectos/museo/',                     tags: 'cultura arte exposicion' }
  ];

  /* ─────────────────────────────────────────────
     Registro de estilos inyectados
  ───────────────────────────────────────────── */
  var _injectedStyles = {};

  function loadComponent(id, path, onReady) {
    var container = document.getElementById(id);
    if (!container) {
      console.warn('[loader] contenedor #' + id + ' no encontrado');
      return;
    }

    fetch(path + '?_=' + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' cargando ' + path);
        return res.text();
      })
      .then(function (raw) {
        var html = raw.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, function (_, css) {
          if (!_injectedStyles[path]) {
            _injectedStyles[path] = true;
            var el = document.createElement('style');
            el.setAttribute('data-component', path);
            el.textContent = css;
            document.head.appendChild(el);
          }
          return '';
        });

        container.innerHTML = html;
        if (typeof onReady === 'function') onReady();
      })
      .catch(function (err) {
        console.error('[loader] ✗ Error cargando ' + path + '. Verifica el nombre de la carpeta.', err);
      });
  }

  function getDepth() {
    var meta = document.querySelector('meta[name="base-depth"]');
    if (meta) return parseInt(meta.getAttribute('content'), 10) || 0;
    var parts = window.location.pathname.split('/').filter(function (s) { return s.length > 0; });
    if (parts.length && parts[parts.length - 1].indexOf('.') !== -1) parts.pop();
    return parts.length;
  }

  function resolveRoot(file) {
    var depth = getDepth();
    var prefix = '';
    for (var i = 0; i < depth; i++) prefix += '../';
    return prefix + file;
  }

  function patchNavLinks() {
    var root = resolveRoot('');
    document.querySelectorAll('#nav-container a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href.charAt(0) === '/' ) {
        a.setAttribute('href', root + href.replace(/^\//, ''));
      }
    });
  }

  function renderSearchResults(results, container, root) {
    container.innerHTML = '';
    if (!results.length) {
      container.innerHTML = '<p style="font-size:13px;color:rgba(245,245,247,.35);padding:0 4px">Sin resultados</p>';
      return;
    }
    results.forEach(function (page) {
      var a = document.createElement('a');
      a.className = 'cn-sp-chip';
      a.href = root + page.url;
      a.textContent = page.title;
      container.appendChild(a);
    });
  }

  function initNav() {
    var sp    = document.getElementById('cnSP');
    var mob   = document.getElementById('cnMob');
    var ham   = document.getElementById('cnHam');
    var spIn  = document.getElementById('cnSPIn');
    var sugg  = document.getElementById('cnSugg');
    var acc   = document.getElementById('cnAcc');
    var chev  = document.getElementById('cnChev');
    var pBtn  = document.getElementById('cnMobProyBtn');
    var spRes = document.getElementById('cnSPResults');

    if (!ham || !mob) { console.error('[nav] ham/mob no encontrados'); return; }

    /* Fallback: Live Server inyecta dentro de los SVG y trunca el archivo.
       Si el panel de búsqueda o filas del menú no llegaron, los creamos aquí. */
    if (!sp) {
      sp = document.createElement('div');
      sp.className = 'cn-sp'; sp.id = 'cnSP'; sp.setAttribute('role', 'search');
      sp.innerHTML =
        '<div class="cn-sp-top">' +
          '<svg class="cn-sp-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input class="cn-sp-input" id="cnSPIn" type="search" placeholder="Buscar proyectos, páginas..." autocomplete="off" aria-label="Buscar en el portafolio">' +
          '<button class="cn-sp-cls" id="cnSPCls" aria-label="Cerrar búsqueda">Cerrar</button>' +
        '</div>' +
        '<div class="cn-sp-sugg" id="cnSugg"><span class="cn-sp-sugg-lbl">Accesos rápidos</span>' +
          '<div class="cn-sp-chips">' +
            '<a class="cn-sp-chip" href="/paginas/proyectos/">Todos los Proyectos</a>' +
            '<a class="cn-sp-chip" href="/paginas/proyectos/moda-week-international/">Moda Week</a>' +
            '<a class="cn-sp-chip" href="/paginas/proyectos/chiper/">Chiper</a>' +
            '<a class="cn-sp-chip" href="/paginas/sobre-mi/">Perfil</a>' +
            '<a class="cn-sp-chip" href="/paginas/contacto/">Contacto</a>' +
          '</div></div>' +
        '<div class="cn-sp-results cn-sp-chips" id="cnSPResults" aria-live="polite" aria-label="Resultados de búsqueda"></div>';
      document.body.appendChild(sp);
      spIn  = document.getElementById('cnSPIn');
      sugg  = document.getElementById('cnSugg');
      spRes = document.getElementById('cnSPResults');
    }

    if (!mob.querySelector('a[href*="sobre-mi"]')) {
      var _mf = mob.querySelector('.cn-mob-footer');
      var _r1 = document.createElement('div'); _r1.className = 'cn-mob-row';
      _r1.innerHTML = '<a class="cn-mob-link" href="/paginas/sobre-mi/">Perfil</a>';
      mob.insertBefore(_r1, _mf || null);
    }
    if (!mob.querySelector('a[href*="contacto"]')) {
      var _mf2 = mob.querySelector('.cn-mob-footer');
      var _r2 = document.createElement('div'); _r2.className = 'cn-mob-row';
      _r2.innerHTML = '<a class="cn-mob-link" href="/paginas/contacto/">Contacto</a>';
      mob.insertBefore(_r2, _mf2 || null);
    }

    patchNavLinks();

    var spOpen = false, mobOpen = false, accOpen = false, fxTimer;
    var TR_FAST = 'opacity .1s ease, transform .1s ease';
    var TR_OPEN = 'opacity .42s cubic-bezier(.16,1,.3,1), transform .42s cubic-bezier(.16,1,.3,1)';
    var navEl = document.querySelector('#nav-container .cn');

    function setStyle(el, props) {
      if (!el) return;
      Object.keys(props).forEach(function (k) { el.style[k] = props[k]; });
    }

    setStyle(sp, {
      opacity: '0', pointerEvents: 'none',
      transform: 'translateY(-8px)', transition: TR_FAST,
      position: 'fixed', top: '44px', left: '0', right: '0', zIndex: '901'
    });
    setStyle(mob, { opacity: '0', pointerEvents: 'none', transform: 'translateY(-8px)', transition: TR_FAST });

    var fx = document.createElement('div');
    fx.style.cssText = [
      'position:fixed;top:44px;left:0;right:0;bottom:0;z-index:896;',
      'pointer-events:none;opacity:0;',
      'backdrop-filter:blur(20px) saturate(65%);',
      '-webkit-backdrop-filter:blur(20px) saturate(65%);',
      'background:rgba(0,0,0,.22);',
      'transition:opacity .4s cubic-bezier(.2,0,0,1)'
    ].join('');
    document.body.appendChild(fx);

    function fxOn()  { fx.style.opacity = '1'; fx.style.pointerEvents = 'auto'; }
    function fxOff() {
      if (!spOpen && !mobOpen) { fx.style.opacity = '0'; fx.style.pointerEvents = 'none'; }
    }

    /* ── Búsqueda ── */
    function openSearch() {
      if (!sp) return;
      spOpen = true;
      setStyle(sp, { opacity: '1', pointerEvents: 'auto', transform: 'translateY(0)', transition: TR_OPEN });
      if (navEl) navEl.classList.add('sp-open');
      fxOn();
      setTimeout(function () { if (spIn) spIn.focus(); }, 60);
    }
    function closeSearch() {
      if (!sp) return;
      spOpen = false;
      setStyle(sp, { opacity: '0', pointerEvents: 'none', transform: 'translateY(-8px)', transition: TR_FAST });
      if (navEl) navEl.classList.remove('sp-open');
      if (spIn) { spIn.value = ''; }
      if (sugg) sugg.style.display = '';
      if (spRes) spRes.style.display = 'none';
      fxOff();
    }

    /* ── Menú Móvil ── */
    function openMob() {
      mobOpen = true;
      ham.setAttribute('aria-expanded', 'true');
      setStyle(mob, { opacity: '1', pointerEvents: 'auto', transform: 'translateY(0)', transition: TR_OPEN });
      ham.classList.add('is-open');
      mob.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      fxOn();
    }
    function closeMob() {
      mobOpen = false;
      ham.setAttribute('aria-expanded', 'false');
      setStyle(mob, { opacity: '0', pointerEvents: 'none', transform: 'translateY(-8px)', transition: TR_FAST });
      ham.classList.remove('is-open');
      mob.classList.remove('is-open');
      document.body.style.overflow = '';
      closeAcc();
      fxOff();
    }

    /* ── Acordeón Móvil ── */
    function openAcc() {
      accOpen = true;
      if (pBtn) pBtn.setAttribute('aria-expanded', 'true');
      if (acc)  acc.classList.add('is-open');
      if (chev) chev.style.transform = 'rotate(180deg)';
    }
    function closeAcc() {
      accOpen = false;
      if (pBtn) pBtn.setAttribute('aria-expanded', 'false');
      if (acc)  acc.classList.remove('is-open');
      if (chev) chev.style.transform = 'rotate(0deg)';
    }

    /* ── Eventos (delegación en document.body — funciona con elementos inyectados) ── */
    document.body.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('#cnSBtn'))       { e.stopPropagation(); spOpen  ? closeSearch() : openSearch(); return; }
      if (t.closest('#cnHam'))        { e.stopPropagation(); mobOpen ? closeMob()    : openMob();    return; }
      if (t.closest('#cnMobProyBtn')) { e.stopPropagation(); accOpen ? closeAcc()    : openAcc();    return; }
      if (t.closest('#cnSPCls'))      { e.stopPropagation(); closeSearch(); return; }
      if (spOpen  && sp  && !sp.contains(t) && !t.closest('.cn'))         closeSearch();
      if (mobOpen && mob && !mob.contains(t) && !ham.contains(t))         closeMob();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSearch(); closeMob(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 768 && mobOpen) closeMob();
      if (window.innerWidth < 768  && spOpen)  closeSearch();
    });

    /* ── Hover FX Lógico para Dropdowns ── */
    document.querySelectorAll('.cn-item').forEach(function (item) {
      var drop = item.querySelector('.cn-drop');
      if (!drop) return;

      item.addEventListener('mouseenter', function () {
        clearTimeout(fxTimer);
        fxOn();
      });

      item.addEventListener('mouseleave', function () {
        fxTimer = setTimeout(fxOff, 160);
      });

      drop.addEventListener('mouseenter', function () {
        clearTimeout(fxTimer);
        fxOn();
      });

      drop.addEventListener('mouseleave', function (e) {
        if (item.contains(e.relatedTarget)) return;
        fxTimer = setTimeout(fxOff, 160);
      });
    });

    /* ── Buscador Funcional ── */
    var root = resolveRoot('');
    if (spIn && spRes) {
      spIn.addEventListener('input', function () {
        var q = spIn.value.trim().toLowerCase();
        if (!q) {
          if (sugg) sugg.style.display = '';
          spRes.style.display = 'none';
          return;
        }
        if (sugg) sugg.style.display = 'none';
        var results = PAGES.filter(function (p) {
          return p.title.toLowerCase().indexOf(q) !== -1 ||
                 p.tags.toLowerCase().indexOf(q) !== -1;
        });
        renderSearchResults(results, spRes, root);
        spRes.style.display = 'block';
      });
    }

    document.dispatchEvent(new CustomEvent('navReady'));
  }

/* ─────────────────────────────────────────────
     Punto de entrada (A prueba de fallos)
  ───────────────────────────────────────────── */
  function arrancarLoader() {
    // IMPORTANTE: Asegúrate de que el nombre de la carpeta sea el correcto. 
    // Si tu carpeta se llama "componentes" en español, cambia la palabra abajo.
    var navPath = resolveRoot('components/nav.html'); 
    loadComponent('nav-container', navPath, initNav);
  }

  // Verifica si el navegador ya terminó de cargar la página antes de que el script se ejecutara
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancarLoader);
  } else {
    arrancarLoader();
  }

  /* API pública */
  window.PortafolioLoader = { loadComponent: loadComponent };

})();
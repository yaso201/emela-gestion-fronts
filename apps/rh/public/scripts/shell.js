/* ============================================================
   emela RH — Back-office : comportement du châssis (slim, a11y).
   La barre latérale (avec sélecteur de rôle) est rendue SSR par
   RhLayout.astro. Ce script porte : rôle actif (persistance +
   filtrage nav/contenu), menu mobile, tiroirs (focus-trap +
   scroll-lock + inert), toasts (aria-live), format FCFA.
   ============================================================ */
(function () {
  // Profils RÉELS de l'utilisateur, posés en SSR par le middleware (data-profiles).
  // Le nav est déjà filtré côté serveur ; ici on masque les blocs de CONTENU [data-roles]
  // selon l'ENSEMBLE des profils de l'utilisateur (intersection).
  function profiles() {
    return (document.body.getAttribute('data-profiles') || '').split(/\s+/).filter(Boolean);
  }
  function applyContentGating() {
    var p = profiles();
    document.querySelectorAll('[data-roles]:not(.nav-item)').forEach(function (el) {
      var roles = el.getAttribute('data-roles').split(/\s+/);
      el.hidden = !roles.some(function (r) { return p.indexOf(r) >= 0; });
    });
    // Les pages adaptent leur libellé via onRhRole(profilPrincipal).
    if (typeof window.onRhRole === 'function') window.onRhRole(p[0] || '', { profiles: p });
  }

  window.fcfa = function (n) { n = Math.round(Number(n) || 0); return n.toLocaleString('fr-FR').replace(/\u00a0/g, ' ') + ' F'; };
  window.RhShell = { profiles: profiles };

  // ---- Tiroirs (focus-trap + scroll-lock + inert) ----
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var bgEls = function () { return document.querySelectorAll('main, .nav-side, .nav-mbar'); };
  var lastFocus = null, openDrawerEl = null;
  function openDrawer(id) {
    var d = document.getElementById(id), s = document.getElementById('rh-scrim'); if (!d) return;
    lastFocus = document.activeElement; openDrawerEl = d;
    d.classList.add('is-open'); if (s) s.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    bgEls().forEach(function (el) { el.setAttribute('inert', ''); });
    var f = d.querySelector(FOCUSABLE); if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closeDrawer() {
    document.querySelectorAll('.rh-drawer.is-open').forEach(function (d) { d.classList.remove('is-open'); });
    var s = document.getElementById('rh-scrim'); if (s) s.classList.remove('is-open');
    document.body.style.overflow = '';
    bgEls().forEach(function (el) { el.removeAttribute('inert'); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    openDrawerEl = null;
  }
  window.RhDrawer = { open: openDrawer, close: closeDrawer };

  // ---- Toasts (aria-live) ----
  window.rhToast = function (msg, ok) {
    var stack = document.getElementById('rh-toast-stack');
    if (!stack) {
      stack = document.createElement('div'); stack.className = 'rh-toast-stack'; stack.id = 'rh-toast-stack';
      stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    var t = document.createElement('div'); t.className = 'rh-toast' + (ok ? ' ok' : '');
    t.innerHTML = (ok ? '<svg class="ico"><use href="#i-check"></use></svg>' : '') + '<span></span>';
    t.querySelector('span').textContent = msg;
    stack.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(function () { t.remove(); }, 320); }, 2600);
  };

  function setMenu(open) {
    document.body.classList.toggle('nav-open', open);
    var b = document.querySelector('[data-nav-toggle]'); if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('[data-nav-toggle]');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.addEventListener('click', function () { setMenu(!document.body.classList.contains('nav-open')); }); }
    document.querySelectorAll('[data-nav-close]').forEach(function (el) { el.addEventListener('click', function () { setMenu(false); }); });

    document.querySelectorAll('[data-drawer-open]').forEach(function (btn) { btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-drawer-open')); }); });
    document.querySelectorAll('[data-drawer-close]').forEach(function (btn) { btn.addEventListener('click', closeDrawer); });
    var scrim = document.getElementById('rh-scrim'); if (scrim) scrim.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (openDrawerEl) closeDrawer(); else if (document.body.classList.contains('nav-open')) setMenu(false); return; }
      if (e.key === 'Tab' && openDrawerEl) {
        var items = openDrawerEl.querySelectorAll(FOCUSABLE); if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    applyContentGating();
  });
})();

/* ============================================================
   emela RH — Back-office : comportement du châssis (slim, a11y).
   La barre latérale (avec sélecteur de rôle) est rendue SSR par
   RhLayout.astro. Ce script porte : rôle actif (persistance +
   filtrage nav/contenu), menu mobile, tiroirs (focus-trap +
   scroll-lock + inert), toasts (aria-live), format FCFA.
   ============================================================ */
(function () {
  var STORE = 'emela_rh_role';
  var ROLES = ['manager', 'gest_rh', 'paie', 'finance', 'dir', 'admin'];

  // Couleur + libellé + identité par rôle (miroir du SSR ; sert au runtime).
  var ROLE_INFO = {
    manager: { name: 'Sylvain Dossou',       role: 'Manager',          av: 'SD', c: 'var(--rh-manager)', soft: 'var(--rh-manager-soft)' },
    gest_rh: { name: 'Rachelle Houngbé',     role: 'Gestionnaire RH',  av: 'RH', c: 'var(--rh-gest)',    soft: 'var(--rh-gest-soft)' },
    paie:    { name: 'Bertin Aïkpé',         role: 'Responsable paie', av: 'BA', c: 'var(--rh-paie)',    soft: 'var(--rh-paie-soft)' },
    finance: { name: 'Carine Zinsou',        role: 'Finance',          av: 'CZ', c: 'var(--rh-finance)', soft: 'var(--rh-finance-soft)' },
    dir:     { name: 'Pr. Adjovi Mensah',    role: 'Direction',        av: 'AM', c: 'var(--rh-dir)',     soft: 'var(--rh-dir-soft)' },
    admin:   { name: 'Service informatique', role: 'Admin technique',  av: 'SI', c: 'var(--rh-admin)',   soft: 'var(--rh-admin-soft)' },
  };
  var ROLE_HOME = { manager: '/cockpit', gest_rh: '/personnel', paie: '/paie', finance: '/validation', dir: '/cockpit', admin: '/parametres' };

  function getRole() {
    var r = null; try { r = localStorage.getItem(STORE); } catch (e) {}
    if (ROLES.indexOf(r) < 0) r = document.body.getAttribute('data-role') || 'gest_rh';
    return r;
  }
  function storeRole(r) { try { localStorage.setItem(STORE, r); } catch (e) {} }

  function applyRole(role) {
    document.body.setAttribute('data-role', role);
    var info = ROLE_INFO[role];
    var sel = document.getElementById('rh-role-sel'); if (sel) sel.value = role;
    var dot = document.getElementById('rh-role-dot'); if (dot) dot.style.background = info.c;
    var nm = document.querySelector('.nav-user .nm'); if (nm) nm.textContent = info.name;
    var rl = document.querySelector('.nav-user .rl'); if (rl) { rl.textContent = info.role; rl.style.color = info.c; }
    var av = document.querySelector('.nav-user .av'); if (av) { av.textContent = info.av; av.style.background = info.soft; av.style.color = info.c; }

    // Filtre nav par rôle + masque les libellés de groupe sans enfant visible
    document.querySelectorAll('.nav-item[data-roles]').forEach(function (a) {
      a.hidden = a.getAttribute('data-roles').split(/\s+/).indexOf(role) < 0;
    });
    document.querySelectorAll('.nav-scroll .nav-grouplabel').forEach(function (lbl) {
      var any = false, n = lbl.nextElementSibling;
      while (n && n.classList.contains('nav-item')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
      lbl.hidden = !any;
    });
    // Gating de contenu par rôle
    document.querySelectorAll('[data-roles]:not(.nav-item)').forEach(function (el) {
      el.hidden = el.getAttribute('data-roles').split(/\s+/).indexOf(role) < 0;
    });
    if (typeof window.onRhRole === 'function') window.onRhRole(role, info);
  }

  function setRole(role, fromClick) {
    storeRole(role);
    if (fromClick) {
      var nav = document.querySelector('.nav-item[data-page="' + document.body.getAttribute('data-page') + '"]');
      var canSee = nav && nav.getAttribute('data-roles').split(/\s+/).indexOf(role) >= 0;
      if (!canSee && ROLE_HOME[role]) { window.location.href = ROLE_HOME[role]; return; }
    }
    applyRole(role);
  }

  window.fcfa = function (n) { n = Math.round(Number(n) || 0); return n.toLocaleString('fr-FR').replace(/\u00a0/g, ' ') + ' F'; };
  window.RhShell = { getRole: getRole, setRole: setRole, ROLE_INFO: ROLE_INFO };

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
    var sel = document.getElementById('rh-role-sel');
    if (sel) sel.addEventListener('change', function (e) { setRole(e.target.value, true); });

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

    var role = getRole(); storeRole(role); applyRole(role);
  });
})();

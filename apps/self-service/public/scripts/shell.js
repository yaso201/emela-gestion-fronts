/* ============================================================
   emela — Espace personnel : comportement du châssis (slim, a11y).
   Barre latérale + barre mobile rendues SSR par le Layout.
   Ici : menu mobile, tiroirs (focus-trap + scroll-lock + inert),
   toasts (aria-live), cloche & déconnexion.
   ============================================================ */
(function () {
  // Format FCFA (miroir de @emela/shared/fcfa pour le JS runtime).
  window.fcfa = function (n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('fr-FR').replace(/\u00a0/g, ' ') + ' F';
  };

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var bgEls = function () { return document.querySelectorAll('main, .nav-side, .nav-mbar'); };
  var lastFocus = null;
  var openDrawerEl = null;

  function openDrawer(id) {
    var d = document.getElementById(id), s = document.getElementById('hr-scrim');
    if (!d) return;
    lastFocus = document.activeElement;
    openDrawerEl = d;
    d.classList.add('is-open');
    if (s) s.classList.add('is-open');
    document.body.style.overflow = 'hidden';                 // scroll-lock
    bgEls().forEach(function (el) { el.setAttribute('inert', ''); }); // isole le fond
    var f = d.querySelector(FOCUSABLE);
    if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closeDrawer() {
    document.querySelectorAll('.hr-drawer.is-open').forEach(function (d) { d.classList.remove('is-open'); });
    var s = document.getElementById('hr-scrim'); if (s) s.classList.remove('is-open');
    document.body.style.overflow = '';
    bgEls().forEach(function (el) { el.removeAttribute('inert'); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();      // rend le focus
    openDrawerEl = null;
  }
  window.HrDrawer = { open: openDrawer, close: closeDrawer };

  // Toasts — annoncés aux lecteurs d'écran.
  window.hrToast = function (msg, ok) {
    var stack = document.getElementById('hr-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'hr-toast-stack'; stack.id = 'hr-toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    var t = document.createElement('div'); t.className = 'hr-toast' + (ok ? ' ok' : '');
    t.innerHTML = (ok ? '<svg class="ico"><use href="#i-check"></use></svg>' : '') + '<span></span>';
    t.querySelector('span').textContent = msg;
    stack.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s, transform .3s'; t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(function () { t.remove(); }, 320); }, 2600);
  };

  // Déconnexion : branchez votre flux d'auth ici (POST /logout → /connexion).
  window.hrLogout = window.hrLogout || function () { hrToast('Déconnexion…'); };

  function setMenu(open) {
    document.body.classList.toggle('nav-open', open);
    var t = document.querySelector('[data-nav-toggle]');
    if (t) t.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('[data-nav-toggle]');
    if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.addEventListener('click', function () { setMenu(!document.body.classList.contains('nav-open')); }); }
    document.querySelectorAll('[data-nav-close]').forEach(function (el) { el.addEventListener('click', function () { setMenu(false); }); });

    var notif = document.querySelector('[data-mbar="notif"]');
    if (notif) notif.addEventListener('click', function () { hrToast('2 notifications non lues'); });
    var logout = document.querySelector('[data-mbar="logout"]');
    if (logout) logout.addEventListener('click', function () { window.hrLogout(); });

    document.querySelectorAll('[data-drawer-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDrawer(btn.getAttribute('data-drawer-open')); });
    });
    document.querySelectorAll('[data-drawer-close]').forEach(function (btn) { btn.addEventListener('click', closeDrawer); });
    var scrim = document.getElementById('hr-scrim'); if (scrim) scrim.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if (openDrawerEl) closeDrawer(); else if (document.body.classList.contains('nav-open')) setMenu(false); return; }
      // Focus-trap dans le tiroir ouvert
      if (e.key === 'Tab' && openDrawerEl) {
        var items = openDrawerEl.querySelectorAll(FOCUSABLE);
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  });
})();

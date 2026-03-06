/* js/app.js — Hash router, Modal helper, mobile nav, init */
/* depends on: window.Storage, window.Categories, window.Transactions,
               window.Dashboard, window.Summary */

/* ── Shared Modal ───────────────────────────────────────────────────────────── */

window.Modal = (function () {
  'use strict';

  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl  = document.getElementById('modal-body');
  const closeBtn = document.getElementById('modal-close');

  function open(title, bodyHTML) {
    titleEl.textContent = title;
    bodyEl.innerHTML    = bodyHTML;
    overlay.classList.remove('hidden');
    // Focus first focusable element
    const first = bodyEl.querySelector('input, select, textarea, button');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function close() {
    overlay.classList.add('hidden');
    bodyEl.innerHTML = '';
    titleEl.textContent = '';
  }

  // Close on overlay backdrop click
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });

  // Close on ✕ button
  closeBtn.addEventListener('click', close);

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
  });

  return { open, close };
})();

/* ── App Router ─────────────────────────────────────────────────────────────── */

const App = (function () {
  'use strict';

  const ROUTES = {
    dashboard:    { sectionId: 'page-dashboard',    module: function () { return Dashboard; } },
    transactions: { sectionId: 'page-transactions', module: function () { return Transactions; } },
    categories:   { sectionId: 'page-categories',   module: function () { return Categories; } },
    summary:      { sectionId: 'page-summary',       module: function () { return Summary; } },
  };

  const ALL_SECTION_IDS = Object.values(ROUTES).map(r => r.sectionId);

  function _router() {
    const raw   = location.hash.replace('#', '').toLowerCase();
    const route = ROUTES[raw] || ROUTES.dashboard;

    // Hide all page sections
    ALL_SECTION_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });

    // Show matching section
    var target = document.getElementById(route.sectionId);
    if (target) target.classList.add('active');

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(function (link) {
      var href = link.getAttribute('href').replace('#', '');
      link.classList.toggle('active', href === (raw || 'dashboard'));
    });

    // Call page module's init()
    try {
      route.module().init();
    } catch (err) {
      // Gracefully skip if module not ready
    }

    // Close mobile sidebar on navigation
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  /* ── Mobile hamburger ─────────────────────────────────────────────────────── */

  function _initMobile() {
    var hamburger = document.getElementById('hamburger');
    var sidebar   = document.getElementById('sidebar');

    if (!hamburger || !sidebar) return;

    hamburger.addEventListener('click', function () {
      sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside (touch events for mobile)
    document.addEventListener('click', function (e) {
      if (
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== hamburger
      ) {
        sidebar.classList.remove('open');
      }
    });
  }

  /* ── Init ─────────────────────────────────────────────────────────────────── */

  function init() {
    Storage.seedDefaults();
    _initMobile();
    window.addEventListener('hashchange', _router);
    _router();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);

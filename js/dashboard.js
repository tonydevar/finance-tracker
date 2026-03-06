/* js/dashboard.js — Dashboard page with bar chart (Feature 3) */
/* depends on: window.Storage, Chart.js */

const Dashboard = (function () {
  'use strict';

  let _chart = null;

  function init() {
    if (_chart) { _chart.destroy(); _chart = null; }
    const section = document.getElementById('page-dashboard');
    section.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📊 Dashboard</h1>
      </div>
      <div class="empty-state">
        <div class="empty-state__icon">📊</div>
        <p>Dashboard charts coming soon.</p>
      </div>`;
  }

  return { init, _chart };
})();

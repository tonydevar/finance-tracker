/* js/summary.js — Monthly summary page with pie chart (Feature 4) */
/* depends on: window.Storage, Chart.js */

const Summary = (function () {
  'use strict';

  let _chart = null;

  function init() {
    if (_chart) { _chart.destroy(); _chart = null; }
    const section = document.getElementById('page-summary');
    section.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📈 Summary</h1>
      </div>
      <div class="empty-state">
        <div class="empty-state__icon">📈</div>
        <p>Monthly summary coming soon.</p>
      </div>`;
  }

  return { init, _chart };
})();

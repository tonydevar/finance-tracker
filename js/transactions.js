/* js/transactions.js — Transaction entry & list page (Feature 2) */
/* depends on: window.Storage, window.Modal */

const Transactions = (function () {
  'use strict';

  function init() {
    const section = document.getElementById('page-transactions');
    section.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">💳 Transactions</h1>
      </div>
      <div class="empty-state">
        <div class="empty-state__icon">💳</div>
        <p>Transaction management coming soon.</p>
      </div>`;
  }

  return { init };
})();

/* js/summary.js — Monthly summary page with doughnut chart */
/* depends on: window.Storage, Chart.js (CDN) */

const Summary = (function () {
  'use strict';

  /* ── Module state ───────────────────────────────────────────────────────── */

  var _chart         = null;
  var _selectedMonth = null;   // "YYYY-MM"; null = use current month on first init

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function _currentMonthISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function _fmt(amount) {
    return '$' + Number(amount).toFixed(2);
  }

  /**
   * Build expense breakdown by category for a given "YYYY-MM".
   * Returns array of { cat, amount } sorted by amount descending,
   * only categories with at least one expense transaction.
   */
  function _expenseBreakdown(ym) {
    var txs = Storage.getTransactions().filter(function (tx) {
      return tx.type === 'expense' && tx.date.startsWith(ym);
    });

    // Accumulate by categoryId
    var map = {};
    txs.forEach(function (tx) {
      if (!map[tx.categoryId]) map[tx.categoryId] = 0;
      map[tx.categoryId] += Number(tx.amount);
    });

    return Object.keys(map)
      .map(function (catId) {
        return { cat: Storage.getCategoryById(catId), amount: map[catId] };
      })
      .sort(function (a, b) { return b.amount - a.amount; });
  }

  /* ── Public: page entry point ───────────────────────────────────────────── */

  function init() {
    if (!_selectedMonth) _selectedMonth = _currentMonthISO();
    _render();
  }

  /* ── Main render ────────────────────────────────────────────────────────── */

  function _render() {
    var section    = document.getElementById('page-summary');
    var e          = Storage.escapeHTML;
    var txs        = Storage.getTransactions();
    var ym         = _selectedMonth;

    // Stats for selected month
    var income  = txs
      .filter(function (tx) { return tx.type === 'income'  && tx.date.startsWith(ym); })
      .reduce(function (s, tx) { return s + Number(tx.amount); }, 0);
    var expense = txs
      .filter(function (tx) { return tx.type === 'expense' && tx.date.startsWith(ym); })
      .reduce(function (s, tx) { return s + Number(tx.amount); }, 0);
    var net        = income - expense;
    var savingsRate = income > 0
      ? (net / income * 100).toFixed(1) + '%'
      : 'N/A';

    var netCls = net >= 0 ? 'stat-card--net' : 'stat-card--net negative';

    // Expense breakdown (categories with >0 expense txs this month)
    var breakdown = _expenseBreakdown(ym);

    // Destroy stale chart before any innerHTML replacement
    if (_chart) { _chart.destroy(); _chart = null; }

    section.innerHTML =
      // Page header
      '<div class="page-header">' +
        '<h1 class="page-title">📈 Monthly Summary</h1>' +
        '<div class="month-selector">' +
          '<label for="sum-month">Month:</label>' +
          '<input type="month" id="sum-month" class="form-control" value="' + e(ym) + '">' +
        '</div>' +
      '</div>' +

      // Four stat cards
      '<div class="stats-row">' +
        '<div class="stat-card stat-card--income">' +
          '<div class="stat-card__label">Total Income</div>' +
          '<div class="stat-card__value">' + _fmt(income) + '</div>' +
        '</div>' +
        '<div class="stat-card stat-card--expense">' +
          '<div class="stat-card__label">Total Expenses</div>' +
          '<div class="stat-card__value">' + _fmt(expense) + '</div>' +
        '</div>' +
        '<div class="stat-card ' + netCls + '">' +
          '<div class="stat-card__label">Net Balance</div>' +
          '<div class="stat-card__value">' + (net >= 0 ? '+' : '') + _fmt(net) + '</div>' +
        '</div>' +
        '<div class="stat-card stat-card--savings">' +
          '<div class="stat-card__label">Savings Rate</div>' +
          '<div class="stat-card__value">' + e(savingsRate) + '</div>' +
        '</div>' +
      '</div>' +

      // Chart + table area (or empty state)
      '<div id="sum-body"></div>';

    // Wire month selector
    document.getElementById('sum-month').addEventListener('change', function () {
      _selectedMonth = this.value;
      _render();
    });

    if (breakdown.length === 0) {
      document.getElementById('sum-body').innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__icon">📊</div>' +
          '<p>No expense transactions for this month. Add some transactions to see your summary.</p>' +
        '</div>';
      return;
    }

    var totalExpense = breakdown.reduce(function (s, row) { return s + row.amount; }, 0);

    document.getElementById('sum-body').innerHTML =
      // Doughnut chart
      '<div class="chart-container" style="max-width:500px;margin:0 auto 24px;">' +
        '<div class="chart-section-title">Expense Breakdown</div>' +
        '<canvas id="sum-chart"></canvas>' +
      '</div>' +

      // Breakdown table
      _buildTable(breakdown, totalExpense);

    _renderChart(breakdown);
  }

  /* ── Chart render ───────────────────────────────────────────────────────── */

  function _renderChart(breakdown) {
    var canvas = document.getElementById('sum-chart');
    if (!canvas) return;

    if (_chart) { _chart.destroy(); _chart = null; }

    var labels  = breakdown.map(function (r) { return r.cat.name; });
    var data    = breakdown.map(function (r) { return r.amount; });
    var colors  = breakdown.map(function (r) { return r.cat.color; });

    _chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data:            data,
          backgroundColor: colors,
          borderWidth:     2,
          borderColor:     '#ffffff',
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              usePointStyle: true,
              padding: 14,
              font: { size: 13 },
              generateLabels: function (chart) {
                var ds    = chart.data.datasets[0];
                var total = ds.data.reduce(function (s, v) { return s + v; }, 0);
                return chart.data.labels.map(function (label, i) {
                  var pct = total > 0 ? (ds.data[i] / total * 100).toFixed(1) : '0.0';
                  return {
                    text:            label + ' (' + pct + '%)',
                    fillStyle:       ds.backgroundColor[i],
                    strokeStyle:     ds.backgroundColor[i],
                    lineWidth:       0,
                    index:           i,
                    hidden:          false,
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var total = ctx.dataset.data.reduce(function (s, v) { return s + v; }, 0);
                var pct   = total > 0 ? (ctx.raw / total * 100).toFixed(1) : '0.0';
                return ' ' + ctx.label + ': $' + Number(ctx.raw).toFixed(2) + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });
  }

  /* ── Breakdown table ────────────────────────────────────────────────────── */

  function _buildTable(breakdown, totalExpense) {
    var e = Storage.escapeHTML;

    var rows = breakdown.map(function (row) {
      var pct = totalExpense > 0 ? (row.amount / totalExpense * 100).toFixed(1) : '0.0';
      return '<tr>' +
        '<td>' +
          '<span class="cat-name">' +
            '<span class="cat-dot" style="background:' + e(row.cat.color) + '"></span>' +
            '<span style="color:' + e(row.cat.color) + ';font-weight:600">' + e(row.cat.name) + '</span>' +
          '</span>' +
        '</td>' +
        '<td>' + _fmt(row.amount) + '</td>' +
        '<td>' + pct + '%</td>' +
      '</tr>';
    }).join('');

    var totalPct = totalExpense > 0 ? '100.0%' : '0.0%';

    return '<table class="summary-table">' +
      '<thead><tr>' +
        '<th>Category</th>' +
        '<th>Amount</th>' +
        '<th>% of Total</th>' +
      '</tr></thead>' +
      '<tbody>' +
        rows +
        '<tr>' +
          '<td><strong>Total</strong></td>' +
          '<td><strong>' + _fmt(totalExpense) + '</strong></td>' +
          '<td><strong>' + totalPct + '</strong></td>' +
        '</tr>' +
      '</tbody>' +
    '</table>';
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  return { init, get _chart() { return _chart; } };
})();

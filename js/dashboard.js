/* js/dashboard.js — Dashboard page with bar chart */
/* depends on: window.Storage, Chart.js (CDN) */

const Dashboard = (function () {
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
   * Returns an array of the last N months ending with (and including) the
   * given "YYYY-MM" string, in chronological order.
   */
  function _last6Months() {
    var result = [];
    var now    = new Date();
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        year:  d.getFullYear(),
        month: d.getMonth() + 1,          // 1-based
        ym:    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      });
    }
    return result;
  }

  /**
   * Sum all transactions of a given type for a "YYYY-MM" month.
   */
  function _sumForMonth(ym, type) {
    return Storage.getTransactions()
      .filter(function (tx) { return tx.date.startsWith(ym) && tx.type === type; })
      .reduce(function (acc, tx) { return acc + Number(tx.amount); }, 0);
  }

  /* ── Public: page entry point ───────────────────────────────────────────── */

  function init() {
    // Set month to current if never initialized; preserve across navigations
    if (!_selectedMonth) _selectedMonth = _currentMonthISO();
    _render();
  }

  /* ── Main render ────────────────────────────────────────────────────────── */

  function _render() {
    var section = document.getElementById('page-dashboard');
    var allTx   = Storage.getTransactions();

    // Empty state — no transactions at all
    if (allTx.length === 0) {
      // Destroy any previous chart before replacing DOM
      if (_chart) { _chart.destroy(); _chart = null; }

      section.innerHTML =
        '<div class="page-header">' +
          '<h1 class="page-title">📊 Dashboard</h1>' +
        '</div>' +
        '<div class="empty-state">' +
          '<div class="empty-state__icon">📊</div>' +
          '<p>No transactions yet. Add some transactions to see your dashboard.</p>' +
        '</div>';
      return;
    }

    var income  = _sumForMonth(_selectedMonth, 'income');
    var expense = _sumForMonth(_selectedMonth, 'expense');
    var net     = income - expense;
    var netCls  = net >= 0 ? 'stat-card--net' : 'stat-card--net negative';

    section.innerHTML =
      // Page header with month selector
      '<div class="page-header">' +
        '<h1 class="page-title">📊 Dashboard</h1>' +
        '<div class="month-selector">' +
          '<label for="dash-month">Month:</label>' +
          '<input type="month" id="dash-month" class="form-control" value="' + Storage.escapeHTML(_selectedMonth) + '">' +
        '</div>' +
      '</div>' +

      // Stat cards
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
      '</div>' +

      // Bar chart
      '<div class="chart-container">' +
        '<div class="chart-section-title">Last 6 Months — Income vs Expenses</div>' +
        '<canvas id="dash-chart" height="100"></canvas>' +
      '</div>';

    // Wire month selector
    document.getElementById('dash-month').addEventListener('change', function () {
      _selectedMonth = this.value;
      _render();
    });

    _renderChart();
  }

  /* ── Chart render ───────────────────────────────────────────────────────── */

  function _renderChart() {
    var canvas = document.getElementById('dash-chart');
    if (!canvas) return;

    // Destroy previous instance to avoid "Canvas is already in use" error
    if (_chart) { _chart.destroy(); _chart = null; }

    var months   = _last6Months();
    var labels   = months.map(function (m) { return m.label; });
    var incomes  = months.map(function (m) { return _sumForMonth(m.ym, 'income'); });
    var expenses = months.map(function (m) { return _sumForMonth(m.ym, 'expense'); });

    _chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomes,
            backgroundColor: '#22c55e',
            borderRadius: 4,
            barPercentage: 0.7,
          },
          {
            label: 'Expenses',
            data: expenses,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.dataset.label + ': $' + Number(ctx.raw).toFixed(2);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 } },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 12 },
              callback: function (val) { return '$' + val.toLocaleString(); },
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
        },
      },
    });
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  return { init, get _chart() { return _chart; } };
})();

/* js/transactions.js — Transaction entry & list page */
/* depends on: window.Storage, window.Modal */

const Transactions = (function () {
  'use strict';

  /* ── Module state (survives navigate-away/back) ────────────────────────── */

  var _filters = {
    month:      _currentMonthISO(),
    type:       'all',   // 'all' | 'income' | 'expense'
    categoryId: '',
  };

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function _currentMonthISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function _todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function _fmt(amount) {
    return '$' + Number(amount).toFixed(2);
  }

  function _fmtDate(iso) {
    // iso = "YYYY-MM-DD"
    var parts = iso.split('-');
    if (parts.length < 3) return iso;
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
  }

  /* ── Public: page entry point ───────────────────────────────────────────── */

  function init() {
    _render();
  }

  /* ── Full page render ───────────────────────────────────────────────────── */

  function _render() {
    var section = document.getElementById('page-transactions');
    var cats    = Storage.getCategories();
    var e       = Storage.escapeHTML;

    // Category dropdown options for filter bar
    var catOptions = '<option value="">All Categories</option>' +
      cats.map(function (c) {
        var sel = _filters.categoryId === c.id ? ' selected' : '';
        return '<option value="' + e(c.id) + '"' + sel + '>' + e(c.name) + '</option>';
      }).join('');

    section.innerHTML =
      '<div class="page-header">' +
        '<h1 class="page-title">💳 Transactions</h1>' +
        '<button class="btn btn-primary" onclick="Transactions._openModal()">＋ Add Transaction</button>' +
      '</div>' +

      // Filter bar
      '<div class="filter-bar">' +
        '<div class="month-selector">' +
          '<label for="tx-filter-month">Month:</label>' +
          '<input type="month" id="tx-filter-month" class="form-control" value="' + e(_filters.month) + '">' +
        '</div>' +
        '<div class="type-filter">' +
          '<button class="btn' + (_filters.type === 'all'     ? ' active' : '') + '" data-type="all">All</button>' +
          '<button class="btn' + (_filters.type === 'income'  ? ' active' : '') + '" data-type="income">Income</button>' +
          '<button class="btn' + (_filters.type === 'expense' ? ' active' : '') + '" data-type="expense">Expense</button>' +
        '</div>' +
        '<select id="tx-filter-cat" class="form-control" style="min-width:160px;">' + catOptions + '</select>' +
      '</div>' +

      // List container
      '<div id="tx-list-container"></div>';

    // Wire filter events
    document.getElementById('tx-filter-month').addEventListener('change', function () {
      _filters.month = this.value;
      _renderList();
    });

    document.querySelectorAll('.type-filter .btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        _filters.type = this.getAttribute('data-type');
        // Update button active states
        document.querySelectorAll('.type-filter .btn').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-type') === _filters.type);
        });
        _renderList();
      });
    });

    document.getElementById('tx-filter-cat').addEventListener('change', function () {
      _filters.categoryId = this.value;
      _renderList();
    });

    _renderList();
  }

  /* ── Transaction list render ────────────────────────────────────────────── */

  function _renderList() {
    var container = document.getElementById('tx-list-container');
    if (!container) return;

    var e        = Storage.escapeHTML;
    var allTx    = Storage.getTransactions();
    var monthPfx = _filters.month; // "YYYY-MM"

    // Apply filters
    var filtered = allTx.filter(function (tx) {
      if (_filters.month && !tx.date.startsWith(monthPfx)) return false;
      if (_filters.type !== 'all' && tx.type !== _filters.type) return false;
      if (_filters.categoryId && tx.categoryId !== _filters.categoryId) return false;
      return true;
    });

    // Sort: date descending
    filtered.sort(function (a, b) {
      return b.date.localeCompare(a.date);
    });

    if (filtered.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state__icon">💳</div>' +
          '<p>No transactions match your filters. Try adjusting the month or type.</p>' +
        '</div>';
      return;
    }

    var rows = filtered.map(function (tx) {
      var cat       = Storage.getCategoryById(tx.categoryId);
      var dateLabel = _fmtDate(tx.date);
      var amtClass  = tx.type === 'income' ? 'income' : 'expense';
      var amtSign   = tx.type === 'income' ? '+' : '-';

      return '<div class="tx-row">' +
        '<span class="tx-row__date">' + e(dateLabel) + '</span>' +
        '<span class="category-pill">' +
          '<span class="category-pill__dot" style="background:' + e(cat.color) + '"></span>' +
          e(cat.name) +
        '</span>' +
        '<span class="type-badge type-badge--' + e(tx.type) + '-sm">' + e(tx.type.charAt(0).toUpperCase() + tx.type.slice(1)) + '</span>' +
        '<span class="tx-row__amount ' + amtClass + '">' + amtSign + _fmt(tx.amount) + '</span>' +
        '<span class="tx-row__notes">' + e(tx.notes || '') + '</span>' +
        '<div class="tx-row__actions">' +
          '<button class="btn btn-ghost" onclick="Transactions._openModal(\'' + e(tx.id) + '\')" title="Edit">✎</button>' +
          '<button class="btn btn-ghost" onclick="Transactions._delete(\'' + e(tx.id) + '\')" title="Delete">🗑</button>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = '<div class="tx-list">' + rows + '</div>';
  }

  /* ── Modal: add / edit ──────────────────────────────────────────────────── */

  function _openModal(txId) {
    var tx     = txId ? Storage.getTransactions().find(function (t) { return t.id === txId; }) : null;
    var isEdit = !!tx;
    var e      = Storage.escapeHTML;

    var allCats = Storage.getCategories();
    var txType  = isEdit ? tx.type : 'expense';

    function _catOptionsForType(type) {
      return allCats
        .filter(function (c) { return c.type === type || c.type === 'both'; })
        .map(function (c) {
          var sel = isEdit && tx.categoryId === c.id ? ' selected' : '';
          return '<option value="' + e(c.id) + '"' + sel + '>' + e(c.name) + '</option>';
        })
        .join('');
    }

    var formHTML =
      '<form id="tx-form" novalidate>' +
        // Type radios
        '<div class="form-group">' +
          '<label class="form-label">Type</label>' +
          '<div class="radio-group">' +
            '<label><input type="radio" name="tx-type" value="income"' + (txType === 'income' ? ' checked' : '') + '> Income</label>' +
            '<label><input type="radio" name="tx-type" value="expense"' + (txType === 'expense' ? ' checked' : '') + '> Expense</label>' +
          '</div>' +
        '</div>' +
        // Category
        '<div class="form-group">' +
          '<label class="form-label" for="tx-cat">Category</label>' +
          '<select class="form-control" id="tx-cat">' +
            _catOptionsForType(txType) +
          '</select>' +
          '<span id="tx-cat-err" class="error-msg" style="display:none">Please select a category.</span>' +
        '</div>' +
        // Amount
        '<div class="form-group">' +
          '<label class="form-label" for="tx-amount">Amount ($)</label>' +
          '<input type="number" class="form-control" id="tx-amount" min="0.01" step="0.01" ' +
            'value="' + (isEdit ? e(String(tx.amount)) : '') + '" placeholder="0.00" required>' +
          '<span id="tx-amount-err" class="error-msg" style="display:none"></span>' +
        '</div>' +
        // Date
        '<div class="form-group">' +
          '<label class="form-label" for="tx-date">Date</label>' +
          '<input type="date" class="form-control" id="tx-date" ' +
            'value="' + (isEdit ? e(tx.date) : _todayISO()) + '" required>' +
          '<span id="tx-date-err" class="error-msg" style="display:none">Date is required.</span>' +
        '</div>' +
        // Notes
        '<div class="form-group">' +
          '<label class="form-label" for="tx-notes">Notes <span style="color:var(--color-text-muted);font-weight:400">(optional)</span></label>' +
          '<textarea class="form-control" id="tx-notes" rows="2" maxlength="200" placeholder="e.g. Groceries">' +
            (isEdit ? e(tx.notes || '') : '') +
          '</textarea>' +
        '</div>' +
        '<div class="form-actions">' +
          '<button type="button" class="btn" id="tx-cancel-btn">Cancel</button>' +
          '<button type="submit" class="btn btn-primary">' + (isEdit ? 'Save Changes' : 'Add Transaction') + '</button>' +
        '</div>' +
      '</form>';

    Modal.open(isEdit ? 'Edit Transaction' : 'Add Transaction', formHTML);

    // Wire type radios → cascade category dropdown
    document.querySelectorAll('input[name="tx-type"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        var sel = document.getElementById('tx-cat');
        sel.innerHTML = _catOptionsForType(this.value);
      });
    });

    document.getElementById('tx-cancel-btn').addEventListener('click', Modal.close);

    document.getElementById('tx-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      _save({
        id:         isEdit ? tx.id : null,
        type:       document.querySelector('input[name="tx-type"]:checked').value,
        categoryId: document.getElementById('tx-cat').value,
        amount:     document.getElementById('tx-amount').value,
        date:       document.getElementById('tx-date').value,
        notes:      document.getElementById('tx-notes').value.trim(),
      });
    });
  }

  /* ── Save (validate + persist) ──────────────────────────────────────────── */

  function _save(data) {
    var catErr    = document.getElementById('tx-cat-err');
    var amountErr = document.getElementById('tx-amount-err');
    var dateErr   = document.getElementById('tx-date-err');

    catErr.style.display    = 'none';
    amountErr.style.display = 'none';
    dateErr.style.display   = 'none';

    var valid = true;

    if (!data.categoryId) {
      catErr.style.display = 'block';
      valid = false;
    }

    var amt = parseFloat(data.amount);
    if (isNaN(amt) || amt < 0.01) {
      amountErr.textContent  = 'Please enter an amount of at least $0.01.';
      amountErr.style.display = 'block';
      valid = false;
    }

    if (!data.date) {
      dateErr.style.display = 'block';
      valid = false;
    }

    if (!valid) return;

    Storage.saveTransaction({
      id:         data.id || null,
      type:       data.type,
      categoryId: data.categoryId,
      amount:     amt,
      date:       data.date,
      notes:      data.notes,
    });

    Modal.close();
    _render();
  }

  /* ── Delete ─────────────────────────────────────────────────────────────── */

  function _delete(txId) {
    var tx  = Storage.getTransactions().find(function (t) { return t.id === txId; });
    if (!tx) return;

    var cat = Storage.getCategoryById(tx.categoryId);
    var e   = Storage.escapeHTML;

    var bodyHTML =
      '<p style="margin-bottom:20px;font-size:0.9rem;">' +
        'Delete this <strong>' + e(tx.type) + '</strong> transaction' +
        (cat ? ' in <strong>' + e(cat.name) + '</strong>' : '') +
        ' of <strong>' + _fmt(tx.amount) + '</strong> on ' + e(_fmtDate(tx.date)) + '?' +
      '</p>' +
      '<div class="form-actions">' +
        '<button class="btn" id="del-tx-cancel">Cancel</button>' +
        '<button class="btn btn-danger" id="del-tx-confirm">Delete</button>' +
      '</div>';

    Modal.open('Delete Transaction', bodyHTML);
    document.getElementById('del-tx-cancel').addEventListener('click', Modal.close);
    document.getElementById('del-tx-confirm').addEventListener('click', function () {
      Storage.deleteTransaction(txId);
      Modal.close();
      _render();
    });
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  return { init, _openModal, _delete };
})();

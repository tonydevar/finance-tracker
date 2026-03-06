/* js/categories.js — Category management page */
/* depends on: window.Storage, window.Modal */

const Categories = (function () {
  'use strict';

  /* ── Public: page entry point ───────────────────────────────────────────── */

  function init() {
    _render();
  }

  /* ── Rendering ──────────────────────────────────────────────────────────── */

  function _render() {
    const section = document.getElementById('page-categories');

    const cats   = Storage.getCategories();
    const e      = Storage.escapeHTML;

    const cardsHTML = cats.length === 0
      ? `<div class="empty-state">
           <div class="empty-state__icon">🏷️</div>
           <p>No categories yet. Add one to get started.</p>
         </div>`
      : `<div class="category-grid">
           ${cats.map(cat => {
             const txCount = Storage.getTransactionCountByCategory(cat.id);
             return `
               <div class="category-card">
                 <div class="category-card__top">
                   <div class="color-swatch" style="background:${e(cat.color)}"></div>
                   <span class="category-card__name" title="${e(cat.name)}">${e(cat.name)}</span>
                 </div>
                 <div>
                   <span class="type-badge type-badge--${e(cat.type)}">${e(cat.type)}</span>
                 </div>
                 <div class="category-card__meta">
                   ${txCount === 1 ? '1 transaction' : `${txCount} transactions`}
                 </div>
                 <div class="category-card__actions">
                   <button class="btn btn-sm" onclick="Categories._openModal('${e(cat.id)}')">✎ Edit</button>
                   <button class="btn btn-sm btn-danger" onclick="Categories._delete('${e(cat.id)}')">🗑 Delete</button>
                 </div>
               </div>`;
           }).join('')}
         </div>`;

    section.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🏷️ Categories</h1>
        <button class="btn btn-primary" onclick="Categories._openModal()">＋ Add Category</button>
      </div>
      ${cardsHTML}`;
  }

  /* ── Modal: add / edit ──────────────────────────────────────────────────── */

  function _openModal(catId) {
    const cat = catId ? Storage.getCategoryById(catId) : null;
    const isEdit = !!cat && cat.id;
    const e = Storage.escapeHTML;

    const formHTML = `
      <form id="cat-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="cat-name">Name</label>
          <input class="form-control" id="cat-name" type="text" maxlength="60"
                 value="${isEdit ? e(cat.name) : ''}" placeholder="e.g. Food & Dining" required>
          <span id="cat-name-err" class="error-msg" style="display:none"></span>
        </div>
        <div class="form-group">
          <label class="form-label" for="cat-type">Type</label>
          <select class="form-control" id="cat-type">
            <option value="income"  ${isEdit && cat.type==='income'  ? 'selected' : ''}>Income</option>
            <option value="expense" ${isEdit && cat.type==='expense' ? 'selected' : ''}>Expense</option>
            <option value="both"    ${isEdit && cat.type==='both'    ? 'selected' : ''}>Both</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="cat-color">Color</label>
          <div style="display:flex;align-items:center;gap:10px;">
            <input type="color" id="cat-color" value="${isEdit ? e(cat.color) : '#6366f1'}"
                   style="width:48px;height:36px;border:1px solid var(--color-border);border-radius:6px;padding:2px;cursor:pointer;">
            <span id="cat-color-hex" style="font-size:0.85rem;color:var(--color-text-muted);">${isEdit ? e(cat.color) : '#6366f1'}</span>
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn" id="modal-cancel-btn">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Category'}</button>
        </div>
      </form>`;

    Modal.open(isEdit ? 'Edit Category' : 'Add Category', formHTML);

    // Live color hex preview
    document.getElementById('cat-color').addEventListener('input', function () {
      document.getElementById('cat-color-hex').textContent = this.value;
    });

    document.getElementById('modal-cancel-btn').addEventListener('click', Modal.close);

    document.getElementById('cat-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      _save({
        id:    isEdit ? cat.id : null,
        name:  document.getElementById('cat-name').value.trim(),
        type:  document.getElementById('cat-type').value,
        color: document.getElementById('cat-color').value,
      });
    });
  }

  /* ── Save (validate + persist) ──────────────────────────────────────────── */

  function _save(data) {
    const nameErr = document.getElementById('cat-name-err');
    nameErr.style.display = 'none';

    if (!data.name) {
      nameErr.textContent = 'Name is required.';
      nameErr.style.display = 'block';
      return;
    }

    // Duplicate name check (case-insensitive, exclude self)
    const existing = Storage.getCategories().find(
      c => c.name.toLowerCase() === data.name.toLowerCase() && c.id !== data.id
    );
    if (existing) {
      nameErr.textContent = 'A category with this name already exists.';
      nameErr.style.display = 'block';
      return;
    }

    Storage.saveCategory(data);
    Modal.close();
    _render();
  }

  /* ── Delete (with guard) ────────────────────────────────────────────────── */

  function _delete(catId) {
    const cat    = Storage.getCategoryById(catId);
    const txCount = Storage.getTransactionCountByCategory(catId);
    const e      = Storage.escapeHTML;

    let bodyHTML;
    if (txCount > 0) {
      bodyHTML = `
        <div class="warning-box">
          <span class="warning-box__icon">⚠️</span>
          <span>${txCount} transaction${txCount !== 1 ? 's' : ''} use this category and will show as <strong>Uncategorized</strong>.</span>
        </div>
        <p style="margin-bottom:20px;font-size:0.9rem;">
          Are you sure you want to delete <strong>${e(cat.name)}</strong>?
        </p>
        <div class="form-actions">
          <button class="btn" id="del-cancel">Cancel</button>
          <button class="btn btn-danger" id="del-confirm">Yes, Delete</button>
        </div>`;
    } else {
      bodyHTML = `
        <p style="margin-bottom:20px;font-size:0.9rem;">
          Delete category <strong>${e(cat.name)}</strong>? This cannot be undone.
        </p>
        <div class="form-actions">
          <button class="btn" id="del-cancel">Cancel</button>
          <button class="btn btn-danger" id="del-confirm">Delete</button>
        </div>`;
    }

    Modal.open(`Delete "${e(cat.name)}"`, bodyHTML);
    document.getElementById('del-cancel').addEventListener('click', Modal.close);
    document.getElementById('del-confirm').addEventListener('click', function () {
      Storage.deleteCategory(catId);
      Modal.close();
      _render();
    });
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  return { init, _openModal, _delete };
})();

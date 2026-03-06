/* js/storage.js — Data layer (IIFE, no DOM access) */
/* globals: window.Storage */

const Storage = (function () {
  'use strict';

  const KEYS = {
    categories:   'ft_categories',
    transactions: 'ft_transactions',
  };

  const DEFAULT_CATEGORIES = [
    { name: 'Salary',          type: 'income',  color: '#22c55e' },
    { name: 'Freelance',       type: 'income',  color: '#10b981' },
    { name: 'Food & Dining',   type: 'expense', color: '#ef4444' },
    { name: 'Transport',       type: 'expense', color: '#f59e0b' },
    { name: 'Housing',         type: 'expense', color: '#6366f1' },
    { name: 'Entertainment',   type: 'expense', color: '#ec4899' },
    { name: 'Healthcare',      type: 'expense', color: '#3b82f6' },
    { name: 'Other',           type: 'both',    color: '#64748b' },
  ];

  /* ── Internals ──────────────────────────────────────────────────────────── */

  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }

  function _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /* ── Public helpers ─────────────────────────────────────────────────────── */

  function generateId() {
    return (
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36)
    );
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Seed ───────────────────────────────────────────────────────────────── */

  function seedDefaults() {
    const existing = _get(KEYS.categories);
    if (existing.length === 0) {
      const seeded = DEFAULT_CATEGORIES.map(c => ({ ...c, id: generateId() }));
      _set(KEYS.categories, seeded);
    }
  }

  /* ── Categories ─────────────────────────────────────────────────────────── */

  function getCategories() {
    return _get(KEYS.categories);
  }

  function getCategoryById(id) {
    const cat = getCategories().find(c => c.id === id);
    return cat || { id: null, name: 'Uncategorized', color: '#94a3b8', type: 'both' };
  }

  function saveCategory(cat) {
    const all = _get(KEYS.categories);
    if (!cat.id) cat.id = generateId();
    const idx = all.findIndex(c => c.id === cat.id);
    if (idx >= 0) { all[idx] = cat; } else { all.push(cat); }
    _set(KEYS.categories, all);
    return cat;
  }

  function deleteCategory(id) {
    const all = _get(KEYS.categories).filter(c => c.id !== id);
    _set(KEYS.categories, all);
  }

  function getTransactionCountByCategory(id) {
    return _get(KEYS.transactions).filter(t => t.categoryId === id).length;
  }

  /* ── Transactions ───────────────────────────────────────────────────────── */

  function getTransactions() {
    return _get(KEYS.transactions);
  }

  function saveTransaction(tx) {
    const all = _get(KEYS.transactions);
    if (!tx.id) tx.id = generateId();
    const idx = all.findIndex(t => t.id === tx.id);
    if (idx >= 0) { all[idx] = tx; } else { all.push(tx); }
    _set(KEYS.transactions, all);
    return tx;
  }

  function deleteTransaction(id) {
    const all = _get(KEYS.transactions).filter(t => t.id !== id);
    _set(KEYS.transactions, all);
  }

  function getTransactionsByMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return _get(KEYS.transactions).filter(t => t.date && t.date.startsWith(prefix));
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  return {
    seedDefaults,
    generateId,
    escapeHTML,
    // categories
    getCategories,
    getCategoryById,
    saveCategory,
    deleteCategory,
    getTransactionCountByCategory,
    // transactions
    getTransactions,
    saveTransaction,
    deleteTransaction,
    getTransactionsByMonth,
  };
})();

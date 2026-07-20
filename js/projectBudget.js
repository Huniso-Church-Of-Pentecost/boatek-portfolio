/* ==========================================================================
   projectBudget.js — dynamic project -> budget mapping + currency detection
   Loads /data/projectBudgets.json (shared with the server), detects the
   visitor's country via IP geolocation, and displays budget ranges
   converted to their local currency (approximate, display-only).
   ========================================================================== */

window.BoatekPortfolio = window.BoatekPortfolio || {};

(function () {
  const state = {
    config: null,
    currency: 'USD',
    detecting: true
  };

  // exposed so main.js / other scripts can await the same loaded config
  window.BoatekPortfolio.ready = loadEverything();

  async function loadEverything() {
    await Promise.all([loadConfig(), detectCurrency()]);
    wireProjectSelect();
    return state;
  }

  async function loadConfig() {
    try {
      const res = await fetch('/data/projectBudgets.json');
      state.config = await res.json();
    } catch (err) {
      console.warn('[projectBudget] Failed to load config, budgets will be unavailable:', err);
      state.config = { projects: [], currencyRates: { USD: 1 }, currencySymbols: { USD: '$' }, defaultCurrency: 'USD' };
    }
  }

  async function detectCurrency() {
    // Best-effort IP geolocation. Falls back to USD silently if it fails
    // (offline, blocked, ad-blocker, etc.) — never blocks the form.
    try {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      const countryCode = data && data.country_code;
      if (countryCode && state.config?.countryCurrencyMap?.[countryCode]) {
        state.currency = state.config.countryCurrencyMap[countryCode];
      }
    } catch (err) {
      // silent fallback to USD — this is a nice-to-have, not critical path
      state.currency = state.config?.defaultCurrency || 'USD';
    } finally {
      state.detecting = false;
      updateCurrencyNote();
    }
  }

  function updateCurrencyNote() {
    const note = document.getElementById('currencyNote');
    if (!note) return;
    if (state.currency === 'USD') {
      note.textContent = 'Budgets shown in USD.';
    } else {
      note.textContent = `Approx. ${state.currency} equivalent shown — final quotes are agreed in USD.`;
    }
  }

  function formatRange(min, max) {
    const rate = state.config.currencyRates[state.currency] || 1;
    const symbol = state.config.currencySymbols[state.currency] || '$';
    const fmt = (v) => Math.round(v * rate).toLocaleString();

    if (max === null) return `${symbol}${fmt(min)}+`;
    if (min === 0) return `Under ${symbol}${fmt(max)}`;
    return `${symbol}${fmt(min)} – ${symbol}${fmt(max)}`;
  }

  function populateBudgets(projectKey) {
    const budgetSelect = document.getElementById('budget');
    if (!budgetSelect || !state.config) return;

    const project = state.config.projects.find((p) => p.key === projectKey);
    budgetSelect.innerHTML = '';

    if (!project) {
      budgetSelect.disabled = true;
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.selected = true;
      opt.textContent = 'Select project type first';
      budgetSelect.appendChild(opt);
      return;
    }

    budgetSelect.disabled = false;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Select a budget range';
    budgetSelect.appendChild(placeholder);

    project.budgets.forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b.key;
      opt.textContent = formatRange(b.min, b.max);
      budgetSelect.appendChild(opt);
    });
  }

  function wireProjectSelect() {
    const projectSelect = document.getElementById('project');
    if (!projectSelect) return;
    projectSelect.addEventListener('change', () => populateBudgets(projectSelect.value));
    // in case a project is already selected (e.g. browser autofill/back-nav)
    if (projectSelect.value) populateBudgets(projectSelect.value);
  }
})();

/* =====================================================================
   home.js — The home page (tool grid, category tabs, search)
   ---------------------------------------------------------------------
   Everything on the grid is generated from tools-data.js.

   Two filters work together:
     - the category tabs  (All, PDF, Image ...)
     - the search box     (title, description, keywords, formats ...)

   The chosen tab is stored in the address (?category=image), so a link
   from the header menu or a footer can open the page already filtered,
   and the browser's Back button keeps working.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var esc = A.escapeHtml;

  var grid = document.getElementById('tools-grid');
  var tabsBox = document.getElementById('category-tabs');
  var searchForm = document.getElementById('hero-search');
  var searchInput = document.getElementById('home-search');
  var emptyState = document.getElementById('no-results');
  var chipsBox = document.getElementById('available-chips');
  var resultCount = document.getElementById('result-count');
  var clearButton = document.getElementById('clear-filters');
  if (!grid || !tabsBox) return;

  var state = { category: 'all', query: '' };

  /* ---------- Reading the address ---------- */

  /** Reads ?category=... from the address; ignores unknown values. */
  function readCategoryFromUrl() {
    var value = new URLSearchParams(window.location.search).get('category');
    return A.getCategory(value) ? value : 'all';
  }

  /** Writes the category into the address without adding a history entry. */
  function writeCategoryToUrl() {
    var url = new URL(window.location.href);
    if (state.category === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', state.category);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  /* ---------- Rendering ---------- */

  /** One tool card. Live tools are links, upcoming ones are buttons. */
  function cardHtml(tool) {
    var live = A.isLive(tool);
    var badgeClass = tool.badge === 'AI Tool' ? 'tool-badge is-accent' : 'tool-badge';

    var inner = '' +
      '<span class="tool-card-top">' +
        '<span class="tool-icon">' + A.icon(tool.icon) + '</span>' +
        '<span class="' + badgeClass + '">' + esc(tool.badge) + '</span>' +
      '</span>' +
      '<span class="tool-title">' + esc(tool.title) + '</span>' +
      '<span class="tool-desc">' + esc(tool.description) + '</span>' +
      '<span class="tool-card-foot">' +
        (live
          ? '<span>Open tool</span>' + A.icon('arrow-right')
          : '<span class="tool-soon">Coming soon</span>') +
      '</span>';

    if (live) {
      return '<a class="tool-card tone-' + tool.tone + '" href="' + esc(tool.url) + '">' + inner + '</a>';
    }
    return '<button type="button" class="tool-card is-soon tone-' + tool.tone + '" data-soon="' + esc(tool.title) + '">' + inner + '</button>';
  }

  /** Tabs: "All tools" plus one per category, each with a counter. */
  function renderTabs() {
    var tabs = [{ id: 'all', label: 'All tools', icon: 'zap', tone: 'rose', count: A.TOOLS.length }];
    A.CATEGORIES.forEach(function (category) {
      tabs.push({
        id: category.id,
        label: category.label,
        icon: category.icon,
        tone: category.tone,
        count: A.toolsByCategory(category.id).length
      });
    });

    tabsBox.innerHTML = tabs.map(function (tab) {
      var active = tab.id === state.category;
      return '' +
        '<button type="button" class="tab' + (active ? ' is-active' : '') + '" data-category="' + tab.id + '" aria-pressed="' + active + '">' +
          '<span class="tab-icon tone-' + tab.tone + '">' + A.icon(tab.icon) + '</span>' +
          '<span>' + esc(tab.label) + '</span>' +
          '<span class="tab-count">' + tab.count + '</span>' +
        '</button>';
    }).join('');
  }

  /** Quick links under the search box: the tools that already work. */
  function renderChips() {
    if (!chipsBox) return;
    var live = A.TOOLS.filter(A.isLive);
    if (!live.length) { chipsBox.hidden = true; return; }

    chipsBox.innerHTML = '<span class="chip-label">Available now:</span>' + live.map(function (tool) {
      return '<a class="chip" href="' + esc(tool.url) + '">' + esc(tool.title) + '</a>';
    }).join('');
  }

  /** Draws the grid for the current category + search text. */
  function renderGrid() {
    var tools = A.searchTools(state.query, { category: state.category });

    grid.innerHTML = tools.map(cardHtml).join('');
    emptyState.hidden = tools.length > 0;
    grid.hidden = tools.length === 0;

    if (resultCount) {
      var filtered = state.query || state.category !== 'all';
      resultCount.textContent = filtered
        ? tools.length + (tools.length === 1 ? ' tool found' : ' tools found')
        : '';
    }
    if (clearButton) clearButton.hidden = !(state.query || state.category !== 'all');
  }

  function render() {
    renderTabs();
    renderGrid();
  }

  /* ---------- Events ---------- */

  tabsBox.addEventListener('click', function (event) {
    var tab = event.target.closest('.tab');
    if (!tab) return;
    state.category = tab.getAttribute('data-category');
    writeCategoryToUrl();
    render();
  });

  // Search as you type.
  searchInput.addEventListener('input', function () {
    state.query = searchInput.value;
    renderGrid();
  });

  // Pressing Enter or the Search button scrolls down to the results.
  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    state.query = searchInput.value;
    renderGrid();
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
  });

  // "Clear filters" (also used by the empty state).
  function clearFilters() {
    state.category = 'all';
    state.query = '';
    searchInput.value = '';
    writeCategoryToUrl();
    render();
  }
  document.querySelectorAll('[data-clear-filters]').forEach(function (button) {
    button.addEventListener('click', clearFilters);
  });

  // Back / forward buttons.
  window.addEventListener('popstate', function () {
    state.category = readCategoryFromUrl();
    render();
  });

  /* ---------- Start ---------- */
  state.category = readCategoryFromUrl();
  renderChips();
  render();
})();

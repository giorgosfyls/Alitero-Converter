/* =====================================================================
   search-modal.js — The search window (Ctrl/⌘ + K)
   ---------------------------------------------------------------------
   Opens from any element with the attribute  data-open-search  or with
   the keyboard shortcut. Results come from Alitero.searchTools()
   (tools-data.js), so new tools are searchable automatically.

   Keyboard:  ↑ / ↓ move   Enter opens   Esc closes
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var esc = A.escapeHtml;

  var modal = document.getElementById('search-modal');
  var input = document.getElementById('search-input');
  var list = document.getElementById('search-list');
  if (!modal || !input || !list) return;

  var MAX_RESULTS = 8;
  var results = [];       // tools currently listed
  var activeIndex = 0;    // highlighted row
  var lastFocused = null; // element to give focus back to on close

  /* ---------- Rendering ---------- */

  /** Builds one result row. */
  function rowHtml(tool, index) {
    var live = A.isLive(tool);
    var category = A.getCategory(tool.category);
    return '' +
      '<li role="option" id="search-option-' + index + '" class="search-result' + (index === activeIndex ? ' is-active' : '') + '" data-index="' + index + '">' +
        '<span class="dd-icon tone-' + tool.tone + '">' + A.icon(tool.icon) + '</span>' +
        '<span class="dd-text">' +
          '<span class="dd-title">' + esc(tool.title) + '</span>' +
          '<span class="dd-sub">' + esc(category ? category.label : '') + ' · ' + esc(tool.tagline) + '</span>' +
        '</span>' +
        (live ? '' : '<span class="soon-pill">Soon</span>') +
      '</li>';
  }

  /** Re-renders the list for the current query. */
  function render() {
    var query = input.value.trim();
    results = A.searchTools(query).slice(0, MAX_RESULTS);
    if (activeIndex >= results.length) activeIndex = 0;

    if (!results.length) {
      list.innerHTML = '<li class="search-empty">No tools found for “' + esc(query) + '”.</li>';
      input.removeAttribute('aria-activedescendant');
      return;
    }

    var label = query ? '' : '<li class="search-group-label" aria-hidden="true">Suggested tools</li>';
    list.innerHTML = label + results.map(rowHtml).join('');
    input.setAttribute('aria-activedescendant', 'search-option-' + activeIndex);
  }

  /** Highlights a row without rebuilding the whole list. */
  function setActive(index) {
    if (!results.length) return;
    activeIndex = (index + results.length) % results.length;
    list.querySelectorAll('.search-result').forEach(function (row) {
      row.classList.toggle('is-active', Number(row.getAttribute('data-index')) === activeIndex);
    });
    var row = document.getElementById('search-option-' + activeIndex);
    input.setAttribute('aria-activedescendant', 'search-option-' + activeIndex);
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- Open / close ---------- */

  function open() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    input.value = '';
    activeIndex = 0;
    render();
    document.body.classList.add('no-scroll');
    input.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  /** Opens the highlighted tool (or explains that it is not ready yet). */
  function choose(index) {
    var tool = results[index];
    if (!tool) return;
    close();
    if (A.isLive(tool)) {
      window.location.href = tool.url;
    } else {
      A.toast(tool.title + ' is coming soon.');
    }
  }

  /* ---------- Events ---------- */

  input.addEventListener('input', function () {
    activeIndex = 0;
    render();
  });

  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); choose(activeIndex); }
  });

  list.addEventListener('click', function (event) {
    var row = event.target.closest('.search-result');
    if (row) choose(Number(row.getAttribute('data-index')));
  });

  // Clicking the dark backdrop or the Esc button closes the window.
  modal.addEventListener('mousedown', function (event) {
    if (event.target === modal || event.target.closest('[data-close-search]')) close();
  });

  // Any element with data-open-search opens the window.
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-open-search]')) {
      event.preventDefault();
      open();
    }
  });

  document.addEventListener('keydown', function (event) {
    // Ctrl/⌘ + K toggles the window.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (modal.hidden) open(); else close();
    } else if (event.key === 'Escape' && !modal.hidden) {
      close();
    }
  });

  // Other scripts can open the window with Alitero.openSearch().
  A.openSearch = open;
})();

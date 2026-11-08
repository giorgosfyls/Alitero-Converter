/* =====================================================================
   layout.js — Builds the header, mobile menu, footer and search window
   ---------------------------------------------------------------------
   Every page contains just two empty placeholders:

       <div id="site-header"></div>   ...page content...   <div id="site-footer"></div>

   This file fills them in. Because the header and footer exist in ONE
   place only, you never have to copy them into each new tool page.
   The menus are generated from tools-data.js, so adding a tool there
   updates the navigation and the footer automatically.

   Behaviour (opening dropdowns, theme button, search) lives in:
   nav.js, theme.js and search-modal.js.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var esc = A.escapeHtml;
  var icon = A.icon;

  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var SHORTCUT = IS_MAC ? '⌘K' : 'Ctrl K';

  /* -------------------------------------------------------------------
     Small building blocks
     ------------------------------------------------------------------- */

  /** Link to the home page, showing one category (see pages/home.js). */
  function categoryUrl(categoryId) {
    return 'index.html?category=' + encodeURIComponent(categoryId) + '#tools';
  }

  /**
   * One row inside a dropdown or the mobile menu.
   * Live tools are real links; upcoming tools are buttons that show a
   * "coming soon" message (handled by the global click handler below).
   */
  function menuItem(tool) {
    var inner =
      '<span class="dd-icon tone-' + tool.tone + '">' + icon(tool.icon) + '</span>' +
      '<span class="dd-text">' +
        '<span class="dd-title">' + esc(tool.title) + '</span>' +
        '<span class="dd-sub">' + esc(tool.tagline) + '</span>' +
      '</span>';

    if (A.isLive(tool)) {
      return '<a class="dd-item" href="' + esc(tool.url) + '">' + inner + '</a>';
    }
    return '<button type="button" class="dd-item is-soon" data-soon="' + esc(tool.title) + '">' +
      inner + '<span class="soon-pill">Soon</span></button>';
  }

  /* -------------------------------------------------------------------
     Announcement bar (very top of the page)
     ------------------------------------------------------------------- */
  function renderAnnouncement() {
    return '' +
      '<div class="announce">' +
        '<span class="announce-inner">' + icon('sparkles') +
          '<span>New: the <strong>Image Converter</strong> is live. More tools are on the way!</span>' +
        '</span>' +
      '</div>';
  }

  /* -------------------------------------------------------------------
     Header: logo, desktop dropdown menus, search / theme / menu buttons
     ------------------------------------------------------------------- */
  function renderDesktopNav() {
    return A.CATEGORIES.map(function (category, index) {
      var tools = A.toolsByCategory(category.id);
      // The last dropdowns open towards the left so they never leave the screen.
      var align = index >= A.CATEGORIES.length - 2 ? ' align-right' : '';

      return '' +
        '<div class="nav-item" data-category="' + category.id + '">' +
          '<button type="button" class="nav-link" aria-expanded="false" aria-haspopup="true" aria-controls="dd-' + category.id + '">' +
            '<span class="nav-link-icon tone-' + category.tone + '">' + icon(category.icon) + '</span>' +
            '<span>' + esc(category.navLabel) + '</span>' +
            icon('chevron-down', 'nav-chevron') +
          '</button>' +
          '<div class="dropdown' + align + '" id="dd-' + category.id + '">' +
            '<div class="dropdown-panel">' +
              '<p class="dropdown-title">' + esc(category.menuTitle) + '</p>' +
              tools.map(menuItem).join('') +
              '<a class="dropdown-all" href="' + categoryUrl(category.id) + '">' +
                'View all ' + esc(category.label.toLowerCase()) + icon('arrow-right') +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderMobileMenu() {
    var groups = A.CATEGORIES.map(function (category) {
      var tools = A.toolsByCategory(category.id);
      return '' +
        '<div class="mm-group">' +
          '<button type="button" class="mm-toggle" aria-expanded="false" aria-controls="mm-' + category.id + '">' +
            '<span class="nav-link-icon tone-' + category.tone + '">' + icon(category.icon) + '</span>' +
            '<span class="mm-label">' + esc(category.label) + '</span>' +
            icon('chevron-down', 'nav-chevron') +
          '</button>' +
          '<div class="mm-panel" id="mm-' + category.id + '" hidden>' +
            tools.map(menuItem).join('') +
            '<a class="dropdown-all" href="' + categoryUrl(category.id) + '">' +
              'View all ' + esc(category.label.toLowerCase()) + icon('arrow-right') +
            '</a>' +
          '</div>' +
        '</div>';
    }).join('');

    return '' +
      '<div class="mobile-menu" id="mobile-menu" hidden>' +
        '<div class="container">' +
          '<button type="button" class="mm-search" data-open-search>' + icon('search') +
            '<span>Search tools…</span></button>' +
          groups +
          '<a class="mm-home" href="index.html#tools">' + icon('home') + '<span>All tools</span></a>' +
        '</div>' +
      '</div>';
  }

  function renderHeader() {
    return '' +
      '<header class="site-header" id="site-header-bar">' +
        '<div class="container header-inner">' +

          '<a class="brand" href="index.html" aria-label="Alitero.org home">' +
            '<span class="brand-mark" aria-hidden="true">A</span>' +
            '<span class="brand-text">' +
              '<span class="brand-name">Alitero<span class="brand-tld">.org</span></span>' +
              '<span class="brand-tagline">All-in-one converter</span>' +
            '</span>' +
          '</a>' +

          '<nav class="nav-desktop" aria-label="Tool categories">' + renderDesktopNav() + '</nav>' +

          '<div class="header-actions">' +
            '<button type="button" class="search-trigger" data-open-search aria-label="Search tools">' +
              icon('search') +
              '<span class="search-trigger-label">Search…</span>' +
              '<kbd class="kbd">' + SHORTCUT + '</kbd>' +
            '</button>' +
            '<button type="button" class="icon-btn theme-toggle" id="theme-toggle" aria-label="Switch to dark theme" title="Switch theme">' +
              icon('moon', 'i-moon') + icon('sun', 'i-sun') +
            '</button>' +
            // Three lines that turn into an X when the menu is open (see layout.css).
            '<button type="button" class="icon-btn menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">' +
              '<span class="menu-bar"></span><span class="menu-bar"></span><span class="menu-bar"></span>' +
            '</button>' +
          '</div>' +

        '</div>' +
        renderMobileMenu() +
      '</header>';
  }

  /* -------------------------------------------------------------------
     Footer
     ------------------------------------------------------------------- */
  function footerLink(tool) {
    if (A.isLive(tool)) {
      return '<li><a class="footer-link" href="' + esc(tool.url) + '">' + esc(tool.title) + '</a></li>';
    }
    return '<li><button type="button" class="footer-link" data-soon="' + esc(tool.title) + '">' + esc(tool.title) + '</button></li>';
  }

  function renderFooter() {
    // Which categories share each footer column.
    var columns = [
      { title: 'PDF Suite',            categories: ['pdf'] },
      { title: 'Images & Media',       categories: ['image', 'media'] },
      { title: 'Developer & Archives', categories: ['dev', 'archive'] }
    ];

    var columnsHtml = columns.map(function (column) {
      var tools = [];
      column.categories.forEach(function (id) { tools = tools.concat(A.toolsByCategory(id)); });
      return '' +
        '<div class="footer-col">' +
          '<h4 class="footer-heading">' + esc(column.title) + '</h4>' +
          '<ul>' + tools.slice(0, 6).map(footerLink).join('') + '</ul>' +
        '</div>';
    }).join('');

    return '' +
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-brand">' +
              '<a class="brand" href="index.html" aria-label="Alitero.org home">' +
                '<span class="brand-mark brand-mark-sm" aria-hidden="true">A</span>' +
                '<span class="brand-name">Alitero<span class="brand-tld">.org</span></span>' +
              '</a>' +
              '<p>The all-in-one online converter for PDF documents, images, video, audio and developer tools. ' +
              'Files are processed on your own device.</p>' +
            '</div>' +
            columnsHtml +
          '</div>' +
          '<div class="footer-bottom">' +
            '<p>&copy; ' + new Date().getFullYear() + ' Alitero.org. All rights reserved.</p>' +
            '<div class="footer-legal">' +
              '<a href="#">Terms of use</a><a href="#">Privacy policy</a><a href="contact.html">Contact</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  /* -------------------------------------------------------------------
     Search window (opened with the search button or Ctrl/⌘ + K)
     The behaviour is in search-modal.js.
     ------------------------------------------------------------------- */
  function renderSearchModal() {
    return '' +
      '<div class="search-modal" id="search-modal" hidden>' +
        '<div class="search-dialog" role="dialog" aria-modal="true" aria-label="Search tools">' +
          '<div class="search-head">' + icon('search') +
            '<input type="text" id="search-input" class="search-input" placeholder="Search for a tool…" autocomplete="off" spellcheck="false" aria-label="Search tools">' +
            '<button type="button" class="search-esc" data-close-search aria-label="Close search">Esc</button>' +
          '</div>' +
          '<ul class="search-list" id="search-list"></ul>' +
          '<div class="search-foot"><span><kbd class="kbd">↑</kbd> <kbd class="kbd">↓</kbd> to move</span><span><kbd class="kbd">Enter</kbd> to open</span></div>' +
        '</div>' +
      '</div>';
  }

  /* -------------------------------------------------------------------
     Mount everything into the page
     ------------------------------------------------------------------- */
  var headerSlot = document.getElementById('site-header');
  if (headerSlot) headerSlot.innerHTML = renderAnnouncement() + renderHeader();

  var footerSlot = document.getElementById('site-footer');
  if (footerSlot) footerSlot.innerHTML = renderFooter();

  document.body.insertAdjacentHTML('beforeend', renderSearchModal());

  // Highlight the category of the tool page we are on (e.g. "Image Tools").
  var currentToolId = document.body.getAttribute('data-tool');
  var currentTool = currentToolId && A.getTool(currentToolId);
  if (currentTool) {
    var activeItem = document.querySelector('.nav-item[data-category="' + currentTool.category + '"] .nav-link');
    if (activeItem) activeItem.classList.add('is-active');
  }

  // Turn any <span data-icon="..."> in the page into real icons.
  A.hydrateIcons();

  /* -------------------------------------------------------------------
     Global handler for "coming soon" tools
     Any element with data-soon="Tool name" (menu rows, cards, footer
     links) shows a message instead of navigating.
     ------------------------------------------------------------------- */
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-soon]');
    if (!target) return;
    event.preventDefault();
    A.toast(target.getAttribute('data-soon') + ' is coming soon.');
  });

  A.SHORTCUT_LABEL = SHORTCUT;
})();

/* =====================================================================
   nav.js — Header behaviour
   ---------------------------------------------------------------------
   1. Desktop: category dropdown menus
        - open on mouse hover AND on click / Enter / Space (so keyboard
          and touch users can use them too)
        - close on Escape, on click outside, or when focus leaves
   2. Mobile / tablet: the hamburger button
        - three lines <-> X, opens a menu panel under the header
        - each category inside is an accordion
   ===================================================================== */
(function () {
  'use strict';

  var header = document.getElementById('site-header-bar');
  if (!header) return;

  // Must match the breakpoint in layout.css where the desktop menu appears.
  var DESKTOP = window.matchMedia('(min-width: 1120px)');
  var CAN_HOVER = window.matchMedia('(hover: hover)');

  /* ===================================================================
     1. Desktop dropdowns
     =================================================================== */
  var items = Array.prototype.slice.call(header.querySelectorAll('.nav-item'));
  var closeTimer = null;

  /** Opens or closes one dropdown and keeps aria-expanded in sync. */
  function setItemOpen(item, open) {
    item.classList.toggle('is-open', open);
    item.querySelector('.nav-link').setAttribute('aria-expanded', String(open));
  }

  /** Closes every dropdown except (optionally) one. */
  function closeDropdowns(except) {
    items.forEach(function (item) {
      if (item !== except) setItemOpen(item, false);
    });
  }

  items.forEach(function (item) {
    var button = item.querySelector('.nav-link');

    // Click: on devices with a mouse the hover already opened it, so a
    // click keeps it open. On touch screens a click toggles it.
    button.addEventListener('click', function (event) {
      event.stopPropagation();
      var willOpen = CAN_HOVER.matches ? true : !item.classList.contains('is-open');
      closeDropdowns(item);
      setItemOpen(item, willOpen);
    });

    // Hover with a small delay so moving the mouse towards the panel
    // does not close it by accident.
    item.addEventListener('mouseenter', function () {
      if (!CAN_HOVER.matches) return;
      clearTimeout(closeTimer);
      closeDropdowns(item);
      setItemOpen(item, true);
    });
    item.addEventListener('mouseleave', function () {
      if (!CAN_HOVER.matches) return;
      closeTimer = setTimeout(function () { setItemOpen(item, false); }, 160);
    });

    // Keyboard: close when focus moves out of this dropdown.
    item.addEventListener('focusout', function (event) {
      if (!item.contains(event.relatedTarget)) setItemOpen(item, false);
    });
  });

  // Choosing something inside a dropdown closes it.
  header.querySelectorAll('.dropdown a, .dropdown .dd-item').forEach(function (element) {
    element.addEventListener('click', function () { closeDropdowns(); });
  });

  /* ===================================================================
     2. Mobile menu
     =================================================================== */
  var menuButton = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');

  /**
   * Opens or closes the mobile menu.
   * @param {boolean} open
   */
  function setMenuOpen(open) {
    if (!menuButton || !menu) return;
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  function isMenuOpen() {
    return !!menu && !menu.hidden;
  }

  if (menuButton && menu) {
    menuButton.addEventListener('click', function (event) {
      event.stopPropagation();
      setMenuOpen(!isMenuOpen());
    });

    // Accordion: each category button shows / hides its list of tools.
    menu.querySelectorAll('.mm-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var panel = document.getElementById(toggle.getAttribute('aria-controls'));
        var willOpen = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(willOpen));
        if (panel) panel.hidden = !willOpen;
      });
    });

    // Following a real link or opening the search closes the menu.
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a, [data-soon], [data-open-search]')) setMenuOpen(false);
    });
  }

  /* ===================================================================
     Shared: outside click, Escape, resizing
     =================================================================== */
  document.addEventListener('click', function (event) {
    if (!header.contains(event.target)) {
      closeDropdowns();
      if (isMenuOpen()) setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeDropdowns();
    if (isMenuOpen()) {
      setMenuOpen(false);
      if (menuButton) menuButton.focus();
    }
  });

  // Resizing from phone to desktop width: reset everything.
  DESKTOP.addEventListener('change', function (event) {
    if (event.matches) setMenuOpen(false);
    else closeDropdowns();
  });
})();

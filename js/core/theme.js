/* =====================================================================
   theme.js — Light / dark theme button
   ---------------------------------------------------------------------
   The starting theme is already applied by theme-init.js (in <head>).
   This file only handles the button in the header: it flips the theme,
   updates the accessible label and remembers the choice.

   All colours are CSS variables in base.css. The theme is simply the
   attribute  <html data-theme="light|dark">.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var root = document.documentElement;
  var button = document.getElementById('theme-toggle');
  if (!button) return;

  /** Keeps the button's screen-reader label in sync with the theme. */
  function updateLabel() {
    var isDark = root.getAttribute('data-theme') === 'dark';
    button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  /**
   * Applies a theme and remembers it.
   * @param {'light'|'dark'} theme
   */
  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('alitero.theme', theme); } catch (error) { /* ignore */ }
    updateLabel();
  }

  button.addEventListener('click', function () {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  updateLabel();
})();

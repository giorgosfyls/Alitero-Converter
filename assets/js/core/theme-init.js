/* =====================================================================
   theme-init.js — Applies the saved colour theme before the page paints
   ---------------------------------------------------------------------
   Loaded in <head> as a normal (blocking) script on purpose: it runs
   before the body is rendered, so a dark-mode visitor never sees a
   white flash. The toggle button itself lives in theme.js.

   Priority:  1) the visitor's saved choice  2) the system preference.
   ===================================================================== */
(function () {
  'use strict';

  var theme = 'light';

  try {
    var saved = localStorage.getItem('alitero.theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (error) {
    /* Storage can be blocked (private mode, strict settings). Use light. */
  }

  document.documentElement.setAttribute('data-theme', theme);
})();

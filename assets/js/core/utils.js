/* =====================================================================
   utils.js — Small helpers shared by every page
   ---------------------------------------------------------------------
   This is the FIRST script loaded on every page. It creates the global
   `Alitero` namespace that all other scripts attach themselves to, so
   we never pollute `window` with dozens of loose functions.

   Provides:
     Alitero.escapeHtml(text)         -> safe text for innerHTML
     Alitero.formatBytes(bytes)       -> "1.4 MB"
     Alitero.debounce(fn, ms)         -> delayed function
     Alitero.storage.get / .set       -> localStorage that never throws
     Alitero.toast(message, options)  -> small pop-up message
   ===================================================================== */
(function () {
  'use strict';

  var Alitero = (window.Alitero = window.Alitero || {});

  /* ---------- Text helpers ---------- */

  /**
   * Escapes characters that have a special meaning in HTML.
   * ALWAYS use this when putting user-controlled text (like file names)
   * into an innerHTML string.
   * @param {*} value
   * @returns {string}
   */
  Alitero.escapeHtml = function (value) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value).replace(/[&<>"']/g, function (char) { return map[char]; });
  };

  /**
   * Converts a byte count to a short human-readable string.
   * @param {number} bytes
   * @returns {string} e.g. "532 B", "14.2 KB", "3.07 MB"
   */
  Alitero.formatBytes = function (bytes) {
    if (!isFinite(bytes) || bytes < 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  /**
   * Returns a version of `fn` that waits `wait` ms after the last call.
   * Useful for search-as-you-type.
   * @param {Function} fn
   * @param {number} wait - milliseconds
   * @returns {Function}
   */
  Alitero.debounce = function (fn, wait) {
    var timer;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(context, args); }, wait);
    };
  };

  /* ---------- Safe storage ---------- */

  /**
   * localStorage wrapper. Reading or writing can throw (private mode,
   * blocked cookies), so every call is wrapped in try/catch.
   * Values are stored as JSON.
   */
  Alitero.storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        /* Ignore: the site works fine without saved settings. */
      }
    }
  };

  /* ---------- Toast messages ---------- */

  /**
   * Shows a small message at the bottom of the screen for a few seconds.
   * @param {string} message
   * @param {{type?: 'info'|'success'|'error', duration?: number}} [options]
   */
  Alitero.toast = function (message, options) {
    options = options || {};
    var type = options.type || 'info';
    var duration = options.duration || 3200;

    // The region is created on first use and reused afterwards.
    // aria-live makes screen readers announce new messages.
    var region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    region.appendChild(toast);

    // Next frame: add the class that triggers the fade-in transition.
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });

    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 250);
    }, duration);
  };
})();

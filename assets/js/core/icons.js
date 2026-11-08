/* =====================================================================
   icons.js — The site's icon set (inline SVG, no external font)
   ---------------------------------------------------------------------
   Every icon is a 24x24 line icon. Only the inner shapes are stored
   here; Alitero.icon() wraps them in a complete <svg> element.
   Icons take the text colour of their parent (stroke="currentColor") and
   their size from the parent's font-size (see `.icon` in base.css).

   Usage in JavaScript:   Alitero.icon('search')
   Usage in HTML:         <span data-icon="search"></span>
                          (replaced automatically by Alitero.hydrateIcons)
   ===================================================================== */
(function () {
  'use strict';

  var Alitero = (window.Alitero = window.Alitero || {});

  var PATHS = {
    /* --- Interface --- */
    'search':        '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    'sun':           '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    'moon':          '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    'chevron-down':  '<polyline points="6 9 12 15 18 9"/>',
    'chevron-right': '<polyline points="9 6 15 12 9 18"/>',
    'arrow-right':   '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'home':          '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    'x':             '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    'plus':          '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'check':         '<polyline points="5 12.5 10 17.5 19 7.5"/>',
    'alert':         '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><circle cx="12" cy="16" r=".6" fill="currentColor"/>',
    'sparkles':      '<path d="M11 3l1.8 4.7L17.5 9.5l-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    'shield':        '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><polyline points="8.5 12 11 14.5 15.5 9.5"/>',
    'upload-cloud':  '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1 .5 7.97"/><polyline points="9 14 12 11 15 14"/><line x1="12" y1="11" x2="12" y2="20"/>',
    'folder-open':   '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'trash':         '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/>',
    'download':      '<line x1="12" y1="4" x2="12" y2="15"/><polyline points="7 11 12 16 17 11"/><path d="M5 20h14"/>',
    'zap':           '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',

    /* --- Tools --- */
    'file-text':     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>',
    'compress':      '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>',
    'layers':        '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    'scissors':      '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/>',
    'wand':          '<path d="M4 20L15 9"/><path d="M14 6l4 4"/><path d="M18 3v3M16.5 4.5h3M20 12v2M19 13h2"/>',
    'image':         '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="M21 16l-5-5-9 9"/>',
    'file-image':    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/><circle cx="10" cy="12.5" r="1.2"/><path d="M18 18l-3.5-3.5L8 20"/>',
    'swap':          '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    'resize':        '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
    'music':         '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    'headphones':    '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
    'film':          '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    'bolt':          '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    'code':          '<polyline points="8 8 4 12 8 16"/><polyline points="16 8 20 12 16 16"/><line x1="14" y1="5" x2="10" y2="19"/>',
    'qr':            '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-4"/>',
    'archive':       '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
    'book':          '<path d="M2 5a2 2 0 0 1 2-1h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H2z"/><path d="M22 5a2 2 0 0 0-2-1h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h8z"/>'
  };

  /**
   * Returns the complete <svg> markup for an icon.
   * @param {string} name       icon name (a key of PATHS above)
   * @param {string} [extraClass] optional CSS class(es) for the <svg>
   * @returns {string} HTML string ("" if the icon does not exist)
   */
  Alitero.icon = function (name, extraClass) {
    var inner = PATHS[name];
    if (!inner) return '';
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>';
  };

  /**
   * Replaces the content of every element that has a data-icon="name"
   * attribute with the matching SVG. Call it again after adding new HTML.
   * @param {ParentNode} [root=document]
   */
  Alitero.hydrateIcons = function (root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (element) {
      element.innerHTML = Alitero.icon(element.getAttribute('data-icon'));
    });
  };
})();

/* =====================================================================
   tools-data.js — THE list of categories and tools (single source of truth)
   ---------------------------------------------------------------------
   The home page grid, the header dropdown menus, the mobile menu, the
   footer and the search box are ALL generated from this file.

   >>> To add a new tool: add one object to Alitero.TOOLS below. <<<
   Nothing else needs to change.

   Tool fields
     id           unique slug, e.g. "image-converter"
     category     one of the category ids below
     title        name shown on cards and menus
     tagline      very short text for the dropdown menus
     description  one or two sentences for the card
     formats      supported formats (shown on the tool page)
     icon         icon name from icons.js
     tone         colour name used for the icon box (see base.css)
     badge        tiny label on the card ("PDF", "IMAGE", "AI Tool" ...)
     keywords     extra words that should find the tool in the search
     status       "live"  = ready to use (needs `url`)
                  "soon"  = shown, but not clickable yet
     url          page of the tool (only for live tools)
   ===================================================================== */
(function () {
  'use strict';

  var Alitero = (window.Alitero = window.Alitero || {});

  /* ---------- Categories (order = order in the navigation) ---------- */
  Alitero.CATEGORIES = [
    { id: 'pdf',     label: 'PDF Tools',         navLabel: 'PDF Tools',     icon: 'file-text', tone: 'red',     menuTitle: 'Popular PDF tools' },
    { id: 'image',   label: 'Image Tools',       navLabel: 'Image Tools',   icon: 'image',     tone: 'emerald', menuTitle: 'Image tools' },
    { id: 'media',   label: 'Audio & Video',     navLabel: 'Audio & Video', icon: 'film',      tone: 'amber',   menuTitle: 'Media & audio' },
    { id: 'dev',     label: 'Developer Tools',   navLabel: 'Developer',     icon: 'code',      tone: 'cyan',    menuTitle: 'Developer & data' },
    { id: 'archive', label: 'Archives & Ebooks', navLabel: 'Archives',      icon: 'archive',   tone: 'indigo',  menuTitle: 'Archives & ebooks' }
  ];

  /* ---------- Tools ---------- */
  Alitero.TOOLS = [

    /* ===== PDF ===== */
    {
      id: 'pdf-to-word', category: 'pdf', status: 'soon',
      title: 'PDF to Word', tagline: 'Keep the formatting',
      description: 'Turn PDF files into editable Word documents (.docx) while keeping fonts, layout and tables.',
      formats: 'PDF', icon: 'file-text', tone: 'blue', badge: 'PDF',
      keywords: 'pdf word docx doc editable convert'
    },
    {
      id: 'compress-pdf', category: 'pdf', status: 'soon',
      title: 'Compress PDF', tagline: 'Reduce the size in MB',
      description: 'Shrink PDF files so they are easy to email, without losing readability.',
      formats: 'PDF', icon: 'compress', tone: 'red', badge: 'PDF',
      keywords: 'pdf compress reduce size smaller optimize'
    },
    {
      id: 'merge-pdf', category: 'pdf', status: 'soon',
      title: 'Merge PDF', tagline: 'Combine several PDFs',
      description: 'Combine two or more PDF files into one organised document, in the order you choose.',
      formats: 'PDF', icon: 'layers', tone: 'purple', badge: 'PDF',
      keywords: 'pdf merge join combine'
    },
    {
      id: 'split-pdf', category: 'pdf', status: 'soon',
      title: 'Split PDF', tagline: 'Extract pages',
      description: 'Pull out specific pages or split a PDF into several independent files.',
      formats: 'PDF', icon: 'scissors', tone: 'amber', badge: 'PDF',
      keywords: 'pdf split pages extract separate'
    },

    /* ===== IMAGES ===== */
    {
      id: 'remove-background', category: 'image', status: 'soon',
      title: 'AI Background Remover', tagline: 'Transparent PNG backgrounds',
      description: 'Remove the background from product photos or portraits automatically, with AI.',
      formats: 'JPG, PNG, WebP', icon: 'wand', tone: 'emerald', badge: 'AI Tool',
      keywords: 'background remover remove transparent cutout ai png'
    },
    {
      id: 'compress-image', category: 'image', status: 'soon',
      title: 'Compress Image', tagline: 'Smaller JPG, PNG, WebP',
      description: 'Optimise images for faster loading on the web without visible quality loss.',
      formats: 'JPG, PNG, WebP', icon: 'file-image', tone: 'teal', badge: 'IMAGE',
      keywords: 'image compress reduce size optimize jpg png webp photo'
    },
    {
      id: 'image-converter', category: 'image', status: 'live', url: 'image-converter.html',
      title: 'Image Converter', tagline: 'JPG, PNG, WebP, AVIF, BMP',
      description: 'Convert images between JPG, PNG, WebP, AVIF and BMP instantly, right in your browser. Batch conversion included.',
      formats: 'JPG, PNG, WebP, GIF, BMP, AVIF', icon: 'swap', tone: 'indigo', badge: 'IMAGE',
      keywords: 'image convert converter format jpg jpeg png webp avif bmp gif photo picture batch'
    },
    {
      id: 'resize-image', category: 'image', status: 'soon',
      title: 'Resize Image', tagline: 'Change the dimensions',
      description: 'Change the width and height of your images while keeping the aspect ratio.',
      formats: 'JPG, PNG, WebP', icon: 'resize', tone: 'cyan', badge: 'IMAGE',
      keywords: 'image resize scale dimensions pixels width height'
    },

    /* ===== AUDIO & VIDEO ===== */
    {
      id: 'mp4-to-mp3', category: 'media', status: 'soon',
      title: 'MP4 to MP3', tagline: 'Extract audio in HD',
      description: 'Extract the audio from any MP4, MOV or AVI video as a high-quality MP3 file.',
      formats: 'MP4, MOV, AVI', icon: 'music', tone: 'amber', badge: 'MEDIA',
      keywords: 'mp4 mp3 audio extract video sound'
    },
    {
      id: 'audio-converter', category: 'media', status: 'soon',
      title: 'Audio Converter', tagline: 'WAV, FLAC, MP3, AAC',
      description: 'Convert audio files between MP3, WAV, FLAC, AAC, OGG and M4A at high bitrates.',
      formats: 'MP3, WAV, FLAC, AAC, OGG, M4A', icon: 'headphones', tone: 'purple', badge: 'AUDIO',
      keywords: 'audio convert mp3 wav flac aac ogg m4a music sound'
    },
    {
      id: 'video-converter', category: 'media', status: 'soon',
      title: 'Video Converter', tagline: 'MP4, MKV, AVI, MOV',
      description: 'Change the video format to work on every device, with a choice of resolution.',
      formats: 'MP4, MKV, AVI, MOV, WebM', icon: 'film', tone: 'rose', badge: 'VIDEO',
      keywords: 'video convert mp4 mkv avi mov webm'
    },
    {
      id: 'video-to-gif', category: 'media', status: 'soon',
      title: 'Video to GIF', tagline: 'Animated GIFs',
      description: 'Turn short video clips into lightweight animated GIFs.',
      formats: 'MP4, MOV', icon: 'bolt', tone: 'yellow', badge: 'GIF',
      keywords: 'video gif animated maker clip'
    },

    /* ===== DEVELOPER ===== */
    {
      id: 'json-to-csv', category: 'dev', status: 'soon',
      title: 'JSON to CSV', tagline: 'Data parsing',
      description: 'Convert JSON structures into CSV / Excel tables for quick analysis.',
      formats: 'JSON, CSV', icon: 'code', tone: 'cyan', badge: 'DEV',
      keywords: 'json csv excel table parser data developer'
    },
    {
      id: 'qr-generator', category: 'dev', status: 'soon',
      title: 'QR Code Generator', tagline: 'QR image / SVG',
      description: 'Create custom QR codes for links, text and Wi-Fi networks in high resolution.',
      formats: 'URL, Text', icon: 'qr', tone: 'slate', badge: 'DEV',
      keywords: 'qr code generator wifi link scan'
    },

    /* ===== ARCHIVES & EBOOKS ===== */
    {
      id: 'zip-extractor', category: 'archive', status: 'soon',
      title: 'ZIP / RAR Extractor', tagline: 'Unzip online',
      description: 'Open and extract ZIP, RAR and 7Z archives right in the browser, with no app to install.',
      formats: 'ZIP, RAR, 7Z', icon: 'archive', tone: 'indigo', badge: 'ZIP',
      keywords: 'zip rar 7z extract unzip archive compress'
    },
    {
      id: 'epub-to-pdf', category: 'archive', status: 'soon',
      title: 'EPUB / MOBI to PDF', tagline: 'Ebook converter',
      description: 'Convert ebooks (EPUB, MOBI) to PDF so you can read them on any device.',
      formats: 'EPUB, MOBI', icon: 'book', tone: 'emerald', badge: 'EBOOK',
      keywords: 'epub mobi pdf ebook book reader kindle'
    }
  ];

  /* ---------- Helper functions ---------- */

  /** @returns {object|undefined} the tool with the given id */
  Alitero.getTool = function (id) {
    return Alitero.TOOLS.find(function (tool) { return tool.id === id; });
  };

  /** @returns {object|undefined} the category with the given id */
  Alitero.getCategory = function (id) {
    return Alitero.CATEGORIES.find(function (category) { return category.id === id; });
  };

  /** @returns {object[]} every tool of one category (registry order) */
  Alitero.toolsByCategory = function (categoryId) {
    return Alitero.TOOLS.filter(function (tool) { return tool.category === categoryId; });
  };

  /** @returns {boolean} true when the tool is ready to be opened */
  Alitero.isLive = function (tool) {
    return tool.status === 'live' && !!tool.url;
  };

  /**
   * Searches tools. Every word typed must appear somewhere in the tool's
   * title, description, keywords, formats or category name.
   * An empty query returns everything (optionally limited to a category).
   *
   * @param {string} query
   * @param {{category?: string}} [options]  category id or "all"
   * @returns {object[]} matching tools. Live tools come first.
   */
  Alitero.searchTools = function (query, options) {
    options = options || {};
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    var category = options.category && options.category !== 'all' ? options.category : null;

    var results = Alitero.TOOLS.filter(function (tool) {
      if (category && tool.category !== category) return false;
      if (!words.length) return true;

      var categoryLabel = (Alitero.getCategory(tool.category) || {}).label || '';
      var haystack = [tool.title, tool.tagline, tool.description, tool.keywords, tool.formats, categoryLabel]
        .join(' ')
        .toLowerCase();

      return words.every(function (word) { return haystack.indexOf(word) !== -1; });
    });

    // Stable sort: tools that already work are listed first.
    return results
      .map(function (tool, index) { return { tool: tool, index: index }; })
      .sort(function (a, b) {
        var liveDiff = Number(Alitero.isLive(b.tool)) - Number(Alitero.isLive(a.tool));
        return liveDiff || a.index - b.index;
      })
      .map(function (entry) { return entry.tool; });
  };
})();

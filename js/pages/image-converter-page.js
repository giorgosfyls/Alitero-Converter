/* =====================================================================
   image-converter-page.js — The Image Converter page
   ---------------------------------------------------------------------
   Everything the visitor sees and clicks on image-converter.html.
   The actual conversion is done by converters/image-converter.js;
   packing several files into a .zip is done by lib/zip.js.

   Flow:   choose / drop / paste images  ->  pick a format & quality
           ->  Convert  ->  download one by one, or all as a ZIP.

   Page states
     upload stage : big drop zone (no files yet)
     ready stage  : list of files + settings + Convert button
     each file    : ready -> working -> done | error
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var IC = A.ImageConverter;
  var esc = A.escapeHtml;

  function $(id) { return document.getElementById(id); }

  var els = {
    workspace: $('workspace'),
    dropZone: $('drop-zone'),
    chooseButton: $('choose-files'),
    fileInput: $('file-input'),
    notice: $('notice'),
    stageUpload: $('stage-upload'),
    stageReady: $('stage-ready'),
    fileList: $('file-list'),
    fileCount: $('file-count'),
    formatGroup: $('format-group'),
    qualityField: $('quality-field'),
    quality: $('quality'),
    qualityValue: $('quality-value'),
    backgroundField: $('background-field'),
    background: $('background'),
    convertButton: $('convert-button'),
    addMore: $('add-more'),
    clearAll: $('clear-all'),
    progress: $('progress'),
    progressBar: $('progress-bar'),
    progressText: $('progress-text'),
    results: $('results-bar'),
    resultsSummary: $('results-summary'),
    downloadAll: $('download-all')
  };

  /* ===================================================================
     State
     =================================================================== */
  var SETTINGS_KEY = 'alitero.imageconverter.settings';

  var state = {
    items: [],            // the files in the list (see addFiles)
    nextId: 1,
    converting: false,
    support: null,        // which output formats this browser can create
    format: 'png',
    quality: 85,          // percent
    background: '#ffffff' // fill colour for JPG / BMP
  };

  /* ===================================================================
     Saved settings (so your last choice is remembered)
     =================================================================== */
  function loadSettings() {
    var saved = A.storage.get(SETTINGS_KEY, {});
    if (IC.FORMATS[saved.format]) state.format = saved.format;
    if (typeof saved.quality === 'number' && saved.quality >= 10 && saved.quality <= 100) state.quality = saved.quality;
    if (typeof saved.background === 'string' && /^#[0-9a-f]{6}$/i.test(saved.background)) state.background = saved.background;
  }

  function saveSettings() {
    A.storage.set(SETTINGS_KEY, { format: state.format, quality: state.quality, background: state.background });
  }

  /* ===================================================================
     Messages
     =================================================================== */

  /** Shows a list of problems above the workspace (e.g. skipped files). */
  function showNotice(problems) {
    if (!problems.length) { els.notice.hidden = true; els.notice.innerHTML = ''; return; }

    els.notice.hidden = false;
    els.notice.innerHTML = '' +
      '<span class="notice-icon">' + A.icon('alert') + '</span>' +
      '<div><strong>' + (problems.length === 1 ? '1 file was skipped' : problems.length + ' files were skipped') + '</strong>' +
      '<ul>' + problems.slice(0, 6).map(function (problem) {
        return '<li><span class="notice-name">' + esc(problem.name) + '</span> — ' + esc(problem.reason) + '</li>';
      }).join('') + (problems.length > 6 ? '<li>…and ' + (problems.length - 6) + ' more.</li>' : '') + '</ul></div>';
  }

  /* ===================================================================
     Adding and removing files
     =================================================================== */

  /**
   * Validates files and adds the good ones to the list.
   * @param {FileList|File[]} fileList
   */
  function addFiles(fileList) {
    if (state.converting) return;

    var problems = [];
    var added = 0;

    Array.prototype.forEach.call(fileList, function (file) {
      if (state.items.length >= IC.MAX_FILES) {
        problems.push({ name: file.name, reason: 'The limit is ' + IC.MAX_FILES + ' images at a time.' });
        return;
      }
      var error = IC.validateFile(file);
      if (error) { problems.push({ name: file.name, reason: error }); return; }

      var duplicate = state.items.some(function (item) {
        return item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified;
      });
      if (duplicate) { problems.push({ name: file.name, reason: 'Already in the list.' }); return; }

      var item = {
        id: state.nextId++,
        file: file,
        thumbUrl: URL.createObjectURL(file),
        status: 'ready',   // ready | working | done | error
        result: null,      // { blob, name, size, url } once converted
        error: '',
        width: 0,
        height: 0
      };
      state.items.push(item);
      added++;
      readDimensions(item);
    });

    // Files that were already converted keep their results; only the
    // new ones are converted when the visitor presses Convert again.
    showNotice(problems);
    if (added || problems.length) render();
  }

  /** Loads the thumbnail once to learn the picture's width and height. */
  function readDimensions(item) {
    var probe = new Image();
    probe.onload = function () {
      item.width = probe.naturalWidth;
      item.height = probe.naturalHeight;
      var meta = els.fileList.querySelector('[data-meta="' + item.id + '"]');
      if (meta) meta.textContent = metaText(item);
    };
    probe.src = item.thumbUrl;
  }

  /** Frees the memory used by one item's preview and result. */
  function disposeItem(item) {
    URL.revokeObjectURL(item.thumbUrl);
    if (item.result) URL.revokeObjectURL(item.result.url);
  }

  function removeItem(id) {
    if (state.converting) return;
    var index = state.items.findIndex(function (item) { return item.id === id; });
    if (index === -1) return;
    disposeItem(state.items[index]);
    state.items.splice(index, 1);
    showNotice([]);
    render();
  }

  function clearAll() {
    if (state.converting) return;
    state.items.forEach(disposeItem);
    state.items = [];
    els.fileInput.value = '';
    showNotice([]);
    render();
  }

  /**
   * Forgets every finished conversion (used when settings change,
   * because the old results would no longer match the settings).
   */
  function resetResults() {
    state.items.forEach(function (item) {
      if (item.result) URL.revokeObjectURL(item.result.url);
      item.result = null;
      if (item.status === 'done' || item.status === 'error') { item.status = 'ready'; item.error = ''; }
    });
  }

  /* ===================================================================
     Converting
     =================================================================== */

  /** Waits one animation frame so the page can repaint between files. */
  function nextFrame() {
    return new Promise(function (resolve) { requestAnimationFrame(function () { setTimeout(resolve, 0); }); });
  }

  function setProgress(done, total, label) {
    var percent = total ? Math.round((done / total) * 100) : 0;
    els.progress.hidden = false;
    els.progressBar.style.width = percent + '%';
    els.progress.setAttribute('aria-valuenow', String(percent));
    els.progressText.textContent = label;
  }

  /** Converts every file that is not converted yet, one after another. */
  async function convertAll() {
    if (state.converting) return;

    var pending = state.items.filter(function (item) { return item.status !== 'done'; });
    if (!pending.length) return;

    state.converting = true;
    showNotice([]);
    render();

    var finished = 0;
    setProgress(0, pending.length, 'Starting…');

    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      item.status = 'working';
      item.error = '';
      setProgress(finished, pending.length, 'Converting ' + (finished + 1) + ' of ' + pending.length + '…');
      renderItem(item);
      await nextFrame();

      try {
        var result = await IC.convert(item.file, {
          format: state.format,
          quality: state.quality / 100,
          background: state.background
        });
        item.result = {
          blob: result.blob,
          name: result.name,
          size: result.size,
          url: URL.createObjectURL(result.blob)
        };
        item.width = result.width;
        item.height = result.height;
        item.status = 'done';
      } catch (error) {
        item.status = 'error';
        item.error = (error && error.message) || 'Conversion failed.';
      }

      finished++;
      setProgress(finished, pending.length, finished + ' of ' + pending.length + ' done');
      renderItem(item);
    }

    state.converting = false;
    els.progress.hidden = true;
    render();

    var okCount = state.items.filter(function (item) { return item.status === 'done'; }).length;
    var failCount = state.items.filter(function (item) { return item.status === 'error'; }).length;
    if (failCount && !okCount) A.toast('Conversion failed. See the messages in the list.', { type: 'error' });
    else if (failCount) A.toast(okCount + ' converted, ' + failCount + ' failed.', { type: 'error' });
    else A.toast(okCount === 1 ? 'Done! Your image is ready.' : 'Done! ' + okCount + ' images are ready.', { type: 'success' });
  }

  /** Packs all finished files into one ZIP and downloads it. */
  async function downloadAll() {
    var done = state.items.filter(function (item) { return item.status === 'done' && item.result; });
    if (!done.length) return;

    els.downloadAll.disabled = true;
    try {
      var zip = await A.Zip.create(done.map(function (item) {
        return { name: item.result.name, blob: item.result.blob };
      }));
      var url = URL.createObjectURL(zip);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'alitero-converted-images.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the download before freeing it.
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    } catch (error) {
      A.toast('Could not create the ZIP file.', { type: 'error' });
    } finally {
      els.downloadAll.disabled = false;
    }
  }

  /* ===================================================================
     Rendering
     =================================================================== */

  function metaText(item) {
    var type = IC.labelForType(IC.getInputType(item.file));
    var size = item.width ? ' · ' + item.width + '×' + item.height : '';
    return A.formatBytes(item.file.size) + ' · ' + type + size;
  }

  /** The coloured status text on the right of a file row. */
  function statusHtml(item) {
    if (item.status === 'working') {
      return '<span class="file-status is-working"><span class="spinner" aria-hidden="true"></span>Converting…</span>';
    }
    if (item.status === 'error') {
      return '<span class="file-status is-error">' + A.icon('alert') + 'Failed</span>';
    }
    if (item.status === 'done') {
      var change = Math.round(((item.result.size - item.file.size) / item.file.size) * 100);
      var changeText = change === 0 ? 'same size' : (change < 0 ? '−' + Math.abs(change) + '%' : '+' + change + '%');
      var tone = change <= 0 ? 'is-smaller' : 'is-bigger';
      return '<span class="file-status is-done">' + A.icon('check') + A.formatBytes(item.result.size) +
        ' <span class="size-change ' + tone + '">' + changeText + '</span></span>';
    }
    return '<span class="file-status">Ready</span>';
  }

  /** The buttons on the right of a file row. */
  function actionsHtml(item) {
    var download = item.status === 'done'
      ? '<a class="btn btn-success btn-sm" href="' + item.result.url + '" download="' + esc(item.result.name) + '">' +
          A.icon('download') + '<span>Download</span></a>'
      : '';
    var remove = '<button type="button" class="icon-btn icon-btn-sm" data-remove="' + item.id + '" aria-label="Remove ' + esc(item.file.name) + '"' +
      (state.converting ? ' disabled' : '') + '>' + A.icon('trash') + '</button>';
    return download + remove;
  }

  /** HTML of one row of the file list. */
  function itemHtml(item) {
    return '' +
      '<li class="file-item is-' + item.status + '" data-id="' + item.id + '">' +
        '<img class="file-thumb" src="' + item.thumbUrl + '" alt="" width="52" height="52">' +
        '<div class="file-info">' +
          '<p class="file-name" title="' + esc(item.file.name) + '">' + esc(item.file.name) + '</p>' +
          '<p class="file-meta" data-meta="' + item.id + '">' + esc(metaText(item)) + '</p>' +
          (item.status === 'error' ? '<p class="file-error">' + esc(item.error) + '</p>' : '') +
        '</div>' +
        '<div class="file-side">' + statusHtml(item) + '<div class="file-actions">' + actionsHtml(item) + '</div></div>' +
      '</li>';
  }

  /** Redraws a single row (used while converting, to keep it quick). */
  function renderItem(item) {
    var row = els.fileList.querySelector('[data-id="' + item.id + '"]');
    if (!row) return;
    var holder = document.createElement('template');
    holder.innerHTML = itemHtml(item).trim();
    row.replaceWith(holder.content.firstChild);
  }

  /** Builds the row of format buttons (PNG, JPG, WebP ...). */
  function renderFormats() {
    els.formatGroup.innerHTML = IC.FORMAT_ORDER.map(function (id) {
      var format = IC.FORMATS[id];
      var supported = !state.support || state.support[id];
      return '' +
        '<label class="format-option' + (supported ? '' : ' is-unsupported') + '">' +
          '<input type="radio" name="format" value="' + id + '"' +
            (state.format === id ? ' checked' : '') + (supported ? '' : ' disabled') + '>' +
          '<span class="format-name">' + esc(format.label) + '</span>' +
          '<span class="format-note">' + esc(supported ? format.note : 'Not supported by this browser') + '</span>' +
        '</label>';
    }).join('');
  }

  /** Updates everything that depends on the current state. */
  function render() {
    var hasFiles = state.items.length > 0;
    els.stageUpload.hidden = hasFiles;
    els.stageReady.hidden = !hasFiles;

    els.fileList.innerHTML = state.items.map(itemHtml).join('');
    els.fileCount.textContent = state.items.length === 1 ? '1 image' : state.items.length + ' images';

    // Settings that only apply to some formats.
    var format = IC.FORMATS[state.format];
    els.qualityField.hidden = !format.lossy;
    els.backgroundField.hidden = format.alpha;
    els.quality.value = String(state.quality);
    els.qualityValue.textContent = state.quality + '%';
    els.background.value = state.background;

    // Convert button.
    var pending = state.items.filter(function (item) { return item.status !== 'done'; }).length;
    els.convertButton.disabled = state.converting || pending === 0;
    var label = els.convertButton.querySelector('.btn-label');
    if (state.converting) label.textContent = 'Converting…';
    else if (pending === 0) label.textContent = 'All converted';
    else label.textContent = 'Convert ' + (pending === 1 ? '1 image' : pending + ' images') + ' to ' + format.label;

    els.addMore.disabled = state.converting;
    els.clearAll.disabled = state.converting;
    els.formatGroup.querySelectorAll('input').forEach(function (input) {
      input.disabled = state.converting || input.parentElement.classList.contains('is-unsupported');
    });

    // Results bar.
    var done = state.items.filter(function (item) { return item.status === 'done'; });
    var failed = state.items.filter(function (item) { return item.status === 'error'; }).length;
    els.results.hidden = !(done.length && !state.converting);
    if (!els.results.hidden) {
      var before = done.reduce(function (sum, item) { return sum + item.file.size; }, 0);
      var after = done.reduce(function (sum, item) { return sum + item.result.size; }, 0);
      els.resultsSummary.innerHTML = '<strong>' + done.length + (done.length === 1 ? ' image' : ' images') + ' converted</strong>' +
        '<span>' + A.formatBytes(before) + ' → ' + A.formatBytes(after) + (failed ? ' · ' + failed + ' failed' : '') + '</span>';
      els.downloadAll.hidden = done.length < 2;
    }
  }

  /* ===================================================================
     Events
     =================================================================== */

  /* ----- Choosing files ----- */
  els.chooseButton.addEventListener('click', function (event) {
    event.stopPropagation();
    els.fileInput.click();
  });
  els.dropZone.addEventListener('click', function () { els.fileInput.click(); });
  els.dropZone.addEventListener('keydown', function (event) {
    if (event.target !== els.dropZone) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      els.fileInput.click();
    }
  });
  els.addMore.addEventListener('click', function () { els.fileInput.click(); });
  els.fileInput.accept = IC.ACCEPT;
  els.fileInput.addEventListener('change', function () {
    addFiles(els.fileInput.files);
    els.fileInput.value = ''; // lets you pick the same file again later
  });

  /* ----- Drag and drop (the whole workspace is a drop target) ----- */
  var dragDepth = 0; // counts enter/leave pairs so the highlight does not flicker

  els.workspace.addEventListener('dragenter', function (event) {
    event.preventDefault();
    dragDepth++;
    els.workspace.classList.add('is-dragover');
  });
  els.workspace.addEventListener('dragleave', function () {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) els.workspace.classList.remove('is-dragover');
  });
  els.workspace.addEventListener('dragover', function (event) { event.preventDefault(); });
  els.workspace.addEventListener('drop', function (event) {
    event.preventDefault();
    dragDepth = 0;
    els.workspace.classList.remove('is-dragover');
    if (event.dataTransfer && event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
  });

  // Dropping a file next to the workspace should not make the browser
  // navigate away to the image.
  window.addEventListener('dragover', function (event) { event.preventDefault(); });
  window.addEventListener('drop', function (event) { event.preventDefault(); });

  /* ----- Paste an image from the clipboard (Ctrl/⌘ + V) ----- */
  document.addEventListener('paste', function (event) {
    var files = event.clipboardData && event.clipboardData.files;
    if (files && files.length) addFiles(files);
  });

  /* ----- File list buttons ----- */
  els.fileList.addEventListener('click', function (event) {
    var button = event.target.closest('[data-remove]');
    if (button) removeItem(Number(button.getAttribute('data-remove')));
  });
  els.clearAll.addEventListener('click', clearAll);

  /* ----- Settings ----- */
  els.formatGroup.addEventListener('change', function (event) {
    if (event.target.name !== 'format') return;
    state.format = event.target.value;
    saveSettings();
    resetResults();
    render();
  });
  els.quality.addEventListener('input', function () {
    state.quality = Number(els.quality.value);
    els.qualityValue.textContent = state.quality + '%';
  });
  els.quality.addEventListener('change', function () {
    saveSettings();
    resetResults();
    render();
  });
  els.background.addEventListener('input', function () {
    state.background = els.background.value;
  });
  els.background.addEventListener('change', function () {
    // Read the value again here: render() writes state back into the input,
    // so the state must already hold the final colour.
    state.background = els.background.value;
    saveSettings();
    resetResults();
    render();
  });

  /* ----- Actions ----- */
  els.convertButton.addEventListener('click', convertAll);
  els.downloadAll.addEventListener('click', downloadAll);

  // Free all preview / result memory when leaving the page.
  window.addEventListener('beforeunload', function () { state.items.forEach(disposeItem); });

  /* ===================================================================
     Start
     =================================================================== */
  loadSettings();
  renderFormats();
  render();

  // Find out which formats this browser can create, then update the buttons.
  IC.detectSupport().then(function (support) {
    state.support = support;
    if (!support[state.format]) state.format = 'png';
    renderFormats();
    render();
  });
})();

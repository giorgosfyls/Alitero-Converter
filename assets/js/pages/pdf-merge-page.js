/* =====================================================================
   pdf-merge-page.js — The Merge PDF page
   ---------------------------------------------------------------------
   Everything the visitor sees and clicks on pdf-merge.html.
   The actual merging is done by converters/pdf-merge.js.

   Flow:   choose / drop PDFs  ->  put them in order (drag or arrows)
           ->  Merge PDFs  ->  download one combined file.

   Page states
     upload stage : big drop zone (no files yet)
     ready stage  : ordered list + Merge button (+ result bar afterwards)
     each file    : checking -> ready | error
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var PM = A.PdfMerge;
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
    addMore: $('add-more'),
    clearAll: $('clear-all'),
    progress: $('progress'),
    progressBar: $('progress-bar'),
    progressText: $('progress-text'),
    mergeButton: $('merge-button'),
    results: $('results-bar'),
    resultsSummary: $('results-summary'),
    download: $('download-merged')
  };

  /* ===================================================================
     State
     =================================================================== */
  var state = {
    items: [],        // files in merge order: { id, file, status, pages, error }
    nextId: 1,
    merging: false,
    resultUrl: '',    // object URL of the merged PDF (empty when none)
    dragId: 0         // id of the row being dragged (0 = none)
  };

  /* ===================================================================
     Small helpers
     =================================================================== */

  function readyItems() {
    return state.items.filter(function (item) { return item.status === 'ready'; });
  }

  function indexOfId(id) {
    return state.items.findIndex(function (item) { return item.id === id; });
  }

  /** Shows (or hides) the yellow notice listing skipped files. */
  function showNotice(problems) {
    if (!problems.length) { els.notice.hidden = true; els.notice.innerHTML = ''; return; }
    els.notice.innerHTML =
      '<strong>Some files were skipped:</strong><ul>' +
      problems.slice(0, 6).map(function (problem) {
        return '<li><b>' + esc(problem.name) + '</b> — ' + esc(problem.reason) + '</li>';
      }).join('') +
      (problems.length > 6 ? '<li>…and ' + (problems.length - 6) + ' more.</li>' : '') +
      '</ul>';
    els.notice.hidden = false;
  }

  /** Throws away the merged file (needed whenever the list changes). */
  function resetResult() {
    if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
    state.resultUrl = '';
    els.results.hidden = true;
  }

  /* ===================================================================
     Adding, removing and ordering files
     =================================================================== */

  function addFiles(fileList) {
    if (state.merging) return;

    var problems = [];
    var total = state.items.reduce(function (sum, item) { return sum + item.file.size; }, 0);

    Array.prototype.forEach.call(fileList, function (file) {
      if (state.items.length >= PM.MAX_FILES) {
        problems.push({ name: file.name, reason: 'The limit is ' + PM.MAX_FILES + ' files at a time.' });
        return;
      }
      var error = PM.validateFile(file);
      if (error) { problems.push({ name: file.name, reason: error }); return; }

      if (total + file.size > PM.MAX_TOTAL_SIZE) {
        problems.push({ name: file.name, reason: 'The total size is limited to ' + (PM.MAX_TOTAL_SIZE / 1048576) + ' MB.' });
        return;
      }

      var duplicate = state.items.some(function (item) {
        return item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified;
      });
      if (duplicate) { problems.push({ name: file.name, reason: 'Already in the list.' }); return; }

      var item = { id: state.nextId++, file: file, status: 'checking', pages: 0, error: '' };
      state.items.push(item);
      total += file.size;
      checkItem(item);
    });

    showNotice(problems);
    resetResult();
    render();
  }

  /** Reads the page count; marks the row as failed if the PDF is unusable. */
  function checkItem(item) {
    PM.inspect(item.file).then(function (info) {
      item.status = 'ready';
      item.pages = info.pageCount;
    }).catch(function (error) {
      item.status = 'error';
      item.error = error.message;
    }).then(function () {
      if (state.items.indexOf(item) !== -1) render();
    });
  }

  function removeItem(id) {
    if (state.merging) return;
    var index = indexOfId(id);
    if (index === -1) return;
    state.items.splice(index, 1);
    resetResult();
    render();
  }

  function clearAll() {
    if (state.merging) return;
    state.items = [];
    showNotice([]);
    resetResult();
    render();
  }

  /** Moves a row to a new position in the list (0-based index). */
  function moveItem(id, newIndex) {
    var index = indexOfId(id);
    if (index === -1) return;
    newIndex = Math.max(0, Math.min(state.items.length - 1, newIndex));
    if (newIndex === index) return;
    var moved = state.items.splice(index, 1)[0];
    state.items.splice(newIndex, 0, moved);
    resetResult();
    render();
  }

  /* ===================================================================
     Merging
     =================================================================== */

  function setProgress(done, total, label) {
    var percent = total ? Math.round((done / total) * 100) : 0;
    els.progress.hidden = false;
    els.progress.setAttribute('aria-valuenow', String(percent));
    els.progressBar.style.width = percent + '%';
    els.progressText.textContent = label || '';
  }

  async function mergeAll() {
    var files = readyItems().map(function (item) { return item.file; });
    if (state.merging || files.length < 2) return;

    state.merging = true;
    resetResult();
    render();
    setProgress(0, files.length, 'Merging…');

    try {
      var result = await PM.merge(files, function (done, total) {
        setProgress(done, total, 'Merged ' + done + ' of ' + total + ' files…');
      });
      state.resultUrl = URL.createObjectURL(result.blob);

      els.download.href = state.resultUrl;
      els.download.setAttribute('download', result.name);
      els.resultsSummary.innerHTML =
        '<strong>' + files.length + ' PDFs merged into one</strong>' +
        '<span>' + result.pageCount + ' pages · ' + A.formatBytes(result.size) + '</span>';
      els.results.hidden = false;
      A.toast('Your PDF is ready.', { type: 'success' });
    } catch (error) {
      showNotice([{ name: 'Merge failed', reason: error.message || 'Something went wrong.' }]);
    } finally {
      state.merging = false;
      els.progress.hidden = true;
      els.progressText.textContent = '';
      render();
    }
  }

  /* ===================================================================
     Rendering
     =================================================================== */

  function metaText(item) {
    var pages = item.pages ? item.pages + (item.pages === 1 ? ' page' : ' pages') + ' · ' : '';
    return pages + A.formatBytes(item.file.size);
  }

  function statusHtml(item) {
    if (item.status === 'checking') {
      return '<span class="file-status is-working"><span class="spinner" aria-hidden="true"></span>Reading…</span>';
    }
    if (item.status === 'error') {
      return '<span class="file-status is-error">' + A.icon('alert') + 'Cannot use</span>';
    }
    return '';
  }

  function itemHtml(item, index, last) {
    var disabled = state.merging ? ' disabled' : '';
    var order = item.status === 'error' ? '–' : String(readyItems().indexOf(item) + 1);
    return '' +
      '<li class="file-item pdf-item is-' + item.status + '" data-id="' + item.id + '" draggable="' + (!state.merging) + '">' +
        '<span class="pdf-grip" aria-hidden="true">' + A.icon('grip') + '</span>' +
        '<span class="pdf-order" aria-label="Position ' + order + '">' + order + '</span>' +
        '<span class="pdf-icon" aria-hidden="true">PDF</span>' +
        '<div class="file-info">' +
          '<p class="file-name" title="' + esc(item.file.name) + '">' + esc(item.file.name) + '</p>' +
          '<p class="file-meta">' + esc(metaText(item)) + '</p>' +
          (item.status === 'error' ? '<p class="file-error">' + esc(item.error) + '</p>' : '') +
        '</div>' +
        '<div class="file-side">' + statusHtml(item) +
          '<div class="file-actions">' +
            '<button type="button" class="icon-btn icon-btn-sm" data-move="-1" aria-label="Move ' + esc(item.file.name) + ' up"' + (index === 0 ? ' disabled' : disabled) + '>' + A.icon('arrow-up') + '</button>' +
            '<button type="button" class="icon-btn icon-btn-sm" data-move="1" aria-label="Move ' + esc(item.file.name) + ' down"' + (last ? ' disabled' : disabled) + '>' + A.icon('arrow-down') + '</button>' +
            '<button type="button" class="icon-btn icon-btn-sm" data-remove="1" aria-label="Remove ' + esc(item.file.name) + '"' + disabled + '>' + A.icon('trash') + '</button>' +
          '</div>' +
        '</div>' +
      '</li>';
  }

  function render() {
    var has = state.items.length > 0;
    els.stageUpload.hidden = has;
    els.stageReady.hidden = !has;

    els.fileCount.textContent = state.items.length + (state.items.length === 1 ? ' file' : ' files');
    els.fileList.innerHTML = state.items.map(function (item, index) {
      return itemHtml(item, index, index === state.items.length - 1);
    }).join('');

    var ready = readyItems().length;
    var checking = state.items.some(function (item) { return item.status === 'checking'; });
    els.mergeButton.disabled = state.merging || checking || ready < 2;
    els.mergeButton.querySelector('.btn-label').textContent =
      state.merging ? 'Merging…' : (ready < 2 && !checking ? 'Add at least 2 PDFs' : 'Merge PDFs');
    els.addMore.disabled = state.merging;
    els.clearAll.disabled = state.merging;
  }

  /* ===================================================================
     Events
     =================================================================== */

  els.chooseButton.addEventListener('click', function (event) {
    event.stopPropagation();
    els.fileInput.click();
  });
  els.dropZone.addEventListener('click', function () { els.fileInput.click(); });
  els.dropZone.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      els.fileInput.click();
    }
  });
  els.addMore.addEventListener('click', function () { els.fileInput.click(); });
  els.clearAll.addEventListener('click', clearAll);
  els.mergeButton.addEventListener('click', mergeAll);

  els.fileInput.addEventListener('change', function () {
    addFiles(els.fileInput.files);
    els.fileInput.value = ''; // lets the same file be chosen again later
  });

  // ----- Dropping files from the computer onto the page -----
  function hasFiles(event) {
    var types = event.dataTransfer && event.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, 'Files') !== -1;
  }

  var dragDepth = 0;
  els.workspace.addEventListener('dragenter', function (event) {
    if (!hasFiles(event)) return;
    dragDepth++;
    els.workspace.classList.add('is-dragover');
  });
  els.workspace.addEventListener('dragleave', function (event) {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) els.workspace.classList.remove('is-dragover');
  });
  els.workspace.addEventListener('drop', function (event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    els.workspace.classList.remove('is-dragover');
    addFiles(event.dataTransfer.files);
  });
  // Stop the browser from opening a PDF dropped outside the drop area.
  window.addEventListener('dragover', function (event) { event.preventDefault(); });
  window.addEventListener('drop', function (event) { event.preventDefault(); });

  // ----- Row buttons (up / down / remove) -----
  els.fileList.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    var row = event.target.closest('.pdf-item');
    if (!button || !row || button.disabled) return;
    var id = Number(row.getAttribute('data-id'));

    if (button.hasAttribute('data-remove')) {
      removeItem(id);
    } else if (button.hasAttribute('data-move')) {
      moveItem(id, indexOfId(id) + Number(button.getAttribute('data-move')));
      // Keep keyboard focus on the same button after the list is redrawn.
      var again = els.fileList.querySelector('[data-id="' + id + '"] [data-move="' + button.getAttribute('data-move') + '"]');
      if (again && !again.disabled) again.focus();
    }
  });

  // ----- Reordering rows by dragging -----
  els.fileList.addEventListener('dragstart', function (event) {
    var row = event.target.closest && event.target.closest('.pdf-item');
    if (!row || state.merging) return;
    state.dragId = Number(row.getAttribute('data-id'));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(state.dragId)); // Firefox needs some data
    row.classList.add('is-dragging');
  });

  els.fileList.addEventListener('dragover', function (event) {
    if (!state.dragId) return;
    event.preventDefault();
    var row = event.target.closest('.pdf-item');
    els.fileList.querySelectorAll('.drop-before, .drop-after').forEach(function (el) {
      el.classList.remove('drop-before', 'drop-after');
    });
    if (!row || Number(row.getAttribute('data-id')) === state.dragId) return;
    var box = row.getBoundingClientRect();
    row.classList.add(event.clientY < box.top + box.height / 2 ? 'drop-before' : 'drop-after');
  });

  els.fileList.addEventListener('drop', function (event) {
    if (!state.dragId) return;
    event.preventDefault();
    var row = event.target.closest('.pdf-item');
    var dragId = state.dragId;
    state.dragId = 0;
    if (!row) return render();

    var targetId = Number(row.getAttribute('data-id'));
    if (targetId === dragId) return render();

    var box = row.getBoundingClientRect();
    var after = event.clientY >= box.top + box.height / 2;
    var from = indexOfId(dragId);
    var to = indexOfId(targetId) + (after ? 1 : 0);
    if (from < to) to--;          // the removed row shifts everything up by one
    moveItem(dragId, to);
  });

  els.fileList.addEventListener('dragend', function () {
    state.dragId = 0;
    render(); // clears the dragging / drop-marker styles
  });

  render();
})();

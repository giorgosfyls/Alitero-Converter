/* =====================================================================
   pdf-merge.js — The PDF merge engine (no page / DOM code in here)
   ---------------------------------------------------------------------
   Combines several PDF files into one, entirely in the browser.
   The heavy lifting is done by the open-source "pdf-lib" library
   (lib/vendor/pdf-lib.min.js, MIT licence), which must be loaded first.

   Public API  (window.Alitero.PdfMerge)
     MAX_FILES              most files accepted at once
     MAX_FILE_SIZE          largest single file, in bytes
     MAX_TOTAL_SIZE         largest combined size, in bytes
     validateFile(file)     -> error text, or '' when the file is fine
     inspect(file)          -> Promise<{ pageCount }>  (rejects with a
                               friendly Error for broken / locked PDFs)
     merge(files, onProgress)
                            -> Promise<{ blob, name, size, pageCount }>
                               files:      File[] in the wanted order
                               onProgress: function (done, total) (optional)
   ===================================================================== */
(function () {
  'use strict';

  var Alitero = (window.Alitero = window.Alitero || {});

  var MAX_FILES = 30;
  var MAX_FILE_SIZE = 50 * 1024 * 1024;    // 50 MB per file
  var MAX_TOTAL_SIZE = 200 * 1024 * 1024;  // 200 MB for everything

  /** True when the file looks like a PDF (by type or by extension). */
  function looksLikePdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  /**
   * Quick checks that need no reading of the file.
   * @param {File} file
   * @returns {string} an error message, or '' when the file is acceptable
   */
  function validateFile(file) {
    if (!looksLikePdf(file)) return 'This is not a PDF file.';
    if (file.size === 0) return 'The file is empty.';
    if (file.size > MAX_FILE_SIZE) return 'The file is larger than ' + (MAX_FILE_SIZE / 1048576) + ' MB.';
    return '';
  }

  /** Makes sure the pdf-lib library is available. */
  function lib() {
    if (!window.PDFLib) throw new Error('The PDF library could not be loaded. Please reload the page.');
    return window.PDFLib;
  }

  /**
   * Opens a PDF and turns pdf-lib's technical errors into short,
   * friendly messages.
   */
  async function openPdf(file) {
    var bytes = await file.arrayBuffer();
    var doc;
    try {
      doc = await lib().PDFDocument.load(bytes);
    } catch (error) {
      // pdf-lib reports locked files with a message that mentions "encrypted".
      if (error && /encrypted/i.test(error.message || '')) {
        throw new Error('This PDF is password-protected. Remove the password first.');
      }
      throw new Error('This PDF is damaged or not a valid PDF.');
    }
    // pdf-lib is forgiving and may "open" a broken file as an empty or
    // half-built document, where reading the pages fails or finds none.
    var pageCount = 0;
    try { pageCount = doc.getPageCount(); } catch (error) { pageCount = 0; }
    if (pageCount === 0) throw new Error('This PDF is damaged or has no pages.');
    return doc;
  }

  /**
   * Reads a PDF just to learn how many pages it has (and to be sure
   * it can be merged later).
   */
  async function inspect(file) {
    var doc = await openPdf(file);
    return { pageCount: doc.getPageCount() };
  }

  /**
   * Merges the files, in the order given, into one new PDF.
   * Files are processed one at a time so memory use stays low.
   */
  async function merge(files, onProgress) {
    if (!files.length) throw new Error('Add at least one PDF.');

    var out = await lib().PDFDocument.create();
    out.setProducer('Alitero.org');
    out.setCreator('Alitero.org');

    for (var i = 0; i < files.length; i++) {
      var source = await openPdf(files[i]);
      var pages = await out.copyPages(source, source.getPageIndices());
      pages.forEach(function (page) { out.addPage(page); });
      if (onProgress) onProgress(i + 1, files.length);
    }

    var bytes = await out.save();
    var blob = new Blob([bytes], { type: 'application/pdf' });
    return { blob: blob, name: 'merged.pdf', size: blob.size, pageCount: out.getPageCount() };
  }

  Alitero.PdfMerge = {
    MAX_FILES: MAX_FILES,
    MAX_FILE_SIZE: MAX_FILE_SIZE,
    MAX_TOTAL_SIZE: MAX_TOTAL_SIZE,
    validateFile: validateFile,
    inspect: inspect,
    merge: merge
  };
})();

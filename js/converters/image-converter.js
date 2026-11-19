/* =====================================================================
   image-converter.js — The image conversion engine
   ---------------------------------------------------------------------
   Pure logic: NO buttons, NO page elements. It only takes a File and
   returns a converted Blob. The page (pages/image-converter-page.js)
   handles everything the visitor sees.

   Everything happens inside the browser with the Canvas API, so the
   images are never uploaded anywhere.

   How one conversion works
     1. decode()   read the file into a bitmap the browser can draw
     2. draw       paint the bitmap on an off-screen <canvas>
                   (formats without transparency get a solid background)
     3. encode     ask the canvas for a new file in the target format

   Public API (window.Alitero.ImageConverter)
     FORMATS              description of every output format
     FORMAT_ORDER         the order formats are shown in
     MAX_FILE_SIZE        biggest accepted input file, in bytes
     MAX_FILES            most files accepted at once
     ACCEPT               value for <input type="file" accept="...">
     getInputType(file)   -> MIME type, or null if not an accepted image
     labelForType(mime)   -> "JPG", "PNG" ...
     validateFile(file)   -> error message, or null when the file is fine
     detectSupport()      -> Promise<{png:true, avif:false, ...}>
     convert(file, opts)  -> Promise<{blob, name, ext, mime, width, height, size}>
     replaceExtension(name, ext)
   ===================================================================== */
(function () {
  'use strict';

  var Alitero = (window.Alitero = window.Alitero || {});

  /* ===================================================================
     Settings
     =================================================================== */

  /** Biggest input file we accept (25 MB). Change here if you need more. */
  var MAX_FILE_SIZE = 25 * 1024 * 1024;

  /** Most files per batch. */
  var MAX_FILES = 20;

  /**
   * Biggest image we try to draw, in pixels (width x height).
   * Browsers have their own canvas limits; this gives a friendly error
   * before the browser fails with a blank picture.
   */
  var MAX_PIXELS = 100 * 1000 * 1000;

  /**
   * Output formats.
   *   mime    what we ask the canvas for
   *   ext     file extension of the result
   *   lossy   true  -> the quality slider applies
   *   alpha   true  -> the format can store transparency
   *   custom  true  -> encoded by our own code (the canvas cannot do it)
   */
  var FORMATS = {
    png:  { id: 'png',  label: 'PNG',  mime: 'image/png',  ext: 'png',  lossy: false, alpha: true,  note: 'Lossless, keeps transparency' },
    jpg:  { id: 'jpg',  label: 'JPG',  mime: 'image/jpeg', ext: 'jpg',  lossy: true,  alpha: false, note: 'Small files, great for photos' },
    webp: { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', lossy: true,  alpha: true,  note: 'Modern, small and flexible' },
    avif: { id: 'avif', label: 'AVIF', mime: 'image/avif', ext: 'avif', lossy: true,  alpha: true,  note: 'Smallest files' },
    bmp:  { id: 'bmp',  label: 'BMP',  mime: 'image/bmp',  ext: 'bmp',  lossy: false, alpha: false, note: 'Uncompressed bitmap', custom: true }
  };

  var FORMAT_ORDER = ['png', 'jpg', 'webp', 'avif', 'bmp'];

  /** Input types we accept, by MIME type and by file extension. */
  var INPUT_TYPES = {
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/gif': 'GIF',
    'image/bmp': 'BMP',
    'image/avif': 'AVIF'
  };

  var EXTENSION_TO_TYPE = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    avif: 'image/avif'
  };

  var ACCEPT = Object.keys(INPUT_TYPES).join(',') + ',.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif';

  /* ===================================================================
     Input checks
     =================================================================== */

  /**
   * Works out which accepted image type a file is.
   * Some systems give an empty `file.type`, so we fall back to the
   * file extension.
   * @param {File} file
   * @returns {string|null} MIME type, or null when the file is not accepted
   */
  function getInputType(file) {
    var type = (file.type || '').toLowerCase();
    if (type === 'image/jpg' || type === 'image/pjpeg') type = 'image/jpeg';
    if (type === 'image/x-ms-bmp') type = 'image/bmp';
    if (INPUT_TYPES[type]) return type;

    var match = /\.([a-z0-9]+)$/i.exec(file.name || '');
    if (match) return EXTENSION_TO_TYPE[match[1].toLowerCase()] || null;
    return null;
  }

  /**
   * @param {string} mime
   * @returns {string} short readable name, e.g. "JPG"
   */
  function labelForType(mime) {
    return INPUT_TYPES[mime] || 'Image';
  }

  /**
   * Checks a file BEFORE trying to convert it.
   * @param {File} file
   * @returns {string|null} a message for the visitor, or null when it is fine
   */
  function validateFile(file) {
    if (!getInputType(file)) return 'Not a supported image (use JPG, PNG, WebP, GIF, BMP or AVIF).';
    if (file.size === 0) return 'The file is empty.';
    if (file.size > MAX_FILE_SIZE) {
      return 'Larger than ' + Math.round(MAX_FILE_SIZE / (1024 * 1024)) + ' MB.';
    }
    return null;
  }

  /* ===================================================================
     Browser support detection
     =================================================================== */

  var supportPromise = null;

  /**
   * Asks the browser which output formats it can really create.
   * (For example, Chrome can export AVIF but Safari and Firefox cannot.)
   * We try to export a 1x1 pixel canvas in each format: if the browser
   * does not know the format, it silently returns a PNG instead.
   * The answer is cached, so calling this again is free.
   * @returns {Promise<Object<string, boolean>>} e.g. { png: true, avif: false }
   */
  function detectSupport() {
    if (supportPromise) return supportPromise;

    supportPromise = Promise.all(FORMAT_ORDER.map(function (id) {
      var format = FORMATS[id];
      if (format.custom || id === 'png') return Promise.resolve([id, true]);

      return new Promise(function (resolve) {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          canvas.toBlob(function (blob) {
            resolve([id, !!blob && blob.type === format.mime]);
          }, format.mime, 0.8);
        } catch (error) {
          resolve([id, false]);
        }
      });
    })).then(function (pairs) {
      var support = {};
      pairs.forEach(function (pair) { support[pair[0]] = pair[1]; });
      return support;
    });

    return supportPromise;
  }

  /* ===================================================================
     Step 1: decode
     =================================================================== */

  /**
   * Reads an image file into something the canvas can draw.
   * Uses createImageBitmap when available (fast, off the main thread);
   * otherwise falls back to a normal <img> element.
   * Animated GIFs: only the first frame is used.
   *
   * @param {File} file
   * @returns {Promise<{source: CanvasImageSource, width: number, height: number, release: Function}>}
   */
  function decode(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file).then(function (bitmap) {
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: function () { if (bitmap.close) bitmap.close(); }
        };
      }).catch(function () {
        return decodeWithImageElement(file); // some formats only work this way
      });
    }
    return decodeWithImageElement(file);
  }

  /** Fallback decoder using a normal <img> element. */
  function decodeWithImageElement(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () {
        resolve({
          source: image,
          width: image.naturalWidth,
          height: image.naturalHeight,
          release: function () { URL.revokeObjectURL(url); }
        });
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read this image. The file may be damaged.'));
      };
      image.src = url;
    });
  }

  /* ===================================================================
     Step 3: encode
     =================================================================== */

  /**
   * Exports a canvas as an image Blob using the browser's own encoder.
   * @param {HTMLCanvasElement} canvas
   * @param {object} format     one of FORMATS
   * @param {number} quality    0.1 - 1 (ignored by lossless formats)
   * @returns {Promise<Blob>}
   */
  function encodeWithCanvas(canvas, format, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error('The browser could not create this file. Try a smaller image.'));
        } else if (blob.type !== format.mime) {
          // The browser did not know the format and gave us a PNG instead.
          reject(new Error('Your browser cannot create ' + format.label + ' files. Try another format.'));
        } else {
          resolve(blob);
        }
      }, format.mime, format.lossy ? quality : undefined);
    });
  }

  /**
   * Our own BMP encoder (browsers cannot export BMP from a canvas).
   * Writes a classic 24-bit uncompressed bitmap, which every program opens.
   *
   * File layout: 14-byte file header + 40-byte info header + pixel rows.
   * BMP stores pixels as Blue-Green-Red, rows bottom-to-top, and every row
   * is padded to a multiple of 4 bytes.
   *
   * @param {HTMLCanvasElement} canvas
   * @returns {Blob}
   */
  function encodeBmp(canvas) {
    var width = canvas.width;
    var height = canvas.height;
    var rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data;

    var rowSize = Math.ceil((width * 3) / 4) * 4;
    var pixelBytes = rowSize * height;
    var buffer = new ArrayBuffer(54 + pixelBytes);
    var view = new DataView(buffer);
    var bytes = new Uint8Array(buffer);

    // --- File header (14 bytes) ---
    view.setUint8(0, 0x42);                 // "B"
    view.setUint8(1, 0x4d);                 // "M"
    view.setUint32(2, 54 + pixelBytes, true); // total file size
    view.setUint32(10, 54, true);           // where the pixel data starts

    // --- Info header (40 bytes) ---
    view.setUint32(14, 40, true);           // size of this header
    view.setInt32(18, width, true);
    view.setInt32(22, height, true);        // positive = rows stored bottom-to-top
    view.setUint16(26, 1, true);            // colour planes
    view.setUint16(28, 24, true);           // bits per pixel
    view.setUint32(34, pixelBytes, true);   // size of the pixel data
    view.setInt32(38, 2835, true);          // horizontal resolution (72 DPI)
    view.setInt32(42, 2835, true);          // vertical resolution

    // --- Pixel data ---
    var offset = 54;
    for (var y = height - 1; y >= 0; y--) {
      var source = y * width * 4;
      var target = offset;
      for (var x = 0; x < width; x++) {
        bytes[target++] = rgba[source + 2]; // blue
        bytes[target++] = rgba[source + 1]; // green
        bytes[target++] = rgba[source];     // red
        source += 4;
      }
      offset += rowSize;
    }

    return new Blob([buffer], { type: 'image/bmp' });
  }

  /* ===================================================================
     The conversion itself
     =================================================================== */

  /**
   * Replaces (or adds) a file extension.
   * @param {string} name  e.g. "holiday.photo.png"
   * @param {string} ext   e.g. "jpg"
   * @returns {string}     e.g. "holiday.photo.jpg"
   */
  function replaceExtension(name, ext) {
    var base = String(name || 'image').replace(/\.[^.\\/]+$/, '') || 'image';
    return base + '.' + ext;
  }

  /**
   * Converts one image file.
   *
   * @param {File} file
   * @param {object} options
   * @param {string} options.format       key of FORMATS: "png" | "jpg" | "webp" | "avif" | "bmp"
   * @param {number} [options.quality=0.85]  0.1 - 1, for lossy formats
   * @param {string} [options.background='#ffffff']  fill colour for formats
   *                                       that cannot store transparency (JPG, BMP)
   * @returns {Promise<{blob: Blob, name: string, ext: string, mime: string,
   *                    width: number, height: number, size: number}>}
   * @throws {Error} with a message that is safe to show to the visitor
   */
  function convert(file, options) {
    options = options || {};
    var format = FORMATS[options.format];
    if (!format) return Promise.reject(new Error('Unknown output format.'));

    var problem = validateFile(file);
    if (problem) return Promise.reject(new Error(problem));

    var quality = Math.min(1, Math.max(0.1, Number(options.quality) || 0.85));
    var background = options.background || '#ffffff';

    return decode(file).catch(function () {
      throw new Error('Could not read this image. The file may be damaged.');
    }).then(function (decoded) {
      var canvas = null;

      function cleanup() {
        decoded.release();
        // Shrinking the canvas frees its memory right away.
        if (canvas) { canvas.width = 1; canvas.height = 1; }
      }

      try {
        if (!decoded.width || !decoded.height) throw new Error('The image has no size.');
        if (decoded.width * decoded.height > MAX_PIXELS) {
          throw new Error('The image is too large (over ' + Math.round(MAX_PIXELS / 1e6) + ' megapixels).');
        }

        // 2. Draw
        canvas = document.createElement('canvas');
        canvas.width = decoded.width;
        canvas.height = decoded.height;
        var context = canvas.getContext('2d', { willReadFrequently: !!format.custom });
        if (!context) throw new Error('Your browser does not support canvas drawing.');

        if (!format.alpha) {
          // JPG and BMP have no transparency: paint the background first,
          // otherwise transparent areas would turn black.
          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(decoded.source, 0, 0);

        // 3. Encode
        var encoding = format.custom
          ? Promise.resolve(encodeBmp(canvas))
          : encodeWithCanvas(canvas, format, quality);

        return encoding.then(function (blob) {
          var result = {
            blob: blob,
            name: replaceExtension(file.name, format.ext),
            ext: format.ext,
            mime: format.mime,
            width: decoded.width,
            height: decoded.height,
            size: blob.size
          };
          cleanup();
          return result;
        }, function (error) {
          cleanup();
          throw error;
        });
      } catch (error) {
        cleanup();
        return Promise.reject(error);
      }
    });
  }

  /* ===================================================================
     Public API
     =================================================================== */
  Alitero.ImageConverter = {
    FORMATS: FORMATS,
    FORMAT_ORDER: FORMAT_ORDER,
    MAX_FILE_SIZE: MAX_FILE_SIZE,
    MAX_FILES: MAX_FILES,
    ACCEPT: ACCEPT,
    getInputType: getInputType,
    labelForType: labelForType,
    validateFile: validateFile,
    detectSupport: detectSupport,
    convert: convert,
    replaceExtension: replaceExtension
  };
})();

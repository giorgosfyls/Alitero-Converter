/* =====================================================================
   zip.js — A tiny ZIP file creator (no external library)
   ---------------------------------------------------------------------
   Used by "Download all" to pack several converted files into one .zip.
   Images are already compressed, so files are simply STORED (method 0)
   without extra compression. That is fast and keeps the code short.

   Usage:
       Alitero.Zip.create([{ name: 'a.png', blob: blobA }, ...])
         .then(function (zipBlob) { ... });

   A ZIP file is: [local header + data] for every file, then a "central
   directory" listing all files, then one "end of directory" record.
   ===================================================================== */
(function () {
  'use strict';

  var Alitero = (window.Alitero = window.Alitero || {});

  /* ---------- CRC-32 checksum (required by the ZIP format) ---------- */

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  /**
   * @param {Uint8Array} bytes
   * @returns {number} unsigned 32-bit checksum
   */
  function crc32(bytes) {
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  /* ---------- Helpers ---------- */

  /** Converts a Date to the two 16-bit numbers ZIP uses for time and date. */
  function dosDateTime(date) {
    var time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    var day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time: time, date: day };
  }

  /**
   * Makes sure no two files in the archive share a name:
   * "photo.png", "photo.png" -> "photo.png", "photo (2).png".
   */
  function uniqueNames(entries) {
    var used = {};
    return entries.map(function (entry) {
      var name = entry.name;
      var dot = name.lastIndexOf('.');
      var base = dot > 0 ? name.slice(0, dot) : name;
      var ext = dot > 0 ? name.slice(dot) : '';
      var candidate = name;
      var counter = 2;
      while (used[candidate.toLowerCase()]) {
        candidate = base + ' (' + counter + ')' + ext;
        counter++;
      }
      used[candidate.toLowerCase()] = true;
      return candidate;
    });
  }

  /* ---------- The creator ---------- */

  /**
   * Builds a ZIP archive.
   * @param {{name: string, blob: Blob}[]} entries
   * @returns {Promise<Blob>} the .zip file
   */
  function create(entries) {
    var names = uniqueNames(entries);
    var encoder = new TextEncoder();
    var stamp = dosDateTime(new Date());

    // Read every file's bytes first.
    return Promise.all(entries.map(function (entry) { return entry.blob.arrayBuffer(); }))
      .then(function (buffers) {
        var parts = [];        // pieces of the final file, in order
        var central = [];      // central directory records
        var offset = 0;        // where the next local header starts

        buffers.forEach(function (buffer, index) {
          var data = new Uint8Array(buffer);
          var nameBytes = encoder.encode(names[index]);
          var checksum = crc32(data);

          // --- Local file header (30 bytes + name) ---
          var local = new DataView(new ArrayBuffer(30));
          local.setUint32(0, 0x04034b50, true);     // signature
          local.setUint16(4, 20, true);             // version needed
          local.setUint16(6, 0x0800, true);         // flag: file name is UTF-8
          local.setUint16(8, 0, true);              // method 0 = stored
          local.setUint16(10, stamp.time, true);
          local.setUint16(12, stamp.date, true);
          local.setUint32(14, checksum, true);
          local.setUint32(18, data.length, true);   // compressed size
          local.setUint32(22, data.length, true);   // original size
          local.setUint16(26, nameBytes.length, true);
          local.setUint16(28, 0, true);             // extra field length

          parts.push(local.buffer, nameBytes, data);

          // --- Central directory record (46 bytes + name) ---
          var record = new DataView(new ArrayBuffer(46));
          record.setUint32(0, 0x02014b50, true);    // signature
          record.setUint16(4, 20, true);            // version made by
          record.setUint16(6, 20, true);            // version needed
          record.setUint16(8, 0x0800, true);
          record.setUint16(10, 0, true);
          record.setUint16(12, stamp.time, true);
          record.setUint16(14, stamp.date, true);
          record.setUint32(16, checksum, true);
          record.setUint32(20, data.length, true);
          record.setUint32(24, data.length, true);
          record.setUint16(28, nameBytes.length, true);
          // 30..41: extra length, comment length, disk number, attributes = 0
          record.setUint32(42, offset, true);       // where this file's header is
          central.push(record.buffer, nameBytes);

          offset += 30 + nameBytes.length + data.length;
        });

        var centralSize = central.reduce(function (sum, piece) {
          return sum + (piece.byteLength !== undefined ? piece.byteLength : piece.length);
        }, 0);

        // --- End of central directory (22 bytes) ---
        var end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true);
        end.setUint16(8, buffers.length, true);     // entries on this disk
        end.setUint16(10, buffers.length, true);    // entries in total
        end.setUint32(12, centralSize, true);
        end.setUint32(16, offset, true);            // where the directory starts

        return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
      });
  }

  Alitero.Zip = { create: create };
})();

'use strict';

var splitStream = require('./splitStream');
var PassThrough = require('node:stream').PassThrough;
var parseRawDiffLine = require('./parseRawDiffLine');
var streamDiff = require('./streamDiff');

module.exports = function parseStream(inputStream, ops) {
  var patchStream;
  var patchStreamRes;
  var outStream;

  var opts = ops || {};

  // don't output data for files that have more lines changed than allowed
  var MAX_DIFF_LINES_PER_FILE = opts.MAX_DIFF_LINES_PER_FILE || 300;

  // files that are renamed, deleted or have more than X changes
  var noShow = [];
  // files that have a tone of changes
  var blacklist = [];

  var isCut = false;

  inputStream.on('end', function handleStreamEnd(limitExceeded) {
    if (limitExceeded) { isCut = true; }
  });

  function initPatchStream() {
    patchStream = new PassThrough({ objectMode: true });
    patchStreamRes = streamDiff(patchStream, noShow);

    patchStreamRes.on('data', function processPatchChunk(data) {
      outStream.emit('data', 'patch', data);
    }).on('error', function handlePatchStreamError(err) {
      outStream.destroy(err);
    });

    if (blacklist.length) {
      outStream.emit('data', 'noshow', blacklist);
    }
  }

  function writeRaw(line) {
    var parsed = parseRawDiffLine(line);

    if (parsed.status === 'D' || parsed.similarity === 100) {
      noShow.push(parsed.toFile || parsed.fromFile);
    }

    this.emit('data', 'raw', parseRawDiffLine(line));
  }

  function writePatch(line, cb) {
    if (!patchStream) { initPatchStream(); }
    patchStream.write(line, cb);
  }

  function writeStats(stats) {
    var tmp = stats[3].split(' => ');
    var added = parseInt(stats[1], 10);
    var deleted = parseInt(stats[2], 10);

    if ((added + deleted) > MAX_DIFF_LINES_PER_FILE) {
      noShow.push(tmp[1] || tmp[0]);
      blacklist.push(tmp[1] || tmp[0]);
    }

    this.emit('data', 'stats', {
      added: added,
      deleted: deleted,
      fileA: tmp[0],
      fileB: tmp[1]
    });
  }

  var end = function end(cb) {
    function complete() {
      if (isCut) { outStream.emit('cut'); }
      cb();
    }

    if (patchStream) {
      // Flush the final patch before ending the public stream.
      patchStreamRes.once('end', complete);
      patchStream.end();
    } else {
      complete();
    }
  };

  var type = 'raw';

  var write = function write(line, enc, cb) {
    if (type === 'patch') {
      return writePatch(line, cb);
    } else {
      var stats = line.match(/^(\d+)\t(\d+)\t(.*)( => (.*))?/);

      if (type !== 'patch' && stats) {
        writeStats.call(this, stats);
      } else if (type !== 'patch' && /^-\t-\t/.test(line)) {
        // binary file
      } else if (!line) {
        type = 'patch';
        return writePatch(line, cb);
      } else {
        writeRaw.call(this, line);
      }
    }

    cb();
  };

  outStream = splitStream(inputStream, write, end);
  outStream.once('close', function cleanupPatchStream() {
    if (patchStream) { patchStream.destroy(); }
  });

  return outStream;
};

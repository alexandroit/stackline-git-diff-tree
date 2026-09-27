'use strict';

var Transform = require('node:stream').Transform;
var pipeline = require('node:stream').pipeline;

function streamDiff(inputStream, blackList) {
  var diff = null;

  var blacklist = blackList || [];

  function prepareDiff(diffData) {
    if (diffData.lines.length) {
      var tmp = diffData.lines.pop();

      if (tmp !== '') {
        diffData.lines.push(tmp);
      }
    }

    return diffData;
  }

  function isBlacklisted(file) {
    return (blacklist.indexOf(file) !== -1);
  }

  function write(line, enc, cb) {
    var tmp = line.match(/^diff --git a\/(.+?) b\/(.+)$/);

    // new diff, must emit previous diff
    if (tmp) {
      if (diff && !diff.isBlacklisted) {
        this.push(prepareDiff(diff));
      }

      diff = {
        aPath: tmp[1],
        bPath: tmp[2],
        lines: [],
        isBlacklisted: isBlacklisted(tmp[2] || tmp[1])
      };
    } else if (diff && !diff.isBlacklisted) {
      // for speed improvement reasons
      if (diff.lines.length) {
        diff.lines.push(line);
      } else if (/^(old mode|new file mode|deleted file mode|similarity index|rename|index) /.test(line)) {
        // ignore
      } else if (line) {
        if (line.match(/^Binary files (.+) differ/)) {
          diff.isBinary = true;
        } else if (!line.match(/^(---|\+\+\+) (.*)/)) {
          diff.lines.push(line);
        }
      }
    }

    cb();
  }

  function end(cb) {
    if (diff && !diff.isBlacklisted) {
      this.push(prepareDiff(diff));
    }

    cb();
  }

  var output = new Transform({
    objectMode: true,
    transform: write,
    flush: end
  });

  pipeline(inputStream, output, function complete(err) {
    if (err) { output.destroy(err); }
  });
  return output;
}

module.exports = streamDiff;

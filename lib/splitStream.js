'use strict';

// Native replacement for split-transform-stream's UTF-8 line splitter and pipe.
var Transform = require('node:stream').Transform;
var pipeline = require('node:stream').pipeline;
var StringDecoder = require('node:string_decoder').StringDecoder;

module.exports = function splitStream(input, write, end) {
  var decoder = new StringDecoder('utf8');
  var pending = '';
  var ended = false;
  var output = new Transform({ objectMode: true, transform: write, flush: end });
  var lines = new Transform({
    readableObjectMode: true,
    transform: function(chunk, encoding, callback) {
      var parts = (pending + decoder.write(chunk)).split(/\r?\n/);
      pending = parts.pop();
      for (var i = 0; i < parts.length; i++) { this.push(parts[i]); }
      callback();
    },
    flush: function(callback) {
      this.push(pending + decoder.end());
      callback();
    }
  });

  function fail(error) { output.destroy(error); }
  function stopInput() {
    input.unpipe(lines);
    // git-spawned-stream also supports a legacy stream without destroy().
    if (typeof input.destroy === 'function') { input.destroy(); }
  }
  input.once('end', function() { ended = true; });
  input.once('error', fail);
  input.once('close', function() {
    if (!ended && !output.destroyed) {
      fail(new Error('Input stream closed before ending'));
    }
  });
  output.once('close', function() {
    lines.destroy();
    stopInput();
  });

  pipeline(lines, output, function(error) {
    if (error) { stopInput(); }
  });
  input.pipe(lines);
  return output;
};

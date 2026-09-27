'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { Readable, PassThrough } = require('node:stream');
const parseStream = require('../lib/parseStream');
const streamDiff = require('../lib/streamDiff');
const diffTree = require('..');

function loadWith(relative, mocks) {
  const filename = require.resolve(relative);
  const fallback = createRequire(filename);
  const module = { exports: {} };
  const factory = vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename });
  factory((name) => name in mocks ? mocks[name] : fallback(name), module, module.exports);
  return module.exports;
}

function collect(stream) {
  return new Promise((resolve, reject) => {
    const result = {};
    stream.on('data', (kind, value) => {
      (result[kind] ||= []).push(value);
    }).once('error', reject).once('end', () => resolve(result));
  });
}

test('upstream fixture preserves raw, stats, noshow, and final patch events', async () => {
  const input = fs.createReadStream(path.join(__dirname, 'in.txt'), { encoding: 'utf8' });
  const result = await collect(parseStream(input));
  // The published upstream test compares JSON because undefined properties are omitted.
  assert.equal(JSON.stringify(result), JSON.stringify(require('./out.json')));
});

test('upstream command arguments and maximum size are preserved', () => {
  const options = { MAX_DIFF_SIZE: 12345, rev: 'master', originalRev: 'HEAD^^^^' };
  let called = false;
  const diff = loadWith('../index.js', {
    'git-spawned-stream': (repo, args, limit) => {
      assert.equal(repo, '/home/node.git');
      assert.equal(limit, options.MAX_DIFF_SIZE);
      assert.deepEqual(args, ['diff-tree', '--patch-with-raw', '--numstat', '--full-index', '--no-commit-id', '-M', 'HEAD^^^^', 'master', '--']);
      return 'git-spawned-stream';
    },
    './lib/parseStream': (input) => { called = true; assert.equal(input, 'git-spawned-stream'); }
  });
  diff('/home/node.git', options);
  assert.equal(called, true);
});

test('empty input ends once without data', async () => {
  const stream = parseStream(Readable.from([]));
  let ends = 0;
  stream.on('end', () => { ends++; });
  assert.deepEqual(await collect(stream), {});
  assert.equal(ends, 1);
});

test('raw-only input without trailing newline ends without a patch stream', async () => {
  const raw = ':100644 100644 ' + 'a'.repeat(40) + ' ' + 'b'.repeat(40) + ' M\tfile.txt';
  const result = await collect(parseStream(Readable.from([raw])));
  assert.equal(result.raw.length, 1);
  assert.equal(result.raw[0].fromFile, 'file.txt');
  assert.equal(result.patch, undefined);
});

test('UTF-8 split across every byte and CRLF line boundaries is preserved', async () => {
  const input = '\r\ndiff --git a/file.txt b/file.txt\r\n--- a/file.txt\r\n+++ b/file.txt\r\n@@ -1 +1 @@\r\n-old\r\n+ação 😀\r\n';
  const chunks = [...Buffer.from(input)].map((byte) => Buffer.from([byte]));
  const result = await collect(parseStream(Readable.from(chunks)));
  assert.deepEqual(result.patch[0].lines, ['@@ -1 +1 @@', '-old', '+ação 😀']);
});

test('input errors propagate once and close the parser', async () => {
  const input = new PassThrough();
  const stream = parseStream(input);
  const error = new Error('upstream failed');
  const errors = [];
  let ended = false;
  stream.on('data', () => {}).on('error', (value) => errors.push(value)).on('end', () => { ended = true; });
  const closed = new Promise((resolve) => stream.once('close', resolve));
  input.destroy(error);
  await closed;
  assert.deepEqual(errors, [error]);
  assert.equal(ended, false);
  assert.equal(input.destroyed, true);
});

test('patch stream errors use the public error event exactly once', async () => {
  const error = new Error('patch failed');
  const parse = loadWith('../lib/parseStream.js', {
    './streamDiff': () => {
      const stream = new PassThrough({ objectMode: true });
      process.nextTick(() => stream.destroy(error));
      return stream;
    }
  });
  const stream = parse(Readable.from(['\n']));
  const errors = [];
  stream.on('data', () => {}).on('error', (value) => errors.push(value));
  await new Promise((resolve) => stream.once('close', resolve));
  assert.deepEqual(errors, [error]);
});

test('premature input close reports failure instead of hanging', async () => {
  const input = new PassThrough();
  const result = collect(parseStream(input));
  input.destroy();
  await assert.rejects(result, /closed before ending/);
});

test('patch parser preserves native backpressure and flushes all patches', async () => {
  const input = new PassThrough({ objectMode: true, highWaterMark: 1 });
  const output = streamDiff(input);
  let sawBackpressure = false;
  const writing = (async () => {
    for (let i = 0; i < 80; i++) {
      for (const line of ['diff --git a/file' + i + ' b/file' + i, '@@ -1 +1 @@', '+line']) {
        if (!input.write(line)) {
          sawBackpressure = true;
          await new Promise((resolve) => input.once('drain', resolve));
        }
      }
    }
    input.end();
  })();
  const patches = [];
  for await (const patch of output) {
    patches.push(patch);
    await new Promise((resolve) => setImmediate(resolve));
  }
  await writing;
  assert.equal(sawBackpressure, true);
  assert.equal(patches.length, 80);
  assert.equal(patches[79].bPath, 'file79');
});

test('real Git handles empty commits, invalid revisions, and cut output', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stackline-diff-tree-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.email=test@example.invalid', '-c', 'user.name=Test', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'empty');
  assert.deepEqual(await collect(diffTree(path.join(dir, '.git'))), {});
  await assert.rejects(collect(diffTree(path.join(dir, '.git'), { rev: 'missing-revision' })), /non-zero exit code/);
  fs.writeFileSync(path.join(dir, 'file.txt'), 'content\n'.repeat(100));
  git('add', 'file.txt'); git('commit', '-qm', 'content');
  const stream = diffTree(path.join(dir, '.git'), { MAX_DIFF_SIZE: 5 });
  let cuts = 0;
  stream.on('cut', () => { cuts++; });
  await collect(stream);
  assert.equal(cuts, 1);
});

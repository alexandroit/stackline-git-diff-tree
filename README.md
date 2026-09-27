# @stackline/git-diff-tree

A scoped maintenance fork of `git-diff-tree@1.1.0` by Alexandru Vladutu (MIT). It preserves the event API and diff parsers while replacing deprecated stream plumbing with native Node streams, forwarding patch errors correctly and safely finishing raw-only output. Requires Node.js 18 or newer and Git on PATH. `UPSTREAM.json` records the exact released source and integrity.

Install with `npm install @stackline/git-diff-tree` and use `require("@stackline/git-diff-tree")`. The original API documentation follows. `npm test` runs the two original scenarios on Node’s test runner plus stream, UTF-8 and real Git regressions. `npm run build` and `npm run lint` validate JavaScript syntax; `npm run test:package` validates a fresh packed consumer install.

This package retains `git-spawned-stream@1.0.1`; its existing child-process and size-limit behavior remains unchanged. The public `data` event continues to use two arguments `(type, data)`.

# git-diff-tree

Shelling out to [git-diff-tree(1)](https://www.kernel.org/pub/software/scm/git/docs/git-diff-tree.html) in a Node streamy fashion.

[![build status](https://secure.travis-ci.org/alessioalex/git-diff-tree.png)](http://travis-ci.org/alessioalex/git-diff-tree)

## Usage

```js
gitDiffTree(repoPath, [options]);
```

Where options defaults to:

```js
{
  rev : 'HEAD',
  originalRev : '--root',
  // don't output data for files that have more lines changed than allowed
  MAX_DIFF_LINES_PER_FILE: 300,
  // when the diff output is bigger than the limit destroy the stream
  MAX_DIFF_SIZE: (3 * 1024 * 1024) // 3 Mb
}
```

Example:

```js
var gitDiffTree = require('@stackline/git-diff-tree');
var path = require('path');
var repoPath = path.resolve(process.env.REPO || (__dirname + '/../.git'));

gitDiffTree(repoPath).on('data', function(type, data) {
  if (type === 'raw') {
    console.log('RAW DATA');
  } else if (type === 'patch') {
    console.log('PATCH DATA');
  } else if (type === 'stats') {
    console.log('FILE STATS');
  } else if (type === 'noshow') {
    console.log('Diffs not shown because files were too big');
  }
  console.log('------ \n');
  console.log(data);
  console.log('=================\n');
  // console.log(type, data);
}).on('error', function(err) {
  console.log('OH NOES!!');
  throw err;
}).on('cut', function() {
  console.log('-----------------');
  console.log('Diff to big, got cut :|');
}).on('end', function() {
  console.log('-----------------');
  console.log("That's all folks");
});
```

## Tests

```
npm test
```

## License

MIT

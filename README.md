# @stackline/git-diff-tree

> Stream Git tree differences in Node.js while preserving the git-diff-tree event API.

[![npm version](https://img.shields.io/npm/v/@stackline/git-diff-tree.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/git-diff-tree)
[![license](https://img.shields.io/npm/l/@stackline/git-diff-tree.svg?style=flat-square)](https://github.com/alexandroit/stackline-git-diff-tree)
[![GitHub repository](https://img.shields.io/badge/GitHub-alexandroit%2Fstackline-git-diff-tree-181717?style=flat-square&logo=github)](https://github.com/alexandroit/stackline-git-diff-tree)
[![Docs](https://img.shields.io/badge/docs-alexandro.net-0f766e?style=flat-square)](https://alexandro.net/docs/vanilla/git-diff-tree/)
[![Reddit community](https://img.shields.io/badge/community-r%2FStackline-ff4500?style=flat-square&logo=reddit&logoColor=white)](https://www.reddit.com/r/Stackline/)

**[Documentation](https://alexandro.net/docs/vanilla/git-diff-tree/)** | **[npm](https://www.npmjs.com/package/@stackline/git-diff-tree)** | **[Issues](https://github.com/alexandroit/stackline-git-diff-tree/issues)** | **[Repository](https://github.com/alexandroit/stackline-git-diff-tree)**

**Current package version:** `1.0.2`

---

## Why this package?

A scoped maintenance fork of `git-diff-tree@1.1.0` by Alexandru Vladutu (MIT). It preserves the event API and diff parsers while replacing deprecated stream plumbing with native Node streams, forwarding patch errors correctly and safely finishing raw-only output. Requires Node.js 18 or newer and Git on PATH. `UPSTREAM.json` records the exact released source and integrity.

Install with `npm install @stackline/git-diff-tree` and use `require("@stackline/git-diff-tree")`. The original API documentation follows. `npm test` runs the two original scenarios on Node’s test runner plus stream, UTF-8 and real Git regressions. `npm run build` and `npm run lint` validate JavaScript syntax; `npm run test:package` validates a fresh packed consumer install.

This package installs the verified `@stackline/git-spawned-stream@1.0.0` maintenance fork through the `git-spawned-stream` alias; its existing child-process and size-limit behavior remains unchanged. The public `data` event continues to use two arguments `(type, data)`.

Shelling out to [git-diff-tree(1)](https://www.kernel.org/pub/software/scm/git/docs/git-diff-tree.html) in a Node streamy fashion.

## Compatibility

| Item | Value |
| --- | --- |
| Package | `@stackline/git-diff-tree@1.0.2` |
| Supported Node.js | `>=18` |
| Module entry | `index.js` (CommonJS) |
| Runtime dependencies | 1 direct dependency |
| External tool | Git available on `PATH` |

## Installation

```bash
npm install @stackline/git-diff-tree
```

## Usage

```js
const gitDiffTree = require('@stackline/git-diff-tree');
const changes = gitDiffTree(process.cwd());
changes.on('data', (type, data) => console.log(type, data));
changes.on('error', error => { throw error; });
```

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

## Security

Git must be available on PATH. The existing limits for total diff size and changed lines per file are retained; configure them for the repository being processed.

## API Surface

The usage reference above documents the existing public API and its input/output behavior.

## Local Development

Clone the [repository](https://github.com/alexandroit/stackline-git-diff-tree) and run the following commands from its root:

```bash
npm ci
npm run build
npm test
npm run lint
```

The retained upstream development notes below include historical tooling; the commands above are the maintained package checks.

### Upstream tests

```
npm test
```

## Consumer Smoke Test

`npm run test:package` packs the library and exercises an isolated consumer using the repository fixture.

## Release Checklist

1. Update the package version, lockfile, generated version fields, and changelog together.
2. Run the development checks above and audit both `npm audit` and `npm audit --omit=dev`.
3. Use the [GitHub publish workflow](https://github.com/alexandroit/stackline-git-diff-tree/actions/workflows/publish.yml) with its `Prod` environment to publish the exact CI tarball.
4. Verify public npm bytes, package identity, provenance, and the immutable GitHub release evidence.

## License

[MIT](https://github.com/alexandroit/stackline-git-diff-tree/blob/main/LICENSE). Original copyright notices and upstream attribution are retained.

MIT

See [NOTICE](https://github.com/alexandroit/stackline-git-diff-tree/blob/main/NOTICE) for retained attribution.

## Credits and original authors

- Alexandru Vladutu.
- Copyright (c) 2026 Stackline contributors.
- Stackline maintenance: [Alexandro Paixao Marques](https://www.linkedin.com/in/aleinfo/) and [Stackline contributors](https://github.com/alexandroit).

Original copyright, license notices and contributor acknowledgements remain part of this distribution. Stackline maintenance does not replace authorship of the original work.

## Community and Links

- [Stackline website](https://alexandro.net/)
- [GitHub projects](https://github.com/alexandroit)
- [npm packages](https://www.npmjs.com/~alex360qc)
- [Reddit community — r/Stackline](https://www.reddit.com/r/Stackline/)
- [Maintainer LinkedIn](https://www.linkedin.com/in/aleinfo/)

Use this repository's issue tracker for reproducible bugs and feature requests. Join r/Stackline for examples, usage questions and release discussions.

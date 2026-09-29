# Changelog

## 1.0.1 (2026-09-28)

- Replace `git-spawned-stream` with exact alias `npm:@stackline/git-spawned-stream@1.0.0`, preserving existing import names.

- Standardize package documentation, preserve the API reference and upstream attribution, and add Stackline community links.
- Add focused npm discovery keywords and consistent repository metadata.
- Keep the runtime API unchanged; maintenance dependency aliases are listed above.
- Correct the pinned artifact-upload action commit while preserving the publish.yml workflow and Prod environment.

## 1.0.0

- Replace pump-chain, split-transform-stream and direct through2 dependencies with Node Transform, StringDecoder and pipeline.
- Forward patch errors through the error event and destroy affected streams.
- Flush the final patch before end, handle raw-only output and preserve UTF-8 across chunks.
- Restore both published upstream test scenarios on node:test and add native-stream and real Git regressions.

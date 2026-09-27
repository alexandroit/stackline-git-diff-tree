# Changelog

## 1.0.0

- Replace pump-chain, split-transform-stream and direct through2 dependencies with Node Transform, StringDecoder and pipeline.
- Forward patch errors through the error event and destroy affected streams.
- Flush the final patch before end, handle raw-only output and preserve UTF-8 across chunks.
- Restore both published upstream test scenarios on node:test and add native-stream and real Git regressions.

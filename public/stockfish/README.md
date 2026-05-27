# Stockfish Worker Asset

This directory contains the browser Stockfish 18 lite single-threaded WebAssembly build from [`stockfish`](https://www.npmjs.com/package/stockfish).

- `stockfish.js` is the same-origin worker entrypoint loaded by the app.
- `stockfish.wasm` is the WASM binary loaded by the worker.
- `COPYING.txt` contains the upstream GPLv3 license text.

The app loads `/stockfish/stockfish.js` in a browser `Worker`. If the asset or Web Worker/WASM support is unavailable, the UI reports that Stockfish is unavailable and local two-player mode remains usable.

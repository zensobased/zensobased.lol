# ffmpeg.wasm wrapper

`ffmpeg.js` and `814.ffmpeg.js` are the UMD build of [`@ffmpeg/ffmpeg` 0.12.10](https://github.com/ffmpegwasm/ffmpeg.wasm),
vendored so the worker script loads from the same origin (browsers refuse
cross-origin workers). The core (`@ffmpeg/core` 0.12.6) is fetched from
jsDelivr at runtime and turned into a blob URL.

Both files are MIT licensed, © Jerome Wu and the ffmpeg.wasm contributors.

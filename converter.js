(() => {
  /* converts a local file or a direct media link to mp3, entirely in the browser */

  const CDN = "https://cdn.jsdelivr.net/npm";
  const FFMPEG_JS = "assets/ffmpeg/ffmpeg.js?v=1";
  const CORE_BASE = `${CDN}/@ffmpeg/core@0.12.6/dist/umd`;
  const LIMIT = 100 * 1024 * 1024;
  const OUTPUT = "output.mp3";
  const DEFAULT_META = "mp3 · wav · m4a · flac · mp4 · mov · webm — 100 mb max";

  const STREAMING_HOSTS = [
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "spotify.com",
    "spoti.fi",
    "tiktok.com",
    "instagram.com",
    "facebook.com",
    "fb.watch",
    "x.com",
    "twitter.com",
    "soundcloud.com",
    "music.apple.com",
    "deezer.com",
    "vimeo.com",
    "twitch.tv",
  ];

  const els = {
    card: document.getElementById("convertCard"),
    form: document.getElementById("convertForm"),
    fields: document.getElementById("convertFields"),
    drop: document.getElementById("convertDrop"),
    file: document.getElementById("convertFile"),
    name: document.getElementById("convertFileName"),
    meta: document.getElementById("convertFileMeta"),
    clear: document.getElementById("convertClear"),
    url: document.getElementById("convertUrl"),
    bitrate: document.getElementById("convertBitrate"),
    go: document.getElementById("convertGo"),
    error: document.getElementById("convertError"),
    progress: document.getElementById("convertProgress"),
    bar: document.getElementById("convertBar"),
    status: document.getElementById("convertStatus"),
    cancel: document.getElementById("convertCancel"),
    log: document.getElementById("convertLog"),
    logText: document.getElementById("convertLogText"),
    result: document.getElementById("convertResult"),
    resultName: document.getElementById("convertResultName"),
    resultMeta: document.getElementById("convertResultMeta"),
    audio: document.getElementById("convertAudio"),
    download: document.getElementById("convertDownload"),
    again: document.getElementById("convertAgain"),
  };

  if (!els.card || !els.form) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let picked = null;
  let engine = null;
  let enginePromise = null;
  let job = null;
  let outUrl = "";
  let logLines = [];

  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
  });

  /* ---------- helpers ---------- */

  function userError(message) {
    const err = new Error(message);
    err.userMessage = message;
    return err;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 kb";
    const units = ["b", "kb", "mb", "gb"];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / 1024 ** index;
    return `${index === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
  }

  function extFromMime(mime) {
    const map = {
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/mp4": ".m4a",
      "audio/x-m4a": ".m4a",
      "audio/aac": ".aac",
      "audio/wav": ".wav",
      "audio/x-wav": ".wav",
      "audio/ogg": ".ogg",
      "audio/opus": ".opus",
      "audio/flac": ".flac",
      "audio/webm": ".webm",
      "video/mp4": ".mp4",
      "video/webm": ".webm",
      "video/quicktime": ".mov",
      "video/x-matroska": ".mkv",
      "video/x-msvideo": ".avi",
      "video/mpeg": ".mpg",
      "video/3gpp": ".3gp",
    };
    return map[String(mime || "").toLowerCase()] || "";
  }

  function extFor(file) {
    const match = /\.([a-z0-9]{1,8})$/i.exec(file.name || "");
    if (match) return `.${match[1].toLowerCase()}`;
    return extFromMime(file.type) || "";
  }

  function mp3Name(name) {
    const base = String(name || "audio")
      .replace(/\.[^.]+$/, "")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    return `${base || "audio"}.mp3`;
  }

  function nameFromUrl(url, mime) {
    let leaf = "";
    try {
      leaf = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    } catch (err) {
      leaf = url.pathname.split("/").filter(Boolean).pop() || "";
    }
    leaf = leaf.replace(/[^\w.\-() ]+/g, "_").slice(0, 90);
    if (!leaf) leaf = "link";
    if (!/\.[a-z0-9]{2,5}$/i.test(leaf)) leaf += extFromMime(mime);
    return leaf;
  }

  function isStreamingHost(hostname) {
    const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
    return STREAMING_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  }

  function tailLog() {
    return logLines.filter(Boolean).slice(-14).join("\n");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("couldn't load the converter library"));
      document.head.appendChild(script);
    });
  }

  async function loadCoreBlob(url, mime, token) {
    const track = url.endsWith(".wasm");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`engine download ${res.status}`);

    const reader = res.body && typeof res.body.getReader === "function" ? res.body.getReader() : null;
    let blob;

    if (!reader) {
      blob = new Blob([await res.arrayBuffer()], { type: mime });
    } else {
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        chunks.push(value);
        received += value.byteLength;
        if (track && job === token) {
          setProgress(null);
          setStatus(token, `downloading engine… ${formatBytes(received)} of ~31 mb`);
        }
      }

      blob = new Blob(chunks, { type: mime });
    }

    return URL.createObjectURL(blob);
  }

  /* ---------- ui ---------- */

  function setProgress(ratio) {
    if (!Number.isFinite(ratio)) {
      els.bar.classList.add("is-indeterminate");
      els.bar.style.width = "";
      return;
    }
    els.bar.classList.remove("is-indeterminate");
    els.bar.style.width = `${Math.max(2, Math.min(100, Math.round(ratio * 100)))}%`;
  }

  function setStatus(token, text) {
    if (job !== token) return;
    els.status.textContent = text;
  }

  function setBusy(busy) {
    els.fields.disabled = busy;
    els.clear.disabled = busy;
    els.card.setAttribute("aria-busy", busy ? "true" : "false");
    els.progress.hidden = !busy;
    if (!busy) setProgress(null);
  }

  function clearError() {
    els.error.hidden = true;
    els.error.textContent = "";
    els.log.hidden = true;
    els.logText.textContent = "";
  }

  function showError(message, detail) {
    els.error.textContent = message;
    els.error.hidden = false;
    if (detail) {
      els.logText.textContent = detail;
      els.log.hidden = false;
    } else {
      els.log.hidden = true;
      els.logText.textContent = "";
    }
  }

  function resetResult() {
    els.result.hidden = true;
    try {
      els.audio.pause();
    } catch (err) {
      /* not playing */
    }
    els.audio.removeAttribute("src");
    els.download.removeAttribute("href");
    if (outUrl) {
      URL.revokeObjectURL(outUrl);
      outUrl = "";
    }
  }

  function showResult(blob, name, bitrate) {
    if (outUrl) URL.revokeObjectURL(outUrl);
    outUrl = URL.createObjectURL(blob);

    els.resultName.textContent = name;
    els.resultMeta.textContent = `${formatBytes(blob.size)} · ${bitrate} kbps · mp3`;
    els.audio.src = outUrl;
    els.download.href = outUrl;
    els.download.download = name;
    els.result.hidden = false;

    if (!reducedMotion) {
      els.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function acceptFile(file) {
    if (!file) return;
    clearError();

    if (file.size === 0) {
      showError("that file is empty.");
      return;
    }
    if (file.size > LIMIT) {
      showError("that file is too large — 100 mb max.");
      return;
    }

    const type = String(file.type || "").toLowerCase();
    if (type.startsWith("image/") || type.startsWith("text/") || type === "application/pdf") {
      showError("that's not an audio or video file.");
      return;
    }

    picked = file;
    els.url.value = "";
    els.drop.classList.add("has-file");
    els.name.textContent = file.name || "selected file";
    els.meta.textContent = `${formatBytes(file.size)} · ready to convert`;
    els.clear.hidden = false;
  }

  function clearFile() {
    picked = null;
    els.file.value = "";
    els.drop.classList.remove("has-file");
    els.name.textContent = "drop a file or browse";
    els.meta.textContent = DEFAULT_META;
    els.clear.hidden = true;
    clearError();
  }

  /* ---------- engine ---------- */

  async function ensureEngine(token) {
    if (engine) return engine;

    if (!enginePromise) {
      enginePromise = (async () => {
        setStatus(token, "loading converter…");
        setProgress(null);

        if (!window.FFmpegWASM) await loadScript(FFMPEG_JS);

        const FFmpeg = window.FFmpegWASM && window.FFmpegWASM.FFmpeg;
        if (typeof FFmpeg !== "function") throw new Error("converter library missing");

        const instance = new FFmpeg();
        logLines = [];

        instance.on("log", ({ message }) => {
          if (typeof message !== "string" || !message.trim()) return;
          logLines.push(message);
          if (logLines.length > 140) logLines.shift();
        });

        instance.on("progress", ({ progress }) => {
          if (!job) return;
          if (Number.isFinite(progress) && progress > 0) {
            const ratio = Math.min(1, progress);
            setProgress(ratio);
            els.status.textContent = `converting… ${Math.round(ratio * 100)}%`;
          } else {
            setProgress(null);
          }
        });

        setStatus(token, "downloading engine… once");
        const coreURL = await loadCoreBlob(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript", token);
        const wasmURL = await loadCoreBlob(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm", token);

        setStatus(token, "starting engine…");
        await instance.load({ coreURL, wasmURL });

        engine = instance;
        return instance;
      })().catch((err) => {
        enginePromise = null;
        if (err && err.message) logLines.push(`engine: ${err.message}`);
        throw err;
      });
    }

    return enginePromise;
  }

  /* ---------- fetching a link ---------- */

  async function fetchMedia(raw, token) {
    let url;
    try {
      url = new URL(raw);
    } catch (err) {
      throw userError("that doesn't look like a valid link.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw userError("only http and https links work.");
    }

    if (isStreamingHost(url.hostname)) {
      throw userError(
        "that's a streaming page, not a media file — YouTube, Spotify and TikTok don't allow downloads. export your own upload from the app, then drop the file here."
      );
    }

    const controller = new AbortController();
    token.controller = controller;

    let res;
    try {
      res = await fetch(url.href, {
        mode: "cors",
        redirect: "follow",
        signal: controller.signal,
        headers: { Accept: "audio/*,video/*,*/*;q=0.8" },
      });
    } catch (err) {
      if (err && err.name === "AbortError") throw err;
      throw userError(
        "that link couldn't be downloaded — the host blocks browsers. save the file and drop it in instead."
      );
    }

    if (!res.ok) throw userError(`that link returned ${res.status}.`);

    const mime = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (
      mime.startsWith("text/") ||
      mime.startsWith("image/") ||
      mime.includes("json") ||
      mime.includes("html") ||
      mime.includes("xml")
    ) {
      throw userError(
        "that link is a web page, not a media file — paste a direct link ending in .mp3, .mp4, .webm…"
      );
    }

    const total = Number(res.headers.get("content-length") || 0);
    if (total > LIMIT) throw userError("that file is too large — 100 mb max.");

    const reader = res.body && typeof res.body.getReader === "function" ? res.body.getReader() : null;
    let blob;

    if (!reader) {
      blob = await res.blob();
    } else {
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        received += value.byteLength;
        if (received > LIMIT) {
          controller.abort();
          throw userError("that file is too large — 100 mb max.");
        }

        chunks.push(value);

        if (total > 0) {
          setProgress(received / total);
          setStatus(token, `fetching link… ${Math.round((received / total) * 100)}%`);
        } else {
          setStatus(token, `fetching link… ${formatBytes(received)}`);
        }
      }

      blob = new Blob(chunks, { type: mime || "application/octet-stream" });
    }

    if (!blob.size) throw userError("that link came back empty.");
    if (blob.size > LIMIT) throw userError("that file is too large — 100 mb max.");

    return new File([blob], nameFromUrl(url, mime), {
      type: blob.type || mime || "application/octet-stream",
    });
  }

  /* ---------- converting ---------- */

  async function convert(bitrate) {
    const token = { cancelled: false, controller: null };
    job = token;
    logLines = [];

    resetResult();
    clearError();
    setBusy(true);
    setProgress(null);
    els.status.textContent = "preparing…";

    try {
      let file = picked;

      if (!file) {
        els.status.textContent = "fetching link…";
        file = await fetchMedia(els.url.value.trim(), token);
      }

      if (token.cancelled) return;
      if (file.size > LIMIT) throw userError("that file is too large — 100 mb max.");

      const instance = await ensureEngine(token);
      if (token.cancelled) return;

      setProgress(null);
      els.status.textContent = "converting…";

      const input = `input${extFor(file)}`;
      await instance.writeFile(input, new Uint8Array(await file.arrayBuffer()));

      let code = 1;
      try {
        code = await instance.exec([
          "-hide_banner",
          "-nostdin",
          "-y",
          "-i",
          input,
          "-map",
          "0:a:0",
          "-vn",
          "-c:a",
          "libmp3lame",
          "-b:a",
          `${bitrate}k`,
          "-id3v2_version",
          "3",
          OUTPUT,
        ]);
      } finally {
        try {
          await instance.deleteFile(input);
        } catch (err) {
          /* already gone */
        }
      }

      if (token.cancelled) return;
      if (code !== 0) {
        try {
          await instance.deleteFile(OUTPUT);
        } catch (err) {
          /* nothing written */
        }
        throw userError(
          "that file couldn't be converted — it may have no audio track, or use a format the converter doesn't handle."
        );
      }

      const data = await instance.readFile(OUTPUT);
      try {
        await instance.deleteFile(OUTPUT);
      } catch (err) {
        /* already gone */
      }

      if (token.cancelled) return;
      if (typeof data === "string" || !data || data.byteLength < 128) {
        throw userError("the conversion came back empty — try another file.");
      }

      const blob = new Blob([data], { type: "audio/mpeg" });
      showResult(blob, mp3Name(file.name), bitrate);
    } catch (err) {
      if (token.cancelled) return;
      if (err && err.name === "AbortError") return;

      const message =
        err && err.userMessage
          ? err.userMessage
          : "the converter couldn't load — check your connection and try again.";

      showError(message, tailLog());
    } finally {
      if (job === token) {
        job = null;
        setBusy(false);
      }
    }
  }

  /* ---------- events ---------- */

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (job) return;

    const url = els.url.value.trim();
    if (!picked && !url) {
      showError("drop a file or paste a direct link first.");
      els.url.focus();
      return;
    }

    convert(els.bitrate.value);
  });

  els.file.addEventListener("change", () => {
    const file = els.file.files && els.file.files[0];
    if (file) acceptFile(file);
    els.file.value = "";
  });

  els.clear.addEventListener("click", () => {
    if (job) return;
    clearFile();
  });

  els.url.addEventListener("input", () => {
    if (picked && els.url.value.trim()) clearFile();
    if (!els.error.hidden) clearError();
  });

  let dragDepth = 0;

  els.drop.addEventListener("dragenter", (e) => {
    e.preventDefault();
    if (job) return;
    dragDepth += 1;
    els.drop.classList.add("is-drag");
  });

  els.drop.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) els.drop.classList.remove("is-drag");
  });

  els.drop.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  els.drop.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    els.drop.classList.remove("is-drag");
    if (job) return;
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) acceptFile(file);
  });

  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    if (!els.drop.contains(e.target)) e.preventDefault();
  });

  els.cancel.addEventListener("click", () => {
    const token = job;
    if (!token) return;

    token.cancelled = true;
    job = null;

    if (token.controller) {
      try {
        token.controller.abort();
      } catch (err) {
        /* already finished */
      }
    }

    if (engine) {
      try {
        engine.terminate();
      } catch (err) {
        /* already gone */
      }
      engine = null;
      enginePromise = null;
    }

    setBusy(false);
    els.status.textContent = "cancelled";
  });

  els.again.addEventListener("click", () => {
    if (job) return;
    resetResult();
    clearFile();
    els.url.value = "";
    els.status.textContent = "preparing…";
    setProgress(null);
    els.card.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  });

  window.addEventListener("beforeunload", () => {
    if (outUrl) URL.revokeObjectURL(outUrl);
  });
})();

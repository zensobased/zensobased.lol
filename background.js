(() => {
  /* one global backdrop, shared by the profile, music and favourites pages */

  const API_BASE = "https://site-da7f266cd38645a88d82577d4531a2db.freebuff.page";
  const CACHE_KEY = "zen.background";
  const REFRESH_MS = 30000;

  const box = document.querySelector(".bg-image");
  if (!box) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentUrl = "";
  let currentKind = "";
  let generation = 0;

  function readCache() {
    try {
      const data = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
      return data && typeof data === "object" && typeof data.url === "string" ? data : null;
    } catch (err) {
      return null;
    }
  }

  function writeCache(entry) {
    try {
      if (!entry) window.localStorage.removeItem(CACHE_KEY);
      else window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (err) {
      /* private mode — the API still drives the current page */
    }
  }

  function removeMedia() {
    generation += 1;
    box.querySelectorAll(".site-bg").forEach((el) => el.remove());
    currentUrl = "";
    currentKind = "";
  }

  function clear() {
    removeMedia();
    writeCache(null);
  }

  function render(entry) {
    if (!entry || !entry.url) {
      clear();
      return;
    }

    const url = String(entry.url);
    const kind = entry.kind === "video" ? "video" : "image";

    if (url === currentUrl && kind === currentKind) return;

    const token = ++generation;
    let media;

    if (kind === "video") {
      media = document.createElement("video");
      media.className = "site-bg";
      media.muted = true;
      media.defaultMuted = true;
      media.loop = true;
      media.playsInline = true;
      media.preload = "auto";
      media.autoplay = !reducedMotion;
      media.poster = "";
      media.setAttribute("muted", "");
      media.setAttribute("playsinline", "");
      media.setAttribute("aria-hidden", "true");
      media.tabIndex = -1;
      media.src = url;
    } else {
      media = document.createElement("img");
      media.className = "site-bg";
      media.alt = "";
      media.decoding = "async";
      media.src = url;
    }

    media.draggable = false;

    const readyEvent = kind === "video" ? "loadeddata" : "load";

    media.addEventListener(
      readyEvent,
      () => {
        if (token !== generation) return;

        box.querySelectorAll(".site-bg").forEach((el) => el.remove());
        box.appendChild(media);
        currentUrl = url;
        currentKind = kind;
        writeCache({ url, kind, key: entry.key || "", name: entry.name || "" });

        if (kind === "video" && !reducedMotion) {
          const started = media.play();
          if (started && typeof started.catch === "function") started.catch(() => {});
        }
      },
      { once: true }
    );

    media.addEventListener(
      "error",
      () => {
        if (token !== generation) return;
        media.remove();
      },
      { once: true }
    );

    if (kind === "video") media.load();
  }

  async function refresh() {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { cache: "no-store" });
      if (!res.ok) throw new Error(`profile ${res.status}`);

      const data = await res.json();
      const entry = data.background
        ? {
            url: data.background,
            kind: data.backgroundKind === "video" ? "video" : "image",
            key: data.backgroundKey || "",
            name: data.backgroundName || "",
          }
        : null;

      if (entry) render(entry);
      else clear();
    } catch (err) {
      /* keep the cached backdrop if the API is unreachable */
    }
  }

  window.ZenBackground = { refresh, render, clear };

  const cached = readCache();
  if (cached) render(cached);

  refresh();
  window.setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refresh();
  });
})();

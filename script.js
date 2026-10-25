(() => {
  /* ---------- config ---------- */

  const API_BASE = "https://site-da7f266cd38645a88d82577d4531a2db.freebuff.page";
  const CACHE_KEY = "zen.data";

  const DEFAULTS = {
    handle: "@rebornzen",
    bio: "yooo wsp",
    location: "Tokyo, Japan",
    views: 1042,
    lastfm: "",
    song: "assets/raininglol.mp3",
    songKey: "",
    songName: "raininglol",
    background: "",
    backgroundKey: "",
    backgroundName: "",
    backgroundKind: "",
  };

  /* ---------- elements ---------- */

  const loader = document.getElementById("loader");
  const audioBtn = document.getElementById("audioBtn");
  const song = document.getElementById("song");
  const views = document.getElementById("views");
  const nameEl = document.querySelector(".name");
  const card = document.querySelector(".card");
  const tiltBox = document.getElementById("tiltBox");

  const handleEl = document.getElementById("handle");
  const bioEl = document.getElementById("bio");
  const locationEl = document.getElementById("location");
  const descriptionMeta = document.querySelector('meta[name="description"]');

  const discordPill = document.getElementById("discord");
  const discordLabel = document.getElementById("discordLabel");
  const avatarImg = document.getElementById("avatar");
  const favicon = document.getElementById("favicon");

  const adminEl = document.getElementById("admin");
  const adminForm = document.getElementById("adminForm");
  const adminKeyField = document.getElementById("adminKeyField");
  const adminKeyInput = document.getElementById("adminKey");
  const adminHandleField = document.getElementById("adminHandleField");
  const adminBioField = document.getElementById("adminBioField");
  const adminLocationField = document.getElementById("adminLocationField");
  const adminLastfmField = document.getElementById("adminLastfmField");
  const adminViewsField = document.getElementById("adminViewsField");
  const adminHandleInput = document.getElementById("adminHandle");
  const adminBioInput = document.getElementById("adminBio");
  const adminLocationInput = document.getElementById("adminLocation");
  const adminLastfmInput = document.getElementById("adminLastfm");
  const adminViewsInput = document.getElementById("adminViews");
  const adminSongField = document.getElementById("adminSongField");
  const adminSongSelect = document.getElementById("adminSong");
  const adminSongUploadField = document.getElementById("adminSongUploadField");
  const adminSongFile = document.getElementById("adminSongFile");
  const adminBackgroundField = document.getElementById("adminBackgroundField");
  const adminBackgroundSelect = document.getElementById("adminBackground");
  const adminBackgroundUploadField = document.getElementById("adminBackgroundUploadField");
  const adminBackgroundFile = document.getElementById("adminBackgroundFile");
  const adminResetBtn = document.getElementById("adminReset");
  const adminHint = document.getElementById("adminHint");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const formatViews = (n) => new Intl.NumberFormat("en-US").format(n);

  const state = { ...DEFAULTS };

  let entered = false;
  let viewsLocked = false;
  let adminUnlocked = false;
  let adminSecret = "";
  let songs = [];
  let songsLoading = false;
  let backgrounds = [];
  let backgroundsLoading = false;

  /* ---------- profile cache ---------- */

  function readCache() {
    try {
      const data = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
      return data && typeof data === "object" ? data : null;
    } catch (err) {
      return null;
    }
  }

  function writeCache() {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch (err) {
      /* private mode: the API stays authoritative anyway */
    }
  }

  function applyProfile(data) {
    if (!data) return;

    if (typeof data.handle === "string" && data.handle.trim()) {
      state.handle = data.handle.trim();
      if (handleEl) handleEl.textContent = state.handle;
    }

    if (typeof data.bio === "string") {
      state.bio = data.bio;
      if (bioEl) bioEl.textContent = data.bio;
      if (descriptionMeta) descriptionMeta.setAttribute("content", data.bio);
    }

    if (typeof data.location === "string" && data.location.trim()) {
      state.location = data.location.trim();
      if (locationEl) locationEl.textContent = state.location;
    }

    if (typeof data.lastfm === "string") {
      state.lastfm = data.lastfm.trim();
    }

    if (typeof data.songKey === "string") {
      state.songKey = data.songKey.trim();
    }

    if (typeof data.songName === "string" && data.songName.trim()) {
      state.songName = data.songName.trim();
    }

    if (typeof data.song === "string" && data.song.trim()) {
      state.song = data.song.trim();
      applySong(state.song);
    }

    if (typeof data.background === "string") {
      state.background = data.background.trim();
    }

    if (typeof data.backgroundKey === "string") {
      state.backgroundKey = data.backgroundKey.trim();
    }

    if (typeof data.backgroundName === "string") {
      state.backgroundName = data.backgroundName.trim();
    }

    if (typeof data.backgroundKind === "string") {
      state.backgroundKind = data.backgroundKind.trim();
    }

    const nextViews = Number(data.views);
    if (Number.isFinite(nextViews) && nextViews >= 0) {
      state.views = Math.floor(nextViews);
      if (!entered) views.textContent = formatViews(state.views);
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { cache: "no-store" });
      if (!res.ok) throw new Error(`profile ${res.status}`);

      const data = await res.json();
      applyProfile(data);
      writeCache();
    } catch (err) {
      /* keep whatever the cache or markup already shows */
    }
  }

  async function bumpViews() {
    try {
      const res = await fetch(`${API_BASE}/api/views`, { method: "POST" });
      if (!res.ok) throw new Error(`views ${res.status}`);

      const data = await res.json();
      const next = Number(data.views);
      if (!Number.isFinite(next)) throw new Error("bad views payload");

      state.views = Math.floor(next);
      writeCache();
      return state.views;
    } catch (err) {
      return state.views;
    }
  }

  applyProfile(readCache());
  loadProfile();

  /* ---------- view counter ---------- */

  function countUp(el, target, duration = 1400) {
    const start = performance.now();
    const from = 0;

    function frame(now) {
      if (viewsLocked) return;

      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      el.textContent = formatViews(Math.round(from + (target - from) * eased));

      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = formatViews(target);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- typewriter name ---------- */

  function startTyping() {
    if (!nameEl || reducedMotion) return;

    const full = nameEl.textContent.trim();
    if (!full) return;

    // reserve the finished width (plus the caret) so the badges don't jitter
    const width = nameEl.getBoundingClientRect().width;
    nameEl.textContent = "";
    if (width) nameEl.style.minWidth = Math.ceil(width + 9) + "px";
    nameEl.classList.add("is-typing");

    let i = 0;

    function typeNext() {
      if (i >= full.length) {
        window.setTimeout(() => nameEl.classList.remove("is-typing"), 1500);
        return;
      }
      i += 1;
      nameEl.textContent = full.slice(0, i);
      window.setTimeout(typeNext, i === 1 ? 240 : 150);
    }

    window.setTimeout(typeNext, 300);
  }

  /* ---------- audio ---------- */

  function applySong(url) {
    if (!url || !song) return;

    let current = "";
    let next = "";

    try {
      current = new URL(song.currentSrc || song.src || "", window.location.href).href;
      next = new URL(url, window.location.href).href;
    } catch (err) {
      return;
    }

    if (!next || current === next) return;

    const wasPlaying = !song.paused;
    song.src = url;
    song.load();

    if (wasPlaying) {
      const started = song.play();
      if (started && typeof started.then === "function") started.catch(syncAudio);
    }

    syncAudio();
  }

  function syncAudio() {
    const playing = !song.paused;
    audioBtn.classList.toggle("is-playing", playing);
    audioBtn.setAttribute("aria-pressed", String(playing));
    audioBtn.setAttribute("aria-label", playing ? "Pause profile song" : "Play profile song");
  }

  audioBtn.addEventListener("click", async () => {
    if (song.paused) {
      try {
        await song.play();
      } catch (err) {
        /* playback blocked or unsupported */
      }
    } else {
      song.pause();
    }
    syncAudio();
  });

  song.addEventListener("play", syncAudio);
  song.addEventListener("pause", syncAudio);
  song.addEventListener("ended", syncAudio);

  /* ---------- click to enter ---------- */

  function enter() {
    if (entered) return;
    entered = true;

    document.body.classList.add("is-ready");
    loader.classList.add("is-done");
    window.setTimeout(() => loader.remove(), 700);

    const optimistic = state.views + 1;
    views.textContent = "0";
    countUp(views, optimistic);

    bumpViews().then((actual) => {
      if (actual !== optimistic) {
        viewsLocked = true;
        views.textContent = formatViews(actual);
      }
    });

    startTyping();

    // this click is the user gesture, so the song is allowed to start
    const started = song.play();
    if (started && typeof started.then === "function") {
      started.then(syncAudio).catch(syncAudio);
    } else {
      syncAudio();
    }
  }

  loader.addEventListener("click", enter);
  loader.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      enter();
    }
  });

  /* ---------- discord status + avatar ---------- */

  const DISCORD_ID = "945118422331686962";
  const presenceUrl = `https://api.lanyard.rest/v1/users/${DISCORD_ID}`;

  const STATUS_LABEL = { online: "online", idle: "idle", dnd: "dnd", offline: "offline" };

  function discordAvatar(user, size) {
    if (!user) return "";

    if (!user.avatar) {
      // default Discord avatar: discriminator % 5 for legacy accounts, id-based otherwise
      const index =
        user.discriminator && user.discriminator !== "0"
          ? Number(user.discriminator) % 5
          : Number((BigInt(user.id) >> 22n) % 6n);
      return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
    }

    const ext = user.avatar.startsWith("a_") ? "gif" : "webp";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }

  let liveAvatar = "";

  function applyAvatar(user) {
    const url = discordAvatar(user, 512);
    if (!url || url === liveAvatar || !avatarImg) return;

    // only swap once the Discord image has actually downloaded
    const probe = new Image();
    probe.onload = () => {
      liveAvatar = url;
      avatarImg.src = url;
      if (favicon) favicon.href = url;
    };
    probe.src = url;
  }

  function applyStatus(status, user) {
    const key = STATUS_LABEL[status] ? status : "offline";
    if (discordPill) {
      discordPill.dataset.status = key;
      const who = user && (user.global_name || user.username);
      discordPill.title = who ? `Discord: ${who} — ${key}` : "Discord status";
    }
    if (discordLabel) discordLabel.textContent = STATUS_LABEL[key];
  }

  async function refreshPresence() {
    try {
      const res = await fetch(presenceUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`lanyard ${res.status}`);
      const payload = await res.json();
      if (!payload.success || !payload.data) throw new Error("no presence data");

      applyStatus(payload.data.discord_status, payload.data.discord_user);
      applyAvatar(payload.data.discord_user);
    } catch (err) {
      // keep the local pfp; just report offline once we have no answer at all
      if (!discordPill || discordPill.dataset.status === "loading") {
        applyStatus("offline", null);
      }
    }
  }

  refreshPresence();
  window.setInterval(refreshPresence, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshPresence();
  });

  /* ---------- hidden admin (alt + y, or hold the view count) ---------- */

  function setHint(text, isError) {
    if (!adminHint) return;
    adminHint.textContent = text;
    adminHint.classList.toggle("is-error", Boolean(isError));
  }

  function renderSongOptions() {
    if (!adminSongSelect) return;

    const wanted = adminSongSelect.value || state.songKey || "";
    const list = songs.length
      ? [...songs]
      : [{ id: "", name: "raininglol", builtin: true }];

    if (wanted && !list.some((item) => (item.id || "") === wanted)) {
      list.push({ id: wanted, name: state.songName || "current song" });
    }

    adminSongSelect.textContent = "";

    list.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id || "";
      option.textContent = item.builtin ? `${item.name} (default)` : item.name;
      adminSongSelect.appendChild(option);
    });

    adminSongSelect.value = list.some((item) => (item.id || "") === wanted)
      ? wanted
      : "";
  }

  async function loadSongs() {
    if (!adminSongSelect || songsLoading) return;

    songsLoading = true;

    try {
      const res = await fetch(`${API_BASE}/api/songs`, { cache: "no-store" });
      if (!res.ok) throw new Error(`songs ${res.status}`);

      const data = await res.json();
      songs = Array.isArray(data.songs) ? data.songs : [];
      renderSongOptions();
    } catch (err) {
      renderSongOptions();
    } finally {
      songsLoading = false;
    }
  }

  function renderBackgroundOptions() {
    if (!adminBackgroundSelect) return;

    const wanted = adminBackgroundSelect.value || state.backgroundKey || "";
    const list = backgrounds.slice();

    if (wanted && !list.some((item) => (item.id || "") === wanted)) {
      list.push({ id: wanted, name: state.backgroundName || "current background" });
    }

    adminBackgroundSelect.textContent = "";

    const fallback = document.createElement("option");
    fallback.value = "";
    fallback.textContent = "default";
    adminBackgroundSelect.appendChild(fallback);

    list.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id || "";
      option.textContent = `${item.name}${item.kind === "video" ? " · video" : ""}`;
      adminBackgroundSelect.appendChild(option);
    });

    adminBackgroundSelect.value = list.some((item) => (item.id || "") === wanted)
      ? wanted
      : "";
  }

  async function loadBackgrounds() {
    if (!adminBackgroundSelect || backgroundsLoading) return;

    backgroundsLoading = true;

    try {
      const res = await fetch(`${API_BASE}/api/backgrounds`, { cache: "no-store" });
      if (!res.ok) throw new Error(`backgrounds ${res.status}`);

      const data = await res.json();
      backgrounds = Array.isArray(data.backgrounds) ? data.backgrounds : [];
      renderBackgroundOptions();
    } catch (err) {
      renderBackgroundOptions();
    } finally {
      backgroundsLoading = false;
    }
  }

  function fillAdminFields() {
    if (adminHandleInput) adminHandleInput.value = handleEl ? handleEl.textContent : "";
    if (adminBioInput) adminBioInput.value = bioEl ? bioEl.textContent : "";
    if (adminLocationInput) adminLocationInput.value = locationEl ? locationEl.textContent : "";
    if (adminLastfmInput) adminLastfmInput.value = state.lastfm || "";
    if (adminViewsInput) adminViewsInput.value = String(state.views);

    if (adminSongSelect) {
      const wanted = state.songKey || "";
      const hasOption = Array.from(adminSongSelect.options).some(
        (option) => option.value === wanted
      );

      if (wanted && !hasOption) {
        const option = document.createElement("option");
        option.value = wanted;
        option.textContent = state.songName || "current song";
        adminSongSelect.appendChild(option);
      }

      adminSongSelect.value = wanted;
    }

    if (adminBackgroundSelect) {
      const wanted = state.backgroundKey || "";
      const hasOption = Array.from(adminBackgroundSelect.options).some(
        (option) => option.value === wanted
      );

      if (wanted && !hasOption) {
        const option = document.createElement("option");
        option.value = wanted;
        option.textContent = state.backgroundName || "current background";
        adminBackgroundSelect.appendChild(option);
      }

      adminBackgroundSelect.value = wanted;
    }
  }

  function revealProfileFields() {
    [
      adminHandleField,
      adminBioField,
      adminLocationField,
      adminLastfmField,
      adminSongField,
      adminSongUploadField,
      adminBackgroundField,
      adminBackgroundUploadField,
      adminViewsField,
      adminResetBtn,
    ].forEach((field) => {
      if (field) field.hidden = false;
    });
  }

  function openAdmin() {
    if (!adminEl || !adminKeyInput) return;
    adminEl.hidden = false;

    if (adminUnlocked) {
      fillAdminFields();
      Promise.all([loadSongs(), loadBackgrounds()]).then(fillAdminFields);
      adminHandleInput.focus();
      adminHandleInput.select();
      setHint("enter to save · esc to close", false);
    } else {
      adminKeyInput.value = "";
      adminKeyInput.focus();
      setHint("alt + y to close", false);
    }
  }

  function closeAdmin() {
    if (!adminEl) return;
    adminEl.hidden = true;
    if (adminKeyInput) adminKeyInput.value = "";
  }

  async function verifyKey(key) {
    const res = await fetch(`${API_BASE}/api/verify`, {
      method: "POST",
      headers: { "x-admin-key": key },
    });

    if (res.status === 401) return false;
    if (!res.ok) throw new Error(`verify ${res.status}`);
    return true;
  }

  async function saveProfile(payload) {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-key": adminSecret },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = new Error(`save ${res.status}`);
      error.status = res.status;
      throw error;
    }

    return res.json();
  }

  async function resetProfile() {
    const res = await fetch(`${API_BASE}/api/reset`, {
      method: "POST",
      headers: { "x-admin-key": adminSecret },
    });

    if (!res.ok) throw new Error(`reset ${res.status}`);

    return res.json();
  }

  function adoptServerProfile(data) {
    applyProfile(data);
    viewsLocked = true;
    views.textContent = formatViews(state.views);
    writeCache();
    fillAdminFields();
  }

  let resetArmed = false;
  let resetTimer = 0;

  function disarmReset() {
    resetArmed = false;
    window.clearTimeout(resetTimer);
    if (adminResetBtn) adminResetBtn.textContent = "reset";
  }

  if (adminResetBtn) {
    adminResetBtn.addEventListener("click", async () => {
      if (!resetArmed) {
        resetArmed = true;
        adminResetBtn.textContent = "confirm reset";
        setHint("click again to restore the defaults", true);
        resetTimer = window.setTimeout(disarmReset, 4000);
        return;
      }

      disarmReset();
      setHint("resetting…", false);

      try {
        const data = await resetProfile();
        adoptServerProfile(data);
        if (window.ZenBackground) window.ZenBackground.refresh();
        setHint("reset · esc to close", false);
      } catch (err) {
        setHint("couldn't reset — try again", true);
      }
    });
  }

  if (adminSongFile) {
    adminSongFile.addEventListener("change", async () => {
      const file = adminSongFile.files && adminSongFile.files[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        setHint("song is too large — 20mb max", true);
        adminSongFile.value = "";
        return;
      }

      setHint("uploading song…", false);

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_BASE}/api/songs`, {
          method: "POST",
          headers: { "x-admin-key": adminSecret },
          body: form,
        });

        let data = null;
        try {
          data = await res.json();
        } catch (err) {
          data = null;
        }

        if (!res.ok || !data || !data.song) {
          const message =
            data && data.error === "file too large"
              ? "song is too large — 20mb max"
              : "couldn't upload that song";
          setHint(message, true);
          return;
        }

        if (Array.isArray(data.songs)) {
          songs = data.songs;
        } else {
          songs = songs.filter((item) => (item.id || "") !== data.song.id);
          songs.push(data.song);
        }

        renderSongOptions();
        if (adminSongSelect) adminSongSelect.value = data.song.id;
        setHint("uploaded · enter to switch", false);
      } catch (err) {
        setHint("couldn't upload that song", true);
      } finally {
        adminSongFile.value = "";
      }
    });
  }

  if (adminBackgroundFile) {
    adminBackgroundFile.addEventListener("change", async () => {
      const file = adminBackgroundFile.files && adminBackgroundFile.files[0];
      if (!file) return;

      if (file.size > 30 * 1024 * 1024) {
        setHint("background is too large — 30mb max", true);
        adminBackgroundFile.value = "";
        return;
      }

      setHint("uploading background…", false);

      try {
        const form = new FormData();
        form.append("file", file);

        const res = await fetch(`${API_BASE}/api/backgrounds`, {
          method: "POST",
          headers: { "x-admin-key": adminSecret },
          body: form,
        });

        let data = null;
        try {
          data = await res.json();
        } catch (err) {
          data = null;
        }

        if (!res.ok || !data || !data.background) {
          const message =
            data && data.error === "file too large"
              ? "background is too large — 30mb max"
              : "couldn't upload that background";
          setHint(message, true);
          return;
        }

        if (Array.isArray(data.backgrounds)) {
          backgrounds = data.backgrounds;
        } else {
          backgrounds = backgrounds.filter(
            (item) => (item.id || "") !== data.background.id
          );
          backgrounds.push(data.background);
        }

        renderBackgroundOptions();
        if (adminBackgroundSelect) adminBackgroundSelect.value = data.background.id;
        setHint("uploaded · enter to apply", false);
      } catch (err) {
        setHint("couldn't upload that background", true);
      } finally {
        adminBackgroundFile.value = "";
      }
    });
  }

  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!adminUnlocked) {
        const key = adminKeyInput.value.trim();

        if (!key) {
          setHint("enter the key", true);
          return;
        }

        setHint("checking…", false);

        try {
          const ok = await verifyKey(key);

          if (!ok) {
            adminKeyInput.value = "";
            adminKeyInput.focus();
            setHint("wrong key", true);
            return;
          }

          adminSecret = key;
          adminUnlocked = true;
          adminKeyField.hidden = true;
          revealProfileFields();
          fillAdminFields();
          Promise.all([loadSongs(), loadBackgrounds()]).then(fillAdminFields);
          adminHandleInput.focus();
          adminHandleInput.select();
          setHint("enter to save · esc to close", false);
        } catch (err) {
          setHint("couldn't reach the server", true);
        }
        return;
      }

      const nextViews = Math.max(0, Math.floor(Number(adminViewsInput.value)));
      if (!Number.isFinite(nextViews)) return;

      const payload = {
        handle: adminHandleInput.value.trim() || state.handle,
        bio: adminBioInput.value.trim(),
        location: adminLocationInput.value.trim() || state.location,
        lastfm: adminLastfmInput ? adminLastfmInput.value.trim().toLowerCase() : "",
        song: adminSongSelect ? adminSongSelect.value : state.songKey || "",
        background: adminBackgroundSelect
          ? adminBackgroundSelect.value
          : state.backgroundKey || "",
        views: nextViews,
      };

      setHint("saving…", false);

      try {
        const data = await saveProfile(payload);
        adoptServerProfile(data);
        if (window.ZenBackground) window.ZenBackground.refresh();
        setHint("saved · esc to close", false);
      } catch (err) {
        if (err.status === 401) setHint("wrong key", true);
        else setHint("couldn't save — try again", true);
      }
    });
  }

  if (adminEl) {
    adminEl.addEventListener("click", (e) => {
      if (e.target === adminEl) closeAdmin();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "y" || e.key === "Y" || e.code === "KeyY")) {
      e.preventDefault();
      if (adminEl && !adminEl.hidden) closeAdmin();
      else openAdmin();
      return;
    }

    if (e.key === "Escape" && adminEl && !adminEl.hidden) closeAdmin();
  });

  // no Alt key on a phone: hold the view count for a moment instead
  const viewsStat = document.querySelector(".views");
  let pressTimer = 0;
  let pressOrigin = null;

  function cancelLongPress() {
    window.clearTimeout(pressTimer);
    pressTimer = 0;
    pressOrigin = null;
  }

  if (viewsStat) {
    viewsStat.addEventListener("pointerdown", (e) => {
      pressOrigin = { x: e.clientX, y: e.clientY };
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        pressOrigin = null;
        pressTimer = 0;
        openAdmin();
      }, 650);
    });

    viewsStat.addEventListener("pointermove", (e) => {
      if (!pressOrigin) return;
      if (Math.hypot(e.clientX - pressOrigin.x, e.clientY - pressOrigin.y) > 10) {
        cancelLongPress();
      }
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => {
      viewsStat.addEventListener(ev, cancelLongPress);
    });

    viewsStat.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ---------- 3d tilt (padded box around the card) ---------- */

  const zone = tiltBox || card;
  const canTilt =
    card &&
    zone &&
    !reducedMotion &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canTilt) {
    const MAX = 14;
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    let curX = 0;
    let curY = 0;
    let tgtX = 0;
    let tgtY = 0;
    let active = false;
    let raf = 0;

    function frame() {
      curX += (tgtX - curX) * 0.12;
      curY += (tgtY - curY) * 0.12;
      const settled = Math.abs(tgtX - curX) < 0.02 && Math.abs(tgtY - curY) < 0.02;

      card.style.setProperty("--rx", curX.toFixed(2) + "deg");
      card.style.setProperty("--ry", curY.toFixed(2) + "deg");

      if (!settled) {
        raf = requestAnimationFrame(frame);
        return;
      }

      raf = 0;
      if (!active) card.classList.remove("is-tilting");
    }

    function run() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    zone.addEventListener(
      "pointermove",
      (e) => {
        const rect = zone.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const px = clamp((e.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
        const py = clamp((e.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;

        tgtY = px * MAX;
        tgtX = -py * MAX * 0.75;

        if (!active) {
          active = true;
          card.classList.add("is-tilting");
        }

        run();
      },
      { passive: true }
    );

    const reset = () => {
      tgtX = 0;
      tgtY = 0;
      active = false;
      run();
    };

    zone.addEventListener("pointerleave", reset);
    zone.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
  }
})();

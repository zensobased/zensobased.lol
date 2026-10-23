(() => {
  const loader = document.getElementById("loader");
  const audioBtn = document.getElementById("audioBtn");
  const song = document.getElementById("song");
  const views = document.getElementById("views");
  const nameEl = document.querySelector(".name");
  const card = document.querySelector(".card");
  const tiltBox = document.getElementById("tiltBox");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let entered = false;

  const formatViews = (n) => new Intl.NumberFormat("en-US").format(n);

  function countUp(el, target, duration = 1400) {
    const start = performance.now();
    const from = 0;
    function frame(now) {
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

    const target = Number(views.textContent.replace(/[^0-9]/g, "")) || 0;
    views.textContent = "0";
    countUp(views, target);

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
  const discordPill = document.getElementById("discord");
  const discordLabel = document.getElementById("discordLabel");
  const avatarImg = document.getElementById("avatar");
  const favicon = document.getElementById("favicon");

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

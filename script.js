(() => {
  const loader = document.getElementById("loader");
  const audioBtn = document.getElementById("audioBtn");
  const song = document.getElementById("song");
  const views = document.getElementById("views");
  const nameEl = document.querySelector(".name");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let revealed = false;

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
      window.setTimeout(typeNext, i === 1 ? 240 : 135);
    }

    window.setTimeout(typeNext, 280);
  }

  /* ---------- entrance ---------- */

  function reveal() {
    if (revealed) return;
    revealed = true;

    document.body.classList.add("is-ready");
    loader.classList.add("is-done");

    const target = Number(views.textContent.replace(/[^0-9]/g, "")) || 0;
    views.textContent = "0";
    countUp(views, target);

    startTyping();

    window.setTimeout(() => loader.remove(), 700);
  }

  const startedAt = performance.now();
  window.addEventListener("load", () => {
    const wait = Math.max(0, 800 - (performance.now() - startedAt));
    window.setTimeout(reveal, wait);
  });

  // safety net in case load never fires cleanly
  window.setTimeout(reveal, 3500);

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

  /* ---------- 3d tilt (only while the pointer is over the card) ---------- */

  const card = document.querySelector(".card");
  const canTilt =
    card &&
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

    card.addEventListener(
      "pointermove",
      (e) => {
        const rect = card.getBoundingClientRect();
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

    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
    window.addEventListener("blur", reset);
  }
})();

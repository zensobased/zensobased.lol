(() => {
  const loader = document.getElementById("loader");
  const audioBtn = document.getElementById("audioBtn");
  const song = document.getElementById("song");
  const views = document.getElementById("views");

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

  function reveal() {
    if (revealed) return;
    revealed = true;

    document.body.classList.add("is-ready");
    loader.classList.add("is-done");

    const target = Number(views.textContent.replace(/[^0-9]/g, "")) || 0;
    views.textContent = "0";
    countUp(views, target);

    window.setTimeout(() => loader.remove(), 700);
  }

  const startedAt = performance.now();
  window.addEventListener("load", () => {
    const wait = Math.max(0, 800 - (performance.now() - startedAt));
    window.setTimeout(reveal, wait);
  });

  // safety net in case load never fires cleanly
  window.setTimeout(reveal, 3500);

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

  /* ---------- 3d tilt ---------- */

  const card = document.querySelector(".card");
  const canTilt =
    card &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    window.addEventListener(
      "pointermove",
      (e) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = clamp((e.clientX - cx) / (window.innerWidth * 0.42), -1, 1);
        const ny = clamp((e.clientY - cy) / (window.innerHeight * 0.42), -1, 1);

        tgtY = nx * MAX;
        tgtX = -ny * MAX * 0.75;

        card.style.setProperty("--mx", clamp(((e.clientX - rect.left) / rect.width) * 100, -60, 160).toFixed(1) + "%");
        card.style.setProperty("--my", clamp(((e.clientY - rect.top) / rect.height) * 100, -60, 160).toFixed(1) + "%");

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

    document.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
  }
})();

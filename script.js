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
})();

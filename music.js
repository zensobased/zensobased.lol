(() => {
  const API_BASE = "https://site-da7f266cd38645a88d82577d4531a2db.freebuff.page";
  const POLL_MS = 30000;
  const VIEWS = new Set(["recent", "7day", "1month", "overall"]);

  const nowEl = document.getElementById("now");
  const nowArt = document.getElementById("nowArt");
  const nowStatus = document.getElementById("nowStatus");
  const nowTitle = document.getElementById("nowTitle");
  const nowArtist = document.getElementById("nowArtist");
  const nowAlbum = document.getElementById("nowAlbum");
  const nowLink = document.getElementById("nowLink");

  const tracksEl = document.getElementById("tracks");
  const noteEl = document.getElementById("note");
  const periodsEl = document.getElementById("periods");
  const listTitle = document.getElementById("listTitle");
  const lastfmLink = document.getElementById("lastfmLink");
  const footLabel = document.getElementById("footLabel");

  const state = {
    view: "recent",
    user: "",
    listSignature: "",
    loading: true,
    token: 0,
  };

  const formatNumber = (n) => new Intl.NumberFormat("en-US").format(n);

  /* ---------- entrance ---------- */

  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
  });

  /* ---------- helpers ---------- */

  function timeAgo(ms) {
    const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));

    if (seconds < 45) return "just now";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.round(months / 12)}y ago`;
  }

  function setArt(img, url) {
    if (!img) return;

    // same cover on the next poll: leave it alone instead of flashing
    if (url && img.getAttribute("src") === url) return;

    img.classList.remove("is-loaded");

    if (!url) {
      img.removeAttribute("src");
      return;
    }

    img.onload = () => img.classList.add("is-loaded");
    img.src = url;
  }

  function setNote(text) {
    if (!noteEl) return;
    noteEl.textContent = text || "";
    noteEl.hidden = !text;
  }

  function listUrl(view) {
    return view === "recent"
      ? `${API_BASE}/api/lastfm?view=recent`
      : `${API_BASE}/api/lastfm?period=${encodeURIComponent(view)}`;
  }

  /* ---------- now playing ---------- */

  function renderNow(track, user) {
    if (!nowEl) return;

    nowEl.setAttribute("aria-busy", "false");

    if (!track) {
      nowEl.dataset.state = "empty";
      if (nowStatus) nowStatus.textContent = "nothing playing";
      if (nowTitle) nowTitle.textContent = "quiet right now";
      if (nowArtist) nowArtist.textContent = "";
      if (nowAlbum) nowAlbum.textContent = "";
      if (nowLink) nowLink.hidden = true;
      setArt(nowArt, "");
      return;
    }

    nowEl.dataset.state = track.playing ? "playing" : "idle";

    if (nowStatus) {
      nowStatus.textContent = track.playing
        ? "now playing"
        : track.playedAt
          ? `last played ${timeAgo(track.playedAt)}`
          : "last played";
    }

    if (nowTitle) nowTitle.textContent = track.title || "unknown track";
    if (nowArtist) nowArtist.textContent = track.artist || "";
    if (nowAlbum) nowAlbum.textContent = track.album || "";

    if (nowLink) {
      const href = track.url || (user ? `https://www.last.fm/user/${encodeURIComponent(user)}` : "");
      if (href) {
        nowLink.href = href;
        nowLink.hidden = false;
      } else {
        nowLink.hidden = true;
      }
    }

    setArt(nowArt, track.art || "");
  }

  /* ---------- rows ---------- */

  function buildArt(url) {
    const art = document.createElement("span");
    art.className = "track-art";

    if (url) {
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 44;
      img.height = 44;
      img.onload = () => img.classList.add("is-loaded");
      img.src = url;
      art.appendChild(img);
    }

    return art;
  }

  function buildInfo(track) {
    const info = document.createElement("span");
    info.className = "track-info";

    const name = document.createElement("span");
    name.className = "track-name";
    name.textContent = track.title || "unknown track";

    const artist = document.createElement("span");
    artist.className = "track-artist";
    artist.textContent = track.artist || "";

    info.append(name, artist);
    return info;
  }

  function trackHref(track) {
    return track.url || `https://www.last.fm/user/${encodeURIComponent(state.user)}`;
  }

  function buildRowShell(track, extraClass, index) {
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.className = `track ${extraClass}`;
    link.href = trackHref(track);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.setProperty("--i", String(Math.min(index, 9)));
    link.title = `${track.title} — ${track.artist}`;

    item.appendChild(link);
    return { item, link };
  }

  function buildTopRow(track, index) {
    const { item, link } = buildRowShell(track, "track-top", index);

    const rank = document.createElement("span");
    rank.className = "track-rank";
    rank.textContent = String(track.rank || index + 1).padStart(2, "0");

    const plays = document.createElement("span");
    plays.className = "track-plays";
    plays.textContent = formatNumber(track.plays || 0);
    const playsLabel = document.createElement("span");
    playsLabel.textContent = "plays";
    plays.appendChild(playsLabel);

    link.append(rank, buildArt(track.art), buildInfo(track), plays);
    return item;
  }

  function buildRecentRow(track, index) {
    const { item, link } = buildRowShell(track, "track-recent", index);

    const time = document.createElement("span");
    time.className = "track-time";
    time.dataset.playing = track.playing ? "1" : "0";
    if (track.playedAt) time.dataset.played = String(track.playedAt);
    time.textContent = track.playing ? "now" : track.playedAt ? timeAgo(track.playedAt) : "";

    link.append(buildArt(track.art), buildInfo(track), time);
    return item;
  }

  function refreshTimes() {
    if (!tracksEl) return;

    tracksEl.querySelectorAll(".track-time").forEach((el) => {
      if (el.dataset.playing === "1") {
        el.textContent = "now";
        return;
      }

      const played = Number(el.dataset.played);
      if (Number.isFinite(played) && played > 0) el.textContent = timeAgo(played);
    });
  }

  /* ---------- lists ---------- */

  function rowSignature(track, view) {
    return view === "recent"
      ? [track.title, track.artist, track.playing, track.playedAt]
      : [track.rank, track.title, track.artist, track.plays];
  }

  function renderList(list, view) {
    if (!tracksEl) return;

    const signature = JSON.stringify([view, list.map((t) => rowSignature(t, view))]);

    if (signature === state.listSignature) {
      refreshTimes();
      return;
    }

    state.listSignature = signature;
    tracksEl.textContent = "";
    tracksEl.classList.toggle("tracks--recent", view === "recent");

    list.forEach((track, index) => {
      tracksEl.appendChild(view === "recent" ? buildRecentRow(track, index) : buildTopRow(track, index));
    });
  }

  function showSkeletons() {
    if (!tracksEl) return;
    tracksEl.textContent = "";
    tracksEl.classList.remove("tracks--recent");

    for (let i = 0; i < 5; i += 1) {
      const item = document.createElement("li");
      item.className = "track-skeleton";
      item.innerHTML =
        '<span class="sk sk-line short"></span>' +
        '<span class="sk sk-art"></span>' +
        '<span class="sk sk-line"></span>';
      tracksEl.appendChild(item);
    }
  }

  /* ---------- data ---------- */

  function applyUser(user) {
    if (!user || user === state.user) return;

    state.user = user;

    if (lastfmLink) {
      lastfmLink.href = `https://www.last.fm/user/${encodeURIComponent(user)}`;
      lastfmLink.textContent = `@${user}`;
    }

    if (footLabel) footLabel.textContent = "scrobbling from";
  }

  function applyPayload(data) {
    const view = state.view;
    applyUser(data.user);

    if (!data.configured) {
      if (nowEl) nowEl.dataset.state = "unconfigured";
      if (nowStatus) nowStatus.textContent = "last.fm";
      if (nowTitle) nowTitle.textContent = "not connected";
      if (nowArtist) nowArtist.textContent = "no scrobbles to show yet";
      if (nowAlbum) nowAlbum.textContent = "";
      if (nowLink) nowLink.hidden = true;
      setArt(nowArt, "");
      renderList([], view);
      setNote("music isn't set up yet — check back soon.");
      return;
    }

    if (data.error) {
      if (nowEl) nowEl.dataset.state = "error";
      if (nowStatus) nowStatus.textContent = "last.fm";
      if (nowTitle) {
        nowTitle.textContent =
          data.error === "user_not_found" ? "user not found" : "couldn't load music";
      }
      if (nowArtist) {
        nowArtist.textContent =
          data.error === "user_not_found"
            ? `no last.fm account named @${data.user || "?"}`
            : "try again in a minute";
      }
      if (nowAlbum) nowAlbum.textContent = "";
      if (nowLink) nowLink.hidden = true;
      setArt(nowArt, "");
      renderList(data.recent || data.top || [], view);
      setNote(
        data.error === "user_not_found"
          ? "check the last.fm username."
          : "last.fm didn't answer — the page refreshes on its own."
      );
      return;
    }

    renderNow(data.now, data.user);

    if (view === "recent") {
      renderList(data.recent || [], view);
      setNote((data.recent && data.recent.length) ? "" : "nothing played recently.");
      return;
    }

    renderList(data.top || [], view);
    setNote(
      data.topError
        ? "top tracks couldn't load right now."
        : data.now || (data.top && data.top.length)
          ? ""
          : "nothing scrobbled in this range yet."
    );
  }

  async function load(view, quiet) {
    const requested = VIEWS.has(view) ? view : state.view;
    const token = (state.token += 1);

    if (!quiet && state.loading) {
      showSkeletons();
      if (nowEl) nowEl.setAttribute("aria-busy", "true");
    }

    try {
      const res = await fetch(listUrl(requested), { cache: "no-store" });
      if (!res.ok) throw new Error(`music ${res.status}`);

      const data = await res.json();
      if (token !== state.token) return;

      state.loading = false;
      applyPayload(data);
    } catch (err) {
      if (token !== state.token) return;

      if (state.loading) {
        state.loading = false;
        if (nowEl) {
          nowEl.dataset.state = "error";
          nowEl.setAttribute("aria-busy", "false");
        }
        if (nowStatus) nowStatus.textContent = "last.fm";
        if (nowTitle) nowTitle.textContent = "couldn't load music";
        if (nowArtist) nowArtist.textContent = "the api didn't answer";
        setArt(nowArt, "");
        renderList([], requested);
      }

      setNote("couldn't reach last.fm — trying again shortly.");
    }
  }

  /* ---------- tabs ---------- */

  function syncTabs(view) {
    if (!periodsEl) return;

    periodsEl.querySelectorAll("button[data-view]").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (listTitle) {
      listTitle.textContent = view === "recent" ? "recently played" : "top tracks";
    }
  }

  if (periodsEl) {
    periodsEl.addEventListener("click", (e) => {
      const button = e.target.closest("button[data-view]");
      if (!button) return;

      const view = button.dataset.view;
      if (!VIEWS.has(view) || view === state.view) return;

      state.view = view;
      syncTabs(view);
      setNote("");
      load(view, true);
    });
  }

  /* ---------- refresh loop ---------- */

  load(state.view, false);

  window.setInterval(() => {
    if (document.visibilityState === "visible") load(state.view, true);
  }, POLL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") load(state.view, true);
  });
})();

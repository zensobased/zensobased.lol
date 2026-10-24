(() => {
  const API_BASE = "https://site-da7f266cd38645a88d82577d4531a2db.freebuff.page";
  const SEARCH_DELAY = 320;

  const grid = document.getElementById("favGrid");
  const empty = document.getElementById("favEmpty");
  const statusEl = document.getElementById("favStatus");
  const countEl = document.getElementById("favCount");
  const titleEl = document.getElementById("favTitle");
  const gear = document.getElementById("favGear");

  const devPanel = document.getElementById("favDevPanel");
  const devForm = document.getElementById("favDevForm");
  const devKey = document.getElementById("favKey");
  const devKeyField = document.getElementById("favKeyField");
  const devStatus = document.getElementById("favDevStatus");
  const devSubmit = document.getElementById("favDevSubmit");
  const devLock = document.getElementById("favLock");
  const devHint = document.getElementById("favDevHint");

  const modal = document.getElementById("favModal");
  const closeBtn = document.getElementById("favClose");
  const searchInput = document.getElementById("favSearch");
  const resultsEl = document.getElementById("favResults");
  const hintEl = document.getElementById("favHint");
  const kindButtons = [...document.querySelectorAll(".fav-kinds button")];

  const state = {
    items: [],
    key: "",
    editing: false,
    loading: true,
    kind: "album",
    searchSeq: 0,
    searchTimer: 0,
    deleteArmed: 0,
    verifying: false,
  };

  /* ---------- entrance ---------- */

  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
  });

  /* ---------- messages ---------- */

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function setHint(text, isError) {
    if (!hintEl) return;
    hintEl.textContent = text || "";
    hintEl.classList.toggle("is-error", Boolean(isError));
  }

  function defaultHint() {
    return state.kind === "track" ? "type a track or artist" : "type an album or artist";
  }

  /* ---------- shelf ---------- */

  function buildCard(item, index) {
    const row = document.createElement("li");
    row.className = "fav-item";
    row.style.setProperty("--i", String(Math.min(index, 8)));

    const card = document.createElement(item.link ? "a" : "div");
    card.className = "fav-card";
    if (item.link) {
      card.href = item.link;
      card.target = "_blank";
      card.rel = "noopener noreferrer";
    }
    card.title = `${item.title} — ${item.artist}`;

    const art = document.createElement("span");
    art.className = "fav-art";

    if (item.art) {
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 300;
      img.height = 300;
      img.onload = () => img.classList.add("is-loaded");
      img.src = item.art;
      art.appendChild(img);
    }

    if (item.kind === "track") {
      const tag = document.createElement("span");
      tag.className = "fav-kind";
      tag.textContent = "track";
      art.appendChild(tag);
    }

    const info = document.createElement("span");
    info.className = "fav-info";

    const name = document.createElement("span");
    name.className = "fav-name";
    name.textContent = item.title;

    const artist = document.createElement("span");
    artist.className = "fav-artist";
    artist.textContent = item.artist;

    info.append(name, artist);
    card.append(art, info);
    row.appendChild(card);

    if (state.editing) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "fav-remove";
      remove.dataset.id = String(item.id);
      remove.setAttribute("aria-label", `Remove ${item.title}`);
      remove.title = "remove";
      remove.textContent = "×";
      remove.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        armRemove(remove, item);
      });
      row.appendChild(remove);
    }

    return row;
  }

  function render() {
    if (!grid) return;

    grid.textContent = "";
    grid.classList.toggle("is-editing", state.editing);
    if (gear) gear.classList.toggle("is-on", state.editing);

    if (state.editing) {
      const wrap = document.createElement("li");
      wrap.className = "fav-add-wrap";

      const add = document.createElement("button");
      add.type = "button";
      add.className = "fav-add";
      add.innerHTML =
        '<span class="plus" aria-hidden="true">+</span><span class="label">add album or track</span>';
      add.addEventListener("click", openModal);

      wrap.appendChild(add);
      grid.appendChild(wrap);
    }

    state.items.forEach((item, index) => grid.appendChild(buildCard(item, index)));

    const count = state.items.length;
    if (countEl) {
      countEl.hidden = count === 0;
      countEl.textContent = `${count} saved`;
    }

    if (empty) {
      empty.hidden = count > 0 || state.editing || state.loading;
    }
  }

  async function loadFavourites() {
    try {
      const res = await fetch(`${API_BASE}/api/favourites`, { cache: "no-store" });
      if (!res.ok) throw new Error(`favourites ${res.status}`);

      const data = await res.json();
      state.items = Array.isArray(data.items) ? data.items : [];
      state.loading = false;
      setStatus("");
      render();
    } catch (err) {
      state.loading = false;
      render();
      setStatus("couldn't load favourites right now.", true);
    }
  }

  /* ---------- remove ---------- */

  function disarmRemoves() {
    grid.querySelectorAll(".fav-remove.is-armed").forEach((button) => {
      button.classList.remove("is-armed");
      button.textContent = "×";
    });
    state.deleteArmed = 0;
  }

  function armRemove(button, item) {
    if (state.deleteArmed === item.id) {
      disarmRemoves();
      deleteItem(item);
      return;
    }

    disarmRemoves();
    state.deleteArmed = item.id;
    button.classList.add("is-armed");
    button.textContent = "?";
    button.title = "click again to remove";
  }

  // clicking anywhere else cancels the pending remove, no timer needed
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!state.deleteArmed) return;
      if (e.target.closest && e.target.closest(".fav-remove")) return;
      disarmRemoves();
    },
    true
  );

  async function deleteItem(item) {
    try {
      const res = await fetch(`${API_BASE}/api/favourites/${item.id}`, {
        method: "DELETE",
        headers: { "x-admin-key": state.key },
      });

      if (!res.ok) throw new Error(`delete ${res.status}`);

      state.items = state.items.filter((entry) => entry.id !== item.id);
      render();
      setStatus("removed");
      window.setTimeout(() => setStatus(""), 1800);
    } catch (err) {
      setStatus("couldn't remove that one — try again.", true);
    }
  }

  /* ---------- dev panel ---------- */

  function paintDevPanel() {
    if (state.editing) {
      if (devKeyField) devKeyField.hidden = true;
      if (devSubmit) devSubmit.hidden = true;
      if (devStatus) devStatus.hidden = false;
      if (devLock) devLock.hidden = false;
      if (devHint) devHint.textContent = "alt + y to close";
      if (devLock) devLock.focus();
    } else {
      if (devKeyField) devKeyField.hidden = false;
      if (devSubmit) devSubmit.hidden = false;
      if (devStatus) devStatus.hidden = true;
      if (devLock) devLock.hidden = true;
      if (devHint) devHint.textContent = "alt + y to close";
      if (devKey) {
        devKey.value = "";
        devKey.focus();
      }
    }
  }

  function openDev() {
    if (!devPanel) return;
    devPanel.hidden = false;
    paintDevPanel();
  }

  function closeDev() {
    if (!devPanel) return;
    devPanel.hidden = true;
    if (devKey) devKey.value = "";
  }

  if (gear) gear.addEventListener("click", openDev);

  if (devForm) {
    devForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (state.editing || state.verifying) return;

      const key = devKey ? devKey.value.trim() : "";
      if (!key) {
        if (devHint) devHint.textContent = "enter the key";
        return;
      }

      state.verifying = true;
      if (devHint) devHint.textContent = "checking…";
      if (devSubmit) devSubmit.disabled = true;

      try {
        const res = await fetch(`${API_BASE}/api/verify`, {
          method: "POST",
          headers: { "x-admin-key": key },
        });

        if (res.status === 401) {
          if (devKey) {
            devKey.value = "";
            devKey.focus();
          }
          if (devHint) devHint.textContent = "wrong key";
          return;
        }

        if (!res.ok) throw new Error(`verify ${res.status}`);

        state.key = key;
        state.editing = true;
        closeDev();
        render();
        setStatus("dev mode on — add with the + tile, remove with ×");
        const add = grid.querySelector(".fav-add");
        if (add) add.focus();
      } catch (err) {
        if (devHint) devHint.textContent = "couldn't reach the server";
      } finally {
        state.verifying = false;
        if (devSubmit) devSubmit.disabled = false;
      }
    });
  }

  if (devLock) {
    devLock.addEventListener("click", () => {
      state.editing = false;
      state.key = "";
      disarmRemoves();
      closeDev();
      render();
      setStatus("");
    });
  }

  if (devPanel) {
    devPanel.addEventListener("click", (e) => {
      if (e.target === devPanel) closeDev();
    });
  }

  // long-press the heading on touch screens, same idea as the profile admin
  if (titleEl) {
    let pressTimer = 0;
    let origin = null;

    titleEl.addEventListener("pointerdown", (e) => {
      origin = { x: e.clientX, y: e.clientY };
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        origin = null;
        openDev();
      }, 650);
    });

    titleEl.addEventListener("pointermove", (e) => {
      if (!origin) return;
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 10) {
        origin = null;
        window.clearTimeout(pressTimer);
      }
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      titleEl.addEventListener(type, () => {
        window.clearTimeout(pressTimer);
        origin = null;
      });
    });

    titleEl.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ---------- add modal ---------- */

  function syncKinds() {
    kindButtons.forEach((button) => {
      const active = button.dataset.kind === state.kind;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (searchInput) {
      searchInput.placeholder = state.kind === "track" ? "search tracks…" : "search albums…";
    }
  }

  function openModal() {
    if (!state.editing || !modal) return;

    modal.hidden = false;
    document.body.classList.add("is-locked");

    state.kind = "album";
    syncKinds();

    if (searchInput) searchInput.value = "";
    if (resultsEl) resultsEl.textContent = "";
    setHint(defaultHint());
    if (searchInput) searchInput.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;

    modal.hidden = true;
    document.body.classList.remove("is-locked");

    window.clearTimeout(state.searchTimer);
    state.searchSeq += 1;

    const add = grid ? grid.querySelector(".fav-add") : null;
    if (add) add.focus();
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  kindButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.kind === "track" ? "track" : "album";
      if (kind === state.kind) return;

      state.kind = kind;
      syncKinds();
      if (resultsEl) resultsEl.textContent = "";

      const query = searchInput ? searchInput.value.trim() : "";
      if (query.length >= 2) {
        window.clearTimeout(state.searchTimer);
        runSearch(query);
      } else {
        setHint(defaultHint());
      }
    });
  });

  function scheduleSearch(delay) {
    window.clearTimeout(state.searchTimer);

    const query = searchInput ? searchInput.value.trim() : "";

    if (query.length < 2) {
      state.searchSeq += 1;
      if (resultsEl) resultsEl.textContent = "";
      setHint(query ? "keep typing…" : defaultHint());
      return;
    }

    state.searchTimer = window.setTimeout(() => runSearch(query), delay || SEARCH_DELAY);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => scheduleSearch());
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        window.clearTimeout(state.searchTimer);
        const query = searchInput.value.trim();
        if (query.length >= 2) runSearch(query);
      }
    });
  }

  function buildResult(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fav-result";

    const art = document.createElement("span");
    art.className = "fav-result-art";
    if (item.art) {
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 44;
      img.height = 44;
      img.onload = () => img.classList.add("is-loaded");
      img.src = item.art;
      art.appendChild(img);
    }

    const info = document.createElement("span");
    info.className = "fav-result-info";

    const title = document.createElement("span");
    title.className = "fav-result-title";
    title.textContent = item.title;

    const meta = document.createElement("span");
    meta.className = "fav-result-meta";
    meta.textContent =
      item.kind === "track" && item.album
        ? `${item.artist} · ${item.album}`
        : item.artist;

    info.append(title, meta);

    const add = document.createElement("span");
    add.className = "fav-result-add";
    add.setAttribute("aria-hidden", "true");
    add.textContent = "+";

    button.append(art, info, add);
    button.setAttribute("aria-label", `Add ${item.title} by ${item.artist}`);

    button.addEventListener("click", () => addItem(item, button));

    if (alreadySaved(item)) markSaved(button);
    return button;
  }

  function alreadySaved(item) {
    const title = item.title.toLowerCase();
    const artist = item.artist.toLowerCase();

    return state.items.some(
      (entry) =>
        entry.kind === item.kind &&
        entry.title.toLowerCase() === title &&
        entry.artist.toLowerCase() === artist
    );
  }

  function markSaved(button) {
    button.classList.add("is-saved");
    button.disabled = true;
    const icon = button.querySelector(".fav-result-add");
    if (icon) icon.textContent = "✓";
  }

  function renderResults(results) {
    if (!resultsEl) return;

    resultsEl.textContent = "";

    if (!results.length) {
      setHint("no matches — try a different search");
      return;
    }

    results.forEach((item) => resultsEl.appendChild(buildResult(item)));
    setHint(`${results.length} results — click one to add it`);
  }

  async function runSearch(query) {
    const seq = (state.searchSeq += 1);
    setHint("searching…");

    try {
      const url = `${API_BASE}/api/favourites/search?q=${encodeURIComponent(query)}&kind=${state.kind}`;
      const res = await fetch(url, { headers: { "x-admin-key": state.key } });

      if (seq !== state.searchSeq) return;

      if (res.status === 401) {
        setHint("dev session expired — reopen dev settings", true);
        return;
      }

      if (!res.ok) throw new Error(`search ${res.status}`);

      const data = await res.json();
      if (seq !== state.searchSeq) return;

      renderResults(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      if (seq !== state.searchSeq) return;
      if (resultsEl) resultsEl.textContent = "";
      setHint("couldn't search right now — try again", true);
    }
  }

  async function addItem(item, button) {
    if (!state.editing || !state.key) return;

    button.disabled = true;
    button.classList.add("is-saving");

    try {
      const res = await fetch(`${API_BASE}/api/favourites`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-key": state.key,
        },
        body: JSON.stringify({
          kind: item.kind,
          title: item.title,
          artist: item.artist,
          art: item.art,
          link: item.link,
        }),
      });

      if (res.status === 409) {
        markSaved(button);
        setHint("already saved");
        return;
      }

      if (res.status === 401) {
        setHint("dev session expired — reopen dev settings", true);
        return;
      }

      if (!res.ok) throw new Error(`add ${res.status}`);

      markSaved(button);
      setHint("added — keep searching or close");
      await loadFavourites();
    } catch (err) {
      button.disabled = false;
      button.classList.remove("is-saving");
      setHint("couldn't add — try again", true);
    }
  }

  /* ---------- keys ---------- */

  window.addEventListener("keydown", (e) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "y" || e.key === "Y" || e.code === "KeyY")) {
      e.preventDefault();
      if (devPanel && !devPanel.hidden) closeDev();
      else openDev();
      return;
    }

    if (e.key === "Escape") {
      if (modal && !modal.hidden) closeModal();
      else if (devPanel && !devPanel.hidden) closeDev();
    }
  });

  /* ---------- boot ---------- */

  loadFavourites();
})();

/**
 * Cats & Rats popup / sidebar UI.
 */

const $ = (id) => document.getElementById(id);

const state = {
  images: [], // { url, width, height, selected, order }
  pageUrl: "",
  busy: false,
  cards: new Map(), // item -> { dimEl } for in-place updates while measuring
};

const prefs = {
  theme: "", // "" = follow system
  sort: "page",
  cols: 2,
  minSize: 64,
};

const BIG = Number.MAX_SAFE_INTEGER;
const area = (i) => i.width * i.height;

const SORTS = {
  page: (a, b) => a.order - b.order,
  largest: (a, b) => area(b) - area(a),
  smallest: (a, b) => (area(a) || BIG) - (area(b) || BIG),
  name: (a, b) => fileName(a.url).localeCompare(fileName(b.url)),
};

/* ── Preferences ────────────────────────── */

async function loadPrefs() {
  try {
    const got = await chrome.storage.local.get("prefs");
    if (got && got.prefs) Object.assign(prefs, got.prefs);
  } catch (_) {}
}

function savePrefs() {
  try {
    chrome.storage.local.set({ prefs: { ...prefs } });
  } catch (_) {}
}

function applyTheme() {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = prefs.theme || (dark ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
}

function applyView() {
  const grid = $("grid");
  grid.classList.remove("cols-1", "cols-2", "cols-3");
  grid.classList.add("cols-" + prefs.cols);
  document.querySelectorAll(".seg button").forEach((b) => {
    b.setAttribute("aria-pressed", String(Number(b.dataset.cols) === prefs.cols));
  });
}

function applyPrefsToUI() {
  applyTheme();
  applyView();
  $("sortSel").value = prefs.sort in SORTS ? prefs.sort : "page";
  $("minSize").value = prefs.minSize;
}

/* ── Rendering ──────────────────────────── */

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

function updateCount() {
  const n = state.images.filter((i) => i.selected).length;
  $("count").textContent = n
    ? `${n} selected`
    : state.images.length
      ? "Nothing selected"
      : "";
  $("btnDownload").textContent = n ? `Download ${n}` : "Download";
  $("btnDownload").disabled = n === 0 || state.busy;
}

function visibleList() {
  const min = prefs.minSize;
  return state.images
    .filter((i) => !i.width || !i.height || (i.width >= min && i.height >= min))
    .sort(SORTS[prefs.sort] || SORTS.page);
}

function fileName(u) {
  try {
    const base = new URL(u).pathname.split("/").filter(Boolean).pop() || u;
    return decodeURIComponent(base);
  } catch {
    return u;
  }
}

function shortUrl(u) {
  try {
    const x = new URL(u);
    return x.hostname + (x.pathname === "/" ? "" : x.pathname);
  } catch {
    return String(u).slice(0, 48);
  }
}

function dimText(item) {
  if (item.width && item.height) return `${item.width}×${item.height}`;
  return item.probed ? "—" : "…";
}

function render() {
  const grid = $("grid");
  grid.innerHTML = "";
  state.cards.clear();
  const list = visibleList();

  if (!list.length) {
    const d = document.createElement("div");
    d.className = "empty";
    const logo = document.createElement("img");
    logo.src = "icons/icon128.png";
    logo.alt = "";
    const head = document.createElement("b");
    const p = document.createElement("p");
    if (!state.images.length) {
      head.textContent = "No images yet";
      p.textContent = "Open a website tab, then press Rescan (↻) above.";
    } else {
      head.textContent = "All images filtered out";
      p.textContent = `Every image on this page is smaller than ${prefs.minSize}px. Lower Min px to see more.`;
    }
    d.append(logo, head, p);
    grid.appendChild(d);
    updateCount();
    return;
  }

  for (const item of list) {
    const card = document.createElement("article");
    card.className = "card" + (item.selected ? " selected" : "");
    card.tabIndex = 0;

    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.alt = "";
    img.referrerPolicy = "no-referrer";
    img.src = item.url;
    thumb.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = fileName(item.url);
    name.title = item.url;
    const dim = document.createElement("span");
    dim.className = "dim";
    dim.textContent = dimText(item);
    meta.append(name, dim);

    card.append(thumb, meta);
    state.cards.set(item, { dimEl: dim });

    const toggle = () => {
      item.selected = !item.selected;
      card.classList.toggle("selected", item.selected);
      updateCount();
    };
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        toggle();
      }
    });

    grid.appendChild(card);
  }
  updateCount();
}

/* ── Scanning ───────────────────────────── */

function probeSize(item) {
  return new Promise((resolve) => {
    const im = new Image();
    im.referrerPolicy = "no-referrer";
    const done = () => {
      item.probed = true;
      item.width = im.naturalWidth || 0;
      item.height = im.naturalHeight || 0;
      const entry = state.cards.get(item);
      if (entry) entry.dimEl.textContent = dimText(item);
      resolve(item);
    };
    im.onload = done;
    im.onerror = done;
    im.src = item.url;
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tabs && tabs[0]) return tabs[0];
  const all = await chrome.tabs.query({ active: true });
  return all && all[0];
}

async function scan() {
  if (state.busy) return;
  state.busy = true;
  $("btnReload").disabled = true;
  $("btnDownload").disabled = true;
  setStatus("Scanning page…");

  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      setStatus("No active tab found.", "error");
      state.images = [];
      render();
      return;
    }
    if (!tab.url || !/^https?:/i.test(tab.url)) {
      setStatus("This page can't be scanned. Open a normal website tab, then press Rescan.", "error");
      state.images = [];
      render();
      return;
    }

    state.pageUrl = tab.url;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: false },
      files: ["scrape.js"],
    });

    const payload = results && results[0] && results[0].result;
    if (!payload || !Array.isArray(payload.images)) {
      setStatus("Couldn't read this page — it may be blocked or empty.", "error");
      state.images = [];
      render();
      return;
    }

    state.images = payload.images.map((url, order) => ({
      url,
      order,
      width: 0,
      height: 0,
      selected: false,
    }));
    render();

    // Measure in small batches; cards update in place, no grid churn.
    const batch = 8;
    for (let i = 0; i < state.images.length; i += batch) {
      setStatus(`Measuring ${Math.min(i + batch, state.images.length)} of ${state.images.length}…`);
      await Promise.all(state.images.slice(i, i + batch).map(probeSize));
    }

    // Final render applies size filter and sort with real dimensions.
    render();
    const shown = visibleList().length;
    setStatus(`${shown} of ${state.images.length} images · ${shortUrl(tab.url)}`);
  } catch (err) {
    console.error(err);
    setStatus(String(err && err.message ? err.message : err), "error");
    state.images = [];
    render();
  } finally {
    state.busy = false;
    $("btnReload").disabled = false;
    updateCount();
  }
}

/* ── Downloading ────────────────────────── */

function guessName(url, index) {
  try {
    const u = new URL(url);
    let base = u.pathname.split("/").filter(Boolean).pop() || `image-${index + 1}`;
    base = decodeURIComponent(base).replace(/[<>:"/\\|?*]+/g, "_");
    if (!/\.[a-z0-9]{2,5}$/i.test(base)) base += ".jpg";
    return base.slice(0, 120);
  } catch {
    return `image-${index + 1}.jpg`;
  }
}

async function downloadSelected() {
  const list = state.images.filter((i) => i.selected);
  if (!list.length) return;
  state.busy = true;
  updateCount();
  setStatus(`Downloading ${list.length} image${list.length > 1 ? "s" : ""}…`);

  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    try {
      await chrome.downloads.download({
        url: list[i].url,
        filename: `CatsAndRats/${guessName(list[i].url, i)}`,
        conflictAction: "uniquify",
        saveAs: false,
      });
      ok++;
    } catch (e) {
      console.warn("download failed", list[i].url, e);
    }
  }
  setStatus(
    ok === list.length
      ? `Saving ${ok} image${ok > 1 ? "s" : ""} to Downloads/CatsAndRats.`
      : `Started ${ok} of ${list.length} downloads — some were blocked.`,
    ok ? "" : "error"
  );
  state.busy = false;
  updateCount();
}

/* ── Wiring ─────────────────────────────── */

$("btnReload").addEventListener("click", scan);

$("btnDownload").addEventListener("click", downloadSelected);

$("btnSelectAll").addEventListener("click", () => {
  const targets = visibleList();
  if (!targets.length) return;
  const allOn = targets.every((i) => i.selected);
  targets.forEach((i) => {
    i.selected = !allOn;
  });
  render();
});

$("btnTheme").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme;
  prefs.theme = current === "dark" ? "light" : "dark";
  savePrefs();
  applyTheme();
});

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (!prefs.theme) applyTheme();
});

$("sortSel").addEventListener("change", () => {
  prefs.sort = $("sortSel").value;
  savePrefs();
  render();
});

document.querySelectorAll(".seg button").forEach((b) => {
  b.addEventListener("click", () => {
    prefs.cols = Number(b.dataset.cols) || 2;
    savePrefs();
    applyView();
  });
});

$("minSize").addEventListener("change", () => {
  prefs.minSize = Math.max(0, parseInt($("minSize").value, 10) || 0);
  $("minSize").value = prefs.minSize;
  savePrefs();
  render();
});

/* ── Init ───────────────────────────────── */

(async () => {
  await loadPrefs();
  applyPrefsToUI();
  scan();
})();

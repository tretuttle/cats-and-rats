/**
 * Cats & Rats popup / sidebar UI — original cleanroom code.
 */

const $ = (id) => document.getElementById(id);
const state = {
  images: [], // { url, width, height, selected }
  pageUrl: "",
  busy: false,
};

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

function updateCount() {
  const n = state.images.filter((i) => i.selected).length;
  $("count").textContent = `${n} selected · ${state.images.length} shown`;
  $("btnDownload").disabled = n === 0 || state.busy;
}

function minSize() {
  return Math.max(0, parseInt($("minSize").value, 10) || 0);
}

function render() {
  const grid = $("grid");
  grid.innerHTML = "";
  const min = minSize();
  const list = state.images.filter(
    (i) => !i.width || !i.height || (i.width >= min && i.height >= min)
  );

  if (!list.length) {
    const d = document.createElement("div");
    d.className = "empty";
    d.innerHTML =
      "<b>No images to show.</b><br><br>" +
      "Focus a normal <code>https://</code> tab (not a blank or settings page), then hit <b>Reload</b>.";
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
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.src = item.url;
    thumb.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "meta";
    const left = document.createElement("span");
    left.textContent = shortUrl(item.url);
    left.title = item.url;
    const dim = document.createElement("span");
    dim.className = "dim";
    dim.textContent =
      item.width && item.height ? `${item.width}×${item.height}` : "…";
    meta.appendChild(left);
    meta.appendChild(dim);

    card.appendChild(thumb);
    card.appendChild(meta);

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

function shortUrl(u) {
  try {
    const x = new URL(u);
    const path = x.pathname.length > 24 ? x.pathname.slice(0, 22) + "…" : x.pathname;
    return x.hostname + path;
  } catch {
    return u.slice(0, 40);
  }
}

function probeSize(item) {
  return new Promise((resolve) => {
    const im = new Image();
    im.referrerPolicy = "no-referrer";
    const done = () => {
      item.width = im.naturalWidth || 0;
      item.height = im.naturalHeight || 0;
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
      setStatus("No active tab.", "error");
      state.images = [];
      render();
      return;
    }
    if (!tab.url || !/^https?:/i.test(tab.url)) {
      setStatus(
        "Not an http(s) page: " + (tab.url || "(none)") + " — open a website first.",
        "error"
      );
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
      setStatus("Could not read this page (blocked or empty).", "error");
      state.images = [];
      render();
      return;
    }

    state.images = payload.images.map((url) => ({
      url,
      width: 0,
      height: 0,
      selected: false,
    }));

    setStatus(
      `Found ${state.images.length} URLs on “${payload.title || tab.title || "page"}”. Measuring…`,
      "ok"
    );
    render();

    // Probe sizes in small batches so UI stays responsive
    const batch = 8;
    for (let i = 0; i < state.images.length; i += batch) {
      await Promise.all(state.images.slice(i, i + batch).map(probeSize));
      render();
    }

    const min = minSize();
    const shown = state.images.filter(
      (i) => i.width >= min && i.height >= min
    ).length;
    setStatus(
      `${shown} images ≥ ${min}px · ${state.images.length} URLs · ${shortUrl(tab.url)}`,
      "ok"
    );
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

async function downloadSelected() {
  const list = state.images.filter((i) => i.selected);
  if (!list.length) return;
  state.busy = true;
  updateCount();
  setStatus(`Downloading ${list.length} file(s)…`);

  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    try {
      const name = guessName(item.url, i);
      await chrome.downloads.download({
        url: item.url,
        filename: `CatsAndRats/${name}`,
        conflictAction: "uniquify",
        saveAs: false,
      });
      ok++;
    } catch (e) {
      console.warn("download fail", item.url, e);
    }
  }
  setStatus(`Started ${ok} of ${list.length} downloads.`, ok ? "ok" : "error");
  state.busy = false;
  updateCount();
}

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

$("btnReload").addEventListener("click", scan);
$("btnSelectAll").addEventListener("click", () => {
  const min = minSize();
  const targets = state.images.filter(
    (i) => !i.width || (i.width >= min && i.height >= min)
  );
  const allOn = targets.every((i) => i.selected);
  targets.forEach((i) => {
    i.selected = !allOn;
  });
  render();
});
$("btnDownload").addEventListener("click", downloadSelected);
$("minSize").addEventListener("change", render);

// Auto-scan on open
scan();

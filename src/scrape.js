/**
 * Injected into the active tab — returns image URLs from the page.
 */
(() => {
  const urls = new Set();

  function abs(u) {
    try {
      return new URL(u, document.baseURI).href;
    } catch {
      return null;
    }
  }

  function add(u) {
    if (!u || typeof u !== "string") return;
    const s = u.trim();
    if (!s || s.startsWith("data:") || s.startsWith("blob:")) return;
    // skip tiny tracking pixels by path heuristic only; size checked later in UI
    if (/pixel|1x1|spacer|transparent\.gif/i.test(s)) return;
    const a = abs(s);
    if (a && /^https?:\/\//i.test(a)) urls.add(a);
  }

  // <img>
  document.querySelectorAll("img").forEach((img) => {
    add(img.currentSrc || img.src);
    const srcset = img.getAttribute("srcset");
    if (srcset) {
      srcset.split(",").forEach((part) => {
        const u = part.trim().split(/\s+/)[0];
        add(u);
      });
    }
  });

  // <picture><source>
  document.querySelectorAll("source[srcset], source[src]").forEach((el) => {
    add(el.getAttribute("src"));
    const srcset = el.getAttribute("srcset");
    if (srcset) {
      srcset.split(",").forEach((part) => {
        add(part.trim().split(/\s+/)[0]);
      });
    }
  });

  // CSS background-image
  document.querySelectorAll("*").forEach((el) => {
    try {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === "none") return;
      const re = /url\(["']?([^"')]+)["']?\)/g;
      let m;
      while ((m = re.exec(bg))) add(m[1]);
    } catch (_) {}
  });

  // Open Graph / link icons
  document
    .querySelectorAll(
      'meta[property="og:image"], meta[name="twitter:image"], link[rel="image_src"], link[rel*="icon"]'
    )
    .forEach((el) => {
      add(el.getAttribute("content") || el.getAttribute("href"));
    });

  return {
    pageUrl: location.href,
    title: document.title || "",
    images: Array.from(urls),
  };
})();

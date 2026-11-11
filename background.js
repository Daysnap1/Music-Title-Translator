// Service worker: translates strings via Google's free web endpoint, with a persistent cache.
const TARGET = "en";
const CACHE_KEY = "tcache";
const MAX_ENTRIES = 20000;

let cache = null; // { original: translated }
let dirty = false;

async function loadCache() {
  if (cache) return cache;
  const o = await chrome.storage.local.get(CACHE_KEY);
  cache = o[CACHE_KEY] || {};
  return cache;
}

function scheduleSave() {
  if (dirty) return;
  dirty = true;
  setTimeout(async () => {
    dirty = false;
    const keys = Object.keys(cache);
    if (keys.length > MAX_ENTRIES) {
      for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete cache[k];
    }
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  }, 2000);
}

async function translateOne(text) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
    TARGET + "&dt=t&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  return j[0].map((seg) => seg[0]).join("");
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "translate") return;
  (async () => {
    await loadCache();
    const out = {};
    const todo = msg.texts.filter((t) => {
      if (cache[t] !== undefined) { out[t] = cache[t]; return false; }
      return true;
    });
    // small concurrency to be polite
    for (let i = 0; i < todo.length; i += 4) {
      await Promise.all(
        todo.slice(i, i + 4).map(async (t) => {
          try {
            const tr = await translateOne(t);
            cache[t] = tr;
            out[t] = tr;
          } catch (e) {
            // leave untranslated; will retry next time it appears
          }
        })
      );
    }
    if (todo.length) scheduleSave();
    sendResponse(out);
  })();
  return true; // async response
});

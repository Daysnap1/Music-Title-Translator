// Service worker: translates strings via Google's free web endpoint, with a persistent cache
// keyed by target language.
const CACHE_KEY = "tcache2"; // v2: keys are "<lang>\u0001<text>"
const MAX_ENTRIES = 20000;

let cache = null; // { "<lang>\u0001<original>": translated }
let dirty = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove("tcache"); // v1 cache (English only, unprefixed keys)
});

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

async function translateOne(text, target, isArtist) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
    encodeURIComponent(target) + "&dt=t" + (isArtist ? "&dt=rm" : "") +
    "&q=" + encodeURIComponent(text);
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const segs = (await r.json())[0];
  const translated = segs.filter((s) => s[0]).map((s) => s[0]).join("");
  if (!isArtist || HAN.test(text)) return translated;
  // Artist names are names, not words: romanize them (Кино -> Kino, not "Movie").
  // Names with Chinese characters keep the translation: their readings are ambiguous,
  // and Google knows famous ones (米津玄師 -> Kenshi Yonezu, not "Kome Tsu genshi").
  let roman = segs.filter((s) => s.length > 3 && s[3]).map((s) => s[3]).join(" ").trim();
  // Russian soft/hard signs come back as ' or ʹ; band names drop them (Mumiy Troll, not Troll').
  if (CYRILLIC.test(text)) roman = roman.replace(/['ʹʺ"]/g, "");
  return roman ? titleCase(roman) : translated;
}

const HAN = /\p{Script=Han}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const titleCase = (s) =>
  s.split(" ").map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "translate") return;
  const target = msg.target || "en";
  (async () => {
    await loadCache();
    const out = { t: {}, a: {} }; // t = titles, a = artist names
    const jobs = [
      ...(msg.texts || []).map((text) => ({ text, kind: "t", key: target + "\u0001" + text })),
      ...(msg.artists || []).map((text) => ({ text, kind: "a", key: target + "\u0002" + text })),
    ];
    const todo = jobs.filter((j) => {
      const hit = cache[j.key];
      if (hit !== undefined) { out[j.kind][j.text] = hit; return false; }
      return true;
    });
    // small concurrency to be polite
    for (let i = 0; i < todo.length; i += 4) {
      await Promise.all(
        todo.slice(i, i + 4).map(async (j) => {
          try {
            const tr = await translateOne(j.text, target, j.kind === "a");
            cache[j.key] = tr;
            out[j.kind][j.text] = tr;
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

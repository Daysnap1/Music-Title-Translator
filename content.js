// Content script: finds title/artist text on YouTube Music and swaps non-Latin text for English.

// Structural tags first (class names get shuffled by Google).
const SELECTORS = [
  "ytmusic-player-bar .title",
  "ytmusic-player-bar .byline",
  "ytmusic-player-queue-item .song-title",
  "ytmusic-player-queue-item .byline",
  "ytmusic-responsive-list-item-renderer .title",
  "ytmusic-responsive-list-item-renderer .secondary-flex-columns yt-formatted-string",
  "ytmusic-responsive-list-item-renderer yt-formatted-string.title",
  "ytmusic-two-row-item-renderer .title",
  "ytmusic-two-row-item-renderer .subtitle",
  "ytmusic-two-row-item-renderer yt-formatted-string",
  "ytmusic-detail-header-renderer .title",
  "ytmusic-detail-header-renderer .subtitle",
  "ytmusic-immersive-header-renderer .title",
  "ytmusic-carousel-shelf-basic-header-renderer .title",
  "ytmusic-shelf-renderer .title",
  "ytmusic-player-page .title",
  "ytmusic-player-page .byline",
  "ytmusic-playlist-shelf-renderer yt-formatted-string",
  "ytmusic-card-shelf-renderer yt-formatted-string",
].join(",");

// Any letter that is NOT Latin / common script => needs translating (so "Beyoncé" is left alone).
const NON_LATIN = /[\p{L}\p{M}](?<![\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}])/u;
const needsTranslation = (s) => NON_LATIN.test(s);

const pending = new Set();
let timer = null;

function scan(root) {
  const nodes = root.querySelectorAll ? root.querySelectorAll(SELECTORS) : [];
  nodes.forEach(queue);
  if (root.matches && root.matches(SELECTORS)) queue(root);
}

function queue(el) {
  // Never rewrite elements that contain child elements (links/runs): go down to the leaves instead.
  if (el.children.length > 0) { [...el.children].forEach(queue); return; }
  const text = el.textContent.trim();
  if (!text || text === el.dataset.ytmTr) return; // already our translation
  if (!needsTranslation(text)) return;
  pending.add(el);
  clearTimeout(timer);
  timer = setTimeout(flush, 150);
}

// Edit YouTube's own text node instead of replacing it, so its renderer keeps working
// and no stale text nodes pile up when the song changes.
function setTextInPlace(el, text) {
  const nodes = [...el.childNodes].filter((n) => n.nodeType === 3);
  if (!nodes.length) { el.appendChild(document.createTextNode(text)); return; }
  nodes[0].data = text;
  nodes.slice(1).forEach((n) => n.remove());
}

async function flush() {
  const els = [...pending];
  pending.clear();
  const texts = [...new Set(els.map((e) => e.textContent.trim()).filter(Boolean))];
  if (!texts.length) return;
  let result;
  try {
    result = await chrome.runtime.sendMessage({ type: "translate", texts });
  } catch (e) {
    return; // extension reloaded / worker asleep; next mutation retries
  }
  for (const el of els) {
    const orig = el.textContent.trim();
    const tr = result && result[orig];
    if (!tr || tr === orig) continue;
    el.dataset.ytmTr = tr;
    el.dataset.ytmOrig = orig;
    el.title = orig; // hover shows the original title
    setTextInPlace(el, tr);
  }
}

const observer = new MutationObserver((muts) => {
  for (const m of muts) {
    if (m.type === "childList") {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) scan(n);
        else if (n.nodeType === 3 && n.parentElement) queue(n.parentElement);
      });
    }
    if (m.type === "characterData" && m.target.parentElement) {
      const p = m.target.parentElement;
      if (p.matches(SELECTORS)) queue(p);
      else if (p.closest) { const c = p.closest(SELECTORS); if (c) queue(c); }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true, characterData: true });
scan(document.body);
// Safety net: Polymer sometimes re-renders text without a clean mutation.
setInterval(() => scan(document.body), 3000);

// ---- Tab title ----
let lastTitleSet = null;
let titleBusy = false;

async function fixTitle() {
  const t = document.title;
  if (titleBusy || t === lastTitleSet || !needsTranslation(t)) return;
  titleBusy = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "translate", texts: [t] });
    const tr = res && res[t];
    if (tr && tr !== t) {
      lastTitleSet = tr;
      document.title = tr;
    }
  } catch (e) {
    // worker asleep or extension reloaded; next title change retries
  } finally {
    titleBusy = false;
  }
}

function watchTitle() {
  const el = document.querySelector("title");
  if (!el) return setTimeout(watchTitle, 500);
  new MutationObserver(fixTitle).observe(el, { childList: true, characterData: true, subtree: true });
  fixTitle();
}
watchTitle();

// Content script: finds title/artist text on YouTube Music, Spotify and Apple Music
// and swaps non-Latin text for English.

// YouTube Music: structural tags first (class names get shuffled by Google).
const YTM_SELECTORS = [
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
];

// Spotify web player: links to tracks/albums/artists/playlists carry every name,
// including the now-playing bar; cards and tracklist rows have stable test ids.
const SPOTIFY_SELECTORS = [
  'a[href*="/track/"]',
  'a[href*="/album/"]',
  'a[href*="/artist/"]',
  'a[href*="/playlist/"]',
  'a[href*="/concert/"]',
  '[data-testid="internal-track-link"]',
  '[data-encore-id="cardTitle"]',
  '[data-encore-id="cardSubtitle"]',
  '[data-testid="tracklist-row"] a',
  'h1',
];

// Apple Music web player: specific test ids only (its footer lists language names
// in their own scripts, which must not be translated).
const APPLE_SELECTORS = [
  '[data-testid="non-editable-product-title"]',
  ".headings__subtitles a",
  '[data-testid="track-title"]',
  ".songs-list-row__by-line a",
  '[data-testid="product-lockup-title"]',
  ".product-lockup__subtitle a",
  '[data-testid="top-search-result-title"]',
  '[data-testid="top-search-result-subtitle"]',
];

const SELECTORS = (
  location.hostname === "open.spotify.com" ? SPOTIFY_SELECTORS :
  location.hostname === "music.apple.com" ? APPLE_SELECTORS :
  YTM_SELECTORS
).join(",");

// ---- Which text needs translating ----
// A letter outside Latin/common script AND outside the target language's own scripts.
// (So "Beyoncé" is left alone, and with Russian selected, Cyrillic titles are too.)
let target = DEFAULT_TARGET;
let NEEDS = null;

function setTarget(code) {
  target = code;
  const lang = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  const skip = ["Latin", "Common", "Inherited", ...lang.scripts]
    .map((s) => String.raw`\p{Script=${s}}`).join("");
  NEEDS = new RegExp(String.raw`[\p{L}\p{M}](?<![` + skip + "])", "u");
}
const needsTranslation = (s) => NEEDS.test(s);

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

// Edit the site's own text node instead of replacing it, so its renderer keeps working
// and no stale text nodes pile up when the song changes.
function setTextInPlace(el, text) {
  const nodes = [...el.childNodes].filter((n) => n.nodeType === 3);
  if (!nodes.length) { el.appendChild(document.createTextNode(text)); return; }
  nodes[0].data = text;
  nodes.slice(1).forEach((n) => n.remove());
}

// Artist names get romanized instead of translated (see background.js).
// Artist links: YouTube Music uses channel/UC..., Spotify and Apple Music use /artist/.
// On an artist's own page, the big header title is the artist name too.
const ARTIST_LINK = 'a[href*="/artist/"], a[href^="channel/"], a[href*="/channel/"]';
const ARTIST_HEADER = "h1, ytmusic-immersive-header-renderer .title, ytmusic-visual-header-renderer .title";
function isArtist(el) {
  if (el.closest(ARTIST_LINK)) return true;
  return /\/(artist|channel)\//.test(location.pathname) && !!el.closest(ARTIST_HEADER);
}

async function flush() {
  const els = [...pending];
  pending.clear();
  const kinds = new Map(els.map((e) => [e, isArtist(e) ? "a" : "t"]));
  const uniq = (k) => [...new Set(els.filter((e) => kinds.get(e) === k)
    .map((e) => e.textContent.trim()).filter(Boolean))];
  const texts = uniq("t"), artists = uniq("a");
  if (!texts.length && !artists.length) return;
  const asked = target;
  let result;
  try {
    result = await chrome.runtime.sendMessage({ type: "translate", texts, artists, target: asked });
  } catch (e) {
    return; // extension reloaded / worker asleep; next mutation retries
  }
  if (asked !== target || !result) return; // language changed while we waited
  for (const el of els) {
    const orig = el.textContent.trim();
    const tr = result[kinds.get(el)][orig];
    if (!tr || tr === orig) continue;
    el.dataset.ytmTr = tr;
    el.dataset.ytmOrig = orig;
    el.title = orig; // hover shows the original title
    setTextInPlace(el, tr);
  }
}

// Put every original back (used when the target language changes).
function restoreAll() {
  pending.clear();
  for (const el of document.querySelectorAll("[data-ytm-orig]")) {
    const orig = el.dataset.ytmOrig;
    if (el.textContent.trim() === el.dataset.ytmTr) setTextInPlace(el, orig);
    if (el.title === orig) el.removeAttribute("title");
    delete el.dataset.ytmTr;
    delete el.dataset.ytmOrig;
  }
  if (lastTitleSet && document.title === lastTitleSet) document.title = lastTitleOrig;
  lastTitleSet = null;
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

// ---- Tab title ----
let lastTitleSet = null;
let lastTitleOrig = null;
let titleBusy = false;

async function fixTitle() {
  const t = document.title;
  if (titleBusy || t === lastTitleSet || !needsTranslation(t)) return;
  titleBusy = true;
  const asked = target;
  try {
    const res = await chrome.runtime.sendMessage({ type: "translate", texts: [t], target: asked });
    const tr = res && res.t[t];
    if (asked === target && tr && tr !== t) {
      lastTitleOrig = t;
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

// ---- Start ----
chrome.storage.sync.get({ target: DEFAULT_TARGET }, (o) => {
  setTarget(o.target);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scan(document.body);
  // Safety net: some sites re-render text without a clean mutation.
  setInterval(() => scan(document.body), 3000);
  watchTitle();
});

// Language picked in the popup: undo current translations and redo them in the new language.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes.target) return;
  restoreAll();
  setTarget(changes.target.newValue || DEFAULT_TARGET);
  scan(document.body);
  fixTitle();
});

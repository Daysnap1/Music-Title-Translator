# Music Title Translator

**[➜ Install from the Chrome Web Store](https://chromewebstore.google.com/detail/music-title-translator/jibbhhidfadliehbcoigblpjgilodldo)**

A Chrome extension that translates song titles, artists and albums written in scripts you can't read into your language, right on the page, on:

- [YouTube Music](https://music.youtube.com)
- [Spotify Web Player](https://open.spotify.com)
- [Apple Music Web Player](https://music.apple.com)

None of them has an option to translate titles. If you listen to Japanese, Korean, Russian, Arabic or other non-Latin music, half your library shows up as text you can't read. This fixes that.

## Features

- Translates titles, artists and albums in the player bar, queue, playlists, search results, album pages and the browser tab title
- **Pick your language** from the toolbar icon: 21 languages, including English, Spanish, Russian, Japanese, Korean, Chinese and Arabic. The switch applies instantly, with no reload
- **Artist names are romanized, not translated**, because they're names: Кино becomes *Kino* (not "Movie"), Земфира becomes *Zemfira*. Names written in Chinese characters keep Google's known name instead (米津玄師 becomes *Kenshi Yonezu*), because romanizing those guesses wrong
- **Hover** any translated title to see the original
- Only translates text in scripts other than Latin and your own language's script, so "Beyoncé" is left alone, and with Russian selected, Cyrillic titles are too
- Caches translations locally, so each title is translated only once
- Small and dependency-free, no build step

## Install

1. Download this repository (green **Code** button → **Download ZIP**) and unzip it
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the unzipped folder
5. Open YouTube Music, Spotify or Apple Music in Chrome

## How it works

- `content.js` watches the player's page for title and artist elements, finds any containing non-Latin script, and replaces their text in place (without breaking the site's own rendering).
- `background.js` translates the batched text through Google Translate and stores the results in `chrome.storage.local` (up to 20,000 entries).

## Privacy

Song titles and artist names that need translating are sent to Google Translate (`translate.googleapis.com`). Nothing else leaves your browser. There are no accounts, no analytics and no tracking.

## Limitations

- Uses Google Translate's free public endpoint, which can rate-limit heavy use
- Foreign titles written in the Latin alphabet (Spanish, French, ...) are not translated, by design
- Works in the browser only, not in the Spotify or Apple Music desktop apps
- These sites change their page structure from time to time; if titles stop translating, the selectors in `content.js` may need updating

## License

MIT, see [LICENSE](LICENSE). Privacy policy: [PRIVACY.md](PRIVACY.md).

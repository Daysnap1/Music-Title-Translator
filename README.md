# Music Title Translator

A Chrome extension that translates non-English song titles, artists and albums into English, right on the page, on:

- [YouTube Music](https://music.youtube.com)
- [Spotify Web Player](https://open.spotify.com)
- [Apple Music Web Player](https://music.apple.com)

None of them has an option to translate titles. If you listen to Japanese, Korean, Russian, Arabic or other non-Latin music, half your library shows up as text you can't read. This fixes that.

## Features

- Translates titles, artists and albums in the player bar, queue, playlists, search results, album pages and the browser tab title
- **Hover** any translated title to see the original
- Only translates text in non-Latin scripts, so names like "Beyoncé" or "Sigur Rós" are left alone
- Caches translations locally, so each title is translated only once
- Small and dependency-free: three files, no build step

## Install

1. Download this repository (green **Code** button → **Download ZIP**) and unzip it
2. Open `chrome://extensions`
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the unzipped folder
5. Open YouTube Music, Spotify or Apple Music in Chrome

## How it works

- `content.js` watches the player's page for title and artist elements, finds any containing non-Latin script, and replaces their text in place (without breaking YouTube's own rendering).
- `background.js` translates the batched text through Google Translate and stores the results in `chrome.storage.local` (up to 20,000 entries).

## Privacy

Song titles and artist names that need translating are sent to Google Translate (`translate.googleapis.com`). Nothing else leaves your browser. There are no accounts, no analytics and no tracking.

## Limitations

- Uses Google Translate's free public endpoint, which can rate-limit heavy use
- Translates into English only (for now)
- Works in the browser only, not in the Spotify or Apple Music desktop apps
- These sites change their page structure from time to time; if titles stop translating, the selectors in `content.js` may need updating

## License

MIT, see [LICENSE](LICENSE).

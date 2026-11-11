# Chrome Web Store listing: copy and paste

## Store listing tab

**Name** (comes from the manifest): Music Title Translator

**Summary** (max 132 characters):
Read song titles in any script. Translates Japanese, Korean, Russian, Arabic and more on YouTube Music, Spotify and Apple Music.

**Category:** Tools

**Language:** English

**Description:**

Listen to Japanese, Korean, Russian, Chinese or Arabic music but can't read half your library? Music Title Translator puts readable titles right on the page.

Works on:
• YouTube Music
• Spotify Web Player
• Apple Music Web Player

Features:
• Translates song titles and album names into your language: player bar, queue, playlists, search, album and artist pages, and the tab title
• Artist names are romanized, not translated. Кино shows as "Kino", not "Movie"
• Choose from 21 languages, including English, Spanish, French, German, Russian, Japanese, Korean and Chinese. Switching applies instantly, with no reload
• Hover any translated title to see the original
• Leaves titles you can already read alone
• Translations are cached on your device, so it's fast and light

Privacy: only the titles that need translating are sent to Google Translate. No accounts, no tracking, no analytics.

Works in Chrome's web players only, not in the Spotify or Apple Music desktop apps.

Open source: https://github.com/YOUR-USERNAME/YOUR-REPO

**Icon:** icons/icon128.png

**Screenshots:** 1280×800 (or 640×400), at least 1. Ideas:
1. Spotify or YouTube Music page full of Japanese/Russian titles, translated
2. The popup open with the language list
3. Hover showing the original title

## Privacy practices tab

**Single purpose:**
Translates song titles, album names and artist names written in unfamiliar scripts on YouTube Music, Spotify and Apple Music into the user's chosen language.

**Permission justifications:**
- `storage`: Saves the user's chosen target language and caches translations locally so each title is translated only once.
- Host permission `translate.googleapis.com`: Sends song titles, album names and artist names that need translating to Google Translate and receives the translations.
- Content scripts on `music.youtube.com`, `open.spotify.com`, `music.apple.com`: Reads the song titles, album names and artist names on these music players and replaces them with translations on the page.

**Remote code:** No, I am not using remote code.

**Data usage:**
- Check **Website content** (song titles/artist names are sent for translation). Leave everything else unchecked.
- Check all three certifications (not sold to third parties, not used for unrelated purposes, not used for creditworthiness).

**Privacy policy URL:** https://github.com/YOUR-USERNAME/YOUR-REPO/blob/main/PRIVACY.md

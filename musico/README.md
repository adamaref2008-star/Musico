# Musico

Now-playing island, song in the Mac menu bar / Windows taskbar, music library, Beat Glow.
Mac gets a macOS-style window (vibrancy, traffic lights). Windows gets a Windows 11-style window (Mica, native caption buttons).

## Get the installers (no coding)
1. Create a GitHub repo and upload this whole folder.
2. In the repo: Actions → "Build installers" → Run workflow. (Or tag a release: `git tag v1.0.0 && git push --tags`.)
3. Download `Musico-Setup.exe` (Windows) and `Musico-mac.dmg` (Mac) from the run's artifacts / the Release.
4. Optional download page: put your repo name in `docs/index.html` (`REPO`) and turn on GitHub Pages (folder `/docs`).

## Build on your own computer
    npm install
    npm start           # run it
    npm test            # parser tests
    npm run dist:win    # on Windows -> dist/Musico-Setup.exe
    npm run dist:mac    # on a Mac   -> dist/Musico-mac.dmg

## How music works
- **Library**: add songs (or drag them onto the window). Next / Previous / click-to-play work on this list.
- **System**: Spotify, Apple Music (Mac), and anything with Windows media controls (Windows). Play / pause / next / previous / seek are sent to that app.
- Settings → General → *Play from*: Auto, System or Library.

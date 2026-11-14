# RATQUEST on Steam

This folder wraps the game in Electron so it can ship on Steam. The game itself is unchanged; a small bridge
(`src/platform/platform.ts` in the game, `preload.cjs` here) connects it to the desktop and to Steam.

## Try it on your computer
```
cd steam
npm install
npm run start          # builds the game, copies it to steam/game, opens it full screen
```
Add `--windowed` to open in a window. F11 or Alt+Enter toggles fullscreen. With Steam running, the overlay
(Shift+Tab) and the test app id 480 work; achievements only appear once you have a real app id.

## What is already done
- Game opens from a file (relative asset paths), full screen, no menu bar, black background while loading.
- Movement: he runs by default; hold Shift or L2 to sneak.
- Controllers: Xbox, PlayStation, Switch, Steam Deck and generic pads work with no setup. Steam Input works too: Steam
  passes every pad on as an Xbox pad, so the wrapper asks Steam (steamworks.js `input`) what the pad really is and the
  game shows that pad's buttons. On a Steam Deck (Steam says so, or `SteamDeck=1`) the Deck's buttons show from the start.
  Players can also pick the button pictures themselves (SAVE screen > BUTTON ICONS).
- Button prompts everywhere follow the device used last (keyboard keys, or the pad's own buttons).
- Rumble: OFF / LOW / FULL on the SAVE screen.
- Steam Deck screen: every screen checked at 1280x800 and 1280x720; no text under 13px (Valve asks for letters at least
  9px tall). `npm run check:deck` in the game folder re-runs the check (needs Chrome).
- Three save files, chosen on the title screen; all of them live in browser storage, so Auto-Cloud (below) keeps them.
- Achievements: `FIRST_CLEAR` (clear any level) and `PERFECT_LEVEL` (find everything in a level). Add more in
  `src/platform/platform.ts` and call `platform.achieve('ID')`.
- Pauses itself when the window loses focus (alt-tab, overlay).
- Saves live in the app's user-data folder, ready for Steam Auto-Cloud (see below).

Not yet tried on a real Deck or with a real Steam app id: the Steam Input type lookup and the Deck flag are written to
the steamworks.js API but untested on hardware.

## What you need to do in Steamworks (cannot be done from code)
1. Pay the Steam Direct fee, sign the paperwork, create the app. You get an App ID.
2. Put that id in `steam_appid.txt` and set `STEAM_APP_ID` when launching, or edit `APP_ID` in `main.cjs`.
3. Achievements: create `FIRST_CLEAR` and `PERFECT_LEVEL` (same names, case sensitive) in the Steamworks Stats & Achievements page, with 256x256 icons.
4. Steam Cloud: Steamworks > Cloud > Auto-Cloud. Root: `WinAppDataRoaming`, subdirectory `RATQUEST`, pattern `Local Storage/**`
   (this is where the browser storage with saves, gear and progress lives). Linux and Mac need their own root rows.
5. Controller: Steamworks > Steam Input. Declare full controller support and use the default "Gamepad" template; the game reads standard pads directly
   and asks Steam only which pad it is (for the button pictures).
6. Store page: capsule images (header 460x215, small 231x87, main 616x353, library 600x900 + hero 3840x1240 + logo),
   screenshots (1920x1080), trailer, description, tags, age rating questionnaire, price. Pages need review before launch.
7. Build upload: install the Steamworks SDK, `npm run dist:win` (and linux/mac), then upload `steam/release/*-unpacked`
   with `steamcmd` and an app build script. Create a depot per OS.
8. Set launch options per OS pointing at the packaged executable.

## Not done yet (worth adding before release)
- More achievements (one per world, all 41 wedges, Grimsqueak beaten, each gear secret).
- An app icon (`build.icon` in package.json) and a proper window title.
- Steam Deck: try it on the hardware (suspend and resume, the Deck's on-screen keyboard is not needed: no text entry
  in the game itself).
- Rich presence and trading cards are optional extras.

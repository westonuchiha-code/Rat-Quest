// Desktop wrapper: opens the built game full screen and connects it to Steam.
// If Steam is not running (or steamworks.js is not installed) the game still starts; Steam features just do nothing.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Steam's overlay needs these switches with Electron.
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Set this to your real Steam app id when you have one. 480 is Valve's public test app (Spacewar).
const APP_ID = Number(process.env.STEAM_APP_ID || 480);

let steam = null;
try {
  steam = require('steamworks.js').init(APP_ID);
} catch (e) {
  console.log('Steam not available:', e && e.message ? e.message : e);
}

// On a Steam Deck the game shows the Deck's buttons from the start. Steam knows; SteamOS also sets SteamDeck=1.
let deck = process.env.SteamDeck === '1';
try {
  if (steam && steam.utils && steam.utils.isSteamRunningOnSteamDeck()) deck = true;
} catch (e) {
  /* older steamworks.js */
}
// Steam Input: lets the game ask what the controller really is (Steam passes every pad on as an Xbox pad).
try {
  if (steam && steam.input) steam.input.init();
} catch (e) {
  console.log('Steam Input not available:', e && e.message ? e.message : e);
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: !app.commandLine.hasSwitch('windowed'),
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  win.on('closed', () => { win = null; });
  if (steam) {
    try {
      require('steamworks.js').electronEnableSteamOverlay();
    } catch (e) {
      console.log('Overlay not enabled:', e && e.message ? e.message : e);
    }
  }
}

ipcMain.on('rq:achievement', (_e, id) => {
  try {
    if (steam && typeof id === 'string') steam.achievement.activate(id);
  } catch (e) {
    console.log('Achievement failed:', id, e && e.message ? e.message : e);
  }
});
ipcMain.on('rq:info', (e) => { e.returnValue = { deck }; });
ipcMain.handle('rq:padType', () => {
  try {
    const pads = steam && steam.input ? steam.input.getControllers() : [];
    return pads.length ? String(pads[0].getType()) : null;
  } catch (e) {
    return null;
  }
});
ipcMain.on('rq:fullscreen', (_e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.handle('rq:isFullscreen', () => (win ? win.isFullScreen() : false));
ipcMain.on('rq:quit', () => app.quit());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => app.quit());

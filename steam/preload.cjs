// Gives the game a small, safe door to the desktop and Steam. The game never sees Node.
const { contextBridge, ipcRenderer } = require('electron');

let fullscreen = false;
let info = {};
try {
  info = ipcRenderer.sendSync('rq:info') || {};
} catch (e) {
  info = {};
}
ipcRenderer.invoke('rq:isFullscreen').then((v) => { fullscreen = !!v; }).catch(() => {});

contextBridge.exposeInMainWorld('ratquestHost', {
  steam: true,
  steamDeck: !!info.deck,
  padType: () => ipcRenderer.invoke('rq:padType'),
  activateAchievement: (id) => ipcRenderer.send('rq:achievement', String(id)),
  setFullscreen: (on) => { fullscreen = !!on; ipcRenderer.send('rq:fullscreen', !!on); },
  isFullscreen: () => fullscreen,
  quit: () => ipcRenderer.send('rq:quit'),
});

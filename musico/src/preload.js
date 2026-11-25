const { contextBridge, ipcRenderer, webUtils } = require('electron');

const on = (ch, cb) => ipcRenderer.on(ch, (_e, ...a) => cb(...a));

contextBridge.exposeInMainWorld('musico', {
  env: ipcRenderer.sendSync('env:get'),
  getSettings: () => ipcRenderer.sendSync('settings:get'),
  setSettings: (p) => ipcRenderer.send('settings:set', p),
  onSettings: (cb) => on('settings:changed', cb),
  getPlayer: () => ipcRenderer.invoke('player:get'),
  onPlayer: (cb) => on('player:state', cb),
  cmd: (name, arg) => ipcRenderer.send('player:cmd', name, arg),
  library: {
    get: () => ipcRenderer.invoke('library:get'),
    add: () => ipcRenderer.invoke('library:add'),
    addPaths: (p) => ipcRenderer.invoke('library:addPaths', p),
    remove: (i) => ipcRenderer.invoke('library:remove', i),
    onChanged: (cb) => on('library:changed', cb)
  },
  pathForFile: (f) => webUtils.getPathForFile(f),
  islandMouse: (inside) => ipcRenderer.send('island:mouse', inside),
  openSettings: () => ipcRenderer.send('settings:open'),
  cpu: () => ipcRenderer.invoke('sys:cpu'),
  // audio engine (hidden window)
  engine: {
    onCmd: (cb) => on('engine:cmd', cb),
    report: (s) => ipcRenderer.send('engine:state', s),
    level: (v) => ipcRenderer.send('engine:level', v)
  },
  onBeat: (cb) => on('beat:level', cb)
});

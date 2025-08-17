const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  updateMessage: (cb) => ipcRenderer.on('updateMessage', (_, data) => cb(data)),
  controlWindow: (action) => ipcRenderer.send('window-control', action),
});

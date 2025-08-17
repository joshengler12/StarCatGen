// main.js
const { app, BrowserWindow, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let win;

// ---- window ----
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'StarCatGen',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'screens', 'main', 'mainPreload.js'),
    },
  });

  win.loadFile(path.join(__dirname, 'screens', 'main', 'main.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.webContents.openDevTools({ mode: 'undocked' }); // optional
  });

  win.on('closed', () => { win = null; });
}

function sendUpdateMessage(text) {
  console.log('[Updater]', text);
  if (win && !win.isDestroyed()) win.webContents.send('updateMessage', text);
}

// window controls from renderer
ipcMain.on('window-control', (_e, action) => {
  if (!win) return;
  if (action === 'minimize') win.minimize();
  else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (action === 'close') win.close();
});

// ---- app lifecycle ----
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // auto-update flow
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.checkForUpdates();

  const initialMsg = `Checking for updates. Current version ${app.getVersion()}`;
  const sendWhenReady = () => sendUpdateMessage(initialMsg);
  if (win.webContents.isLoading()) {
    win.webContents.once('did-finish-load', sendWhenReady);
  } else {
    sendWhenReady();
  }
});

// updater events
autoUpdater.on('checking-for-update', () =>
  sendUpdateMessage(`Checking for updates. Current version ${app.getVersion()}`)
);
autoUpdater.on('update-available', () => {
  sendUpdateMessage('Update available. Downloading...');
  autoUpdater.downloadUpdate();
});
autoUpdater.on('update-not-available', () =>
  sendUpdateMessage(`No update available. Current version ${app.getVersion()}`)
);
autoUpdater.on('update-downloaded', () =>
  sendUpdateMessage('Update downloaded. Will install on quit.')
);
autoUpdater.on('error', (err) =>
  sendUpdateMessage(`Error: ${err?.message || String(err)}`)
);

// safety
process.on('uncaughtException', (err) => console.error(err));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

console.log("main.js complete")
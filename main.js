import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let overlayWindow = null;
let tray = null;

const isDev = !app.isPackaged;
const DB_PATH = path.join(app.getPath('userData'), 'orb_db.json');

// Base64 purple-ring tray icon
const TRAY_ICON_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAcUlEQVQ4y2NgGAWjYBSMgoEBJgYGBhYmBqKsYKJBHUxsbOz/SXIPwz8G/yexYhQMCKAbwMjMzPifkYHhPxP5FjCjG/AfygaJYzMAtgGkhs8A3ACGfwwMDP+ZSDcANwBhAEEFmBhIsQEsQD8xMDD8JxoAAL64D9H4L/1cAAAAAElFTkSuQmCC';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#000000',
    title: 'Orb OS',
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Critical: keeps timers & speech synth running when minimized
    }
  });

  const url = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, 'dist/index.html')}`;

  const loadWithRetry = () => {
    mainWindow.loadURL(url).catch((err) => {
      if (isDev) {
        console.log('Failed to load dev server, retrying in 1s...', err.message);
        setTimeout(loadWithRetry, 1000);
      }
    });
  };

  loadWithRetry();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createOverlayWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: width,
    height: height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  // Make it completely click-through by default
  overlayWindow.setIgnoreMouseEvents(true);

  // Load the React app in overlay mode
  const url = isDev 
    ? 'http://localhost:5173/?overlay=true' 
    : `file://${path.join(__dirname, 'dist/index.html')}?overlay=true`;

  overlayWindow.loadURL(url);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function createTray() {
  const image = nativeImage.createFromDataURL(TRAY_ICON_BASE64);
  tray = new Tray(image);
  tray.setToolTip('Orb OS');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Orb',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Start Focus Session',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('system-tray-command', 'start-focus');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Orb',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerGlobalHotkeys() {
  // Ctrl+Shift+F: Toggle Focus Aura Active
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-hotkey-triggered', 'toggle-aura');
    }
  });

  // Ctrl+Shift+A: Enable Aura focus mode
  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-hotkey-triggered', 'enable-aura');
    }
  });

  // Ctrl+Shift+S: Snooze Reminder
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-hotkey-triggered', 'snooze-reminder');
    }
  });

  // Ctrl+Shift+D: Dismiss Reminder
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-hotkey-triggered', 'dismiss-reminder');
    }
  });

  // Ctrl+Shift+T: Start Focus Session
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-hotkey-triggered', 'start-focus');
    }
  });

  // Ctrl+Shift+B: Start Break
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-hotkey-triggered', 'start-break');
    }
  });

  // Ctrl+Shift+N: Quick Note (Focus main app and open note entry)
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('note:quick-open');
    }
  });
}

app.whenReady().then(() => {
  createMainWindow();
  createOverlayWindow();
  createTray();
  registerGlobalHotkeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createOverlayWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC communication channel configurations
ipcMain.handle('database:read', async () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read database file:', err);
  }
  return null;
});

ipcMain.handle('database:write', async (event, data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write database file:', err);
    return false;
  }
});

ipcMain.handle('system:get-info', async () => {
  return {
    userDataPath: app.getPath('userData'),
    isPackaged: app.isPackaged,
    platform: process.platform,
    version: app.getVersion()
  };
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.hide(); // Minimize to tray instead of quitting
});

// Focus Aura IPC coordinate relays
ipcMain.on('overlay:update', (event, data) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay:draw', data);
    
    // Toggle overlay window click-through depending on strict escalation level.
    // If strict level is 4 (fullscreen blockade), click events must not pass through so the user has to click Acknowledge.
    if (data.strictLevel >= 4) {
      overlayWindow.setIgnoreMouseEvents(false);
      overlayWindow.focus();
    } else {
      overlayWindow.setIgnoreMouseEvents(true);
    }
  }
});

ipcMain.on('overlay:acknowledge', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setIgnoreMouseEvents(true);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('system-tray-command', 'reminder-acknowledged');
  }
});

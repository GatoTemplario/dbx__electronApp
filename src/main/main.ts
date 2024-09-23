const dotenv = require('dotenv');
const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');


const pathToReload = path.join(__dirname, 'dist');
require('electron-reload')(pathToReload, {
    // Use this path to watch for changes in the source files
    electron: path.join(__dirname, '../../node_modules/.bin/electron'),
    hardResetMethod: 'exit',
    // Ensure this is the path to your main file
    app: {
        path: path.join(__dirname, '../../dist/main/main.js')
    }
});

dotenv.config();


function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      // darkTheme: user
    },
  });
  
  mainWindow.loadFile(path.join(__dirname, '../index.html'));
  mainWindow.maximize()
  
  // For development purposes, you might want to open DevTools by default
  nativeTheme.themeSource = 'dark'; // Options: 'dark', 'light', or 'system'
  mainWindow.webContents.openDevTools();
  
  return mainWindow;
}

function setupAppEvents() {
  app.whenReady().then(async () => {
    createMainWindow();
    
    // Initialize Dropbox auth
    try {
      
      await authManager.getAccessToken();
      console.log('Dropbox authentication successful');
    } catch (error) {
      console.error('Dropbox authentication failed:', error);
    }
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

function setupIPC() {
  ipcMain.handle('get-dropbox-token', () => {
    return process.env.DROPBOX_ACCESS_TOKEN;
  });
}

function startApp() {
  setupAppEvents();
  setupIPC();
  console.log(path.join(__dirname, '../index.html'))
}


startApp();
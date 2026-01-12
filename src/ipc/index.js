/**
 * IPC Handlers Loader
 * Centralized loader for all IPC handlers
 */

const sidebarIpc = require('./sidebar');
const configIpc = require('./config');
const { ipcMain, shell } = require('electron');

/**
 * Initialize and register all IPC handlers
 */
function loadIpcHandlers(mainWindow = null) {
  console.log('betterGN: Loading IPC handlers...');

  // Initialize config first
  configIpc.initConfig();

  // Register all handlers
  sidebarIpc.registerSidebarHandlers();
  configIpc.registerConfigHandlers(mainWindow);

  // Register external link handler
  ipcMain.handle('bettergn:open-external', async (event, url) => {
    try {
      // Validate URL to prevent misuse
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('http')) {
        console.warn('betterGN: Rejected non-http URL:', url);
        return false;
      }
      await shell.openExternal(url);
      return true;
    } catch (err) {
      console.error('betterGN: Failed to open external URL:', url, err);
      return false;
    }
  });

  console.log('betterGN: All IPC handlers loaded successfully');
}

/**
 * Get the current config
 */
function getConfig() {
  return configIpc.getConfig();
}

module.exports = {
  loadIpcHandlers,
  getConfig,
};

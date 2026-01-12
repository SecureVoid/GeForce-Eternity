/**
 * Config IPC Handler
 * Handles configuration operations (get, set, update)
 */

const { ipcMain } = require('electron');
const { loadConfig, updateConfig } = require('../config');

let config = null;

function initConfig() {
  // Load config at startup
  config = loadConfig();
}

function registerConfigHandlers() {
  // IPC handler to update automute config
  ipcMain.handle('bettergn:set-automute', (event, enabled) => {
    config = updateConfig('automute', enabled);
    console.log('Auto-mute toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update autofocus config
  ipcMain.handle('bettergn:set-autofocus', (event, enabled) => {
    config = updateConfig('autofocus', enabled);
    console.log('Auto-focus toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update idleguard config
  ipcMain.handle('bettergn:set-idleguard', (event, enabled) => {
    config = updateConfig('idleguard', enabled);
    console.log('Idle Guard toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update user agent config
  ipcMain.handle('bettergn:set-useragent', (event, userAgent) => {
    config = updateConfig('userAgent', userAgent);
    console.log('User Agent changed:', userAgent || 'Better GN (default)');
    return { success: true, config };
  });

  // IPC handler to update Discord RPC config
  ipcMain.handle('bettergn:set-discordrpc', (event, enabled) => {
    config = updateConfig('discordRpc', enabled);
    console.log('Discord RPC toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to get current config
  ipcMain.handle('bettergn:get-config', (event) => {
    return { config };
  });

  console.log('betterGN: Config IPC handlers registered');
}

function getConfig() {
  return config;
}

module.exports = {
  initConfig,
  registerConfigHandlers,
  getConfig,
};

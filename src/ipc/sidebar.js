/**
 * Sidebar IPC Handler
 * Handles sidebar HTML/CSS injection requests
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let sidebarHTML = '';
let sidebarCSS = '';

function loadSidebarAssets() {
  try {
    sidebarHTML = fs.readFileSync(path.join(__dirname, '..', 'sidebar', 'sidebar.html'), 'utf8');
    sidebarCSS = fs.readFileSync(path.join(__dirname, '..', 'sidebar', 'sidebar.css'), 'utf8');
  } catch (err) {
    console.error('Failed to load sidebar assets:', err.message);
  }
}

function registerSidebarHandlers() {
  // Load assets on first call
  loadSidebarAssets();

  // IPC handler to inject sidebar on first request from renderer
  ipcMain.handle('bettergn:inject-sidebar', (event) => {
    return { html: sidebarHTML, css: sidebarCSS };
  });

  console.log('betterGN: Sidebar IPC handlers registered');
}

module.exports = {
  registerSidebarHandlers,
  loadSidebarAssets,
};

const { app, BrowserWindow, shell, session, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadIpcHandlers, getConfig } = require('./ipc');
const { initializeRPC, updateActivity, disconnectRPC } = require('./discord-rpc');

let mainWindow = null;

// Create the main application window
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 1000,
    title: "GeForce Eternity",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  // Remove default menu for a clean kiosk-like window
  win.removeMenu();

  const targetUrl = 'https://play.geforcenow.com/mall/';

  // Set user agent from config if available
  const config = getConfig();
  if (config && config.userAgent) {
    win.webContents.setUserAgent(config.userAgent);
  }

  // Load the remote GeForce Now Mall URL
  win.loadURL(targetUrl);

  // Store reference to main window for shortcut handler
  mainWindow = win;

  // Open devtools only if ELECTRON_DEV env is set (for debugging)
  if (process.env.ELECTRON_DEV) win.webContents.openDevTools({ mode: 'detach' });
}

// Set application name
app.setName("GeForce Eternity");

// Cross-platform safe flags
app.commandLine.appendSwitch("enable-gpu-rasterization");

// Linux-only hardware acceleration
if (process.platform === 'linux') {
  app.commandLine.appendSwitch("ignore-gpu-blocklist");
  app.commandLine.appendSwitch("enable-zero-copy");
  app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
  app.commandLine.appendSwitch("enable-gpu-memory-buffer-video-frames");
  app.commandLine.appendSwitch(
    "enable-features",
    [
      "WaylandWindowDecorations",
      "AcceleratedVideoDecodeLinuxGL",
      "VaapiVideoDecoder",
      "AcceleratedVideoDecodeLinuxZeroCopyGL",
      "VaapiIgnoreDriverChecks",
    ].join(",")
  );
  app.commandLine.appendSwitch(
    "disable-features",
    "UseChromeOSDirectVideoDecoder"
  );
}

// Create a single-instance lock so multiple instances don't run
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus on existing window if second instance is launched
    const wins = BrowserWindow.getAllWindows();
    if (wins.length) {
      if (wins[0].isMinimized()) wins[0].restore();
      wins[0].focus();
    }
  });

  app.whenReady().then(async () => {
    // Load IPC handlers
    loadIpcHandlers();

    // Initialize Discord RPC
    await initializeRPC();

    // Create the window
    createWindow();

    // Prevent in-app navigation and handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url === "about:blank") {
            return {
                action: "allow",
                overrideBrowserWindowOptions: {
                    width: 800,
                    height: 600,
                    autoHideMenuBar: true,
                    icon: path.join(
                        __dirname,
                        "assets/resources/gfn_eternity.png"
                    ),
                    title: "Account Connection",
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        sandbox: true,
                        session: mainWindow.webContents.session,
                    },
                },
            };
        }
        shell.openExternal(url);
        return { action: "deny" };
    });

    // Modify request headers for Nvidia Grid API requests
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ["*://*.nvidiagrid.net/v2/*"] },
        (details, callback) => {
            const headers = details.requestHeaders;

            // Force nv-device-os and related platform headers
            headers["nv-device-os"] = "WINDOWS";
            headers["sec-ch-ua-platform"] = '"WINDOWS"';
            headers["sec-ch-ua-platform-version"] = "14.0.0";

            callback({ requestHeaders: headers });
        }
    );

    // Register global shortcut Ctrl+I / Cmd+I to toggle sidebar
    const shortcutKey = 'CommandOrControl+I';
    try {
      globalShortcut.register(shortcutKey, () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              if (!window.__bettergnSidebarState) {
                window.__bettergnSidebarState = { isOpen: false };
              }
              const sidebar = document.getElementById('bettergn-sidebar');
              if (!sidebar) return;
              window.__bettergnSidebarState.isOpen = !window.__bettergnSidebarState.isOpen;
              sidebar.classList.toggle('open');
            })();
          `).catch(() => { });
        }
      });
      console.log('Shortcut registered:', shortcutKey);
    } catch (err) {
      console.warn('Failed to register shortcut:', err.message);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Handle window focus/blur for auto-mute
    mainWindow.on("blur", () => {
      const config = getConfig();
      if (config && config.automute === true) {
        mainWindow.webContents.setAudioMuted(true);
        console.log('Window unfocused: audio muted');
      }
    });

    mainWindow.on("focus", () => {
      const config = getConfig();
      if (config && config.automute === true) {
        mainWindow.webContents.setAudioMuted(false);
        console.log('Window focused: audio unmuted');
      }
    });

    
    mainWindow.on("page-title-updated", (event, title) => {
      event.preventDefault();

      // Handle idle guard by sending harmless keypresses
      const config = getConfig();
      if (config && config.idleguard === true) {
        if (title.includes("60")) {
          mainWindow.webContents.sendInputEvent({
            type: "keyDown",
            keyCode: "F15"
          });
          mainWindow.webContents.sendInputEvent({
            type: "keyUp",
            keyCode: "F15"
          });
        }
      }

      // Handle dynamic title updates
      let gameName = title
        .replace(/^GeForce NOW - /, "")
        .replace(/ on GeForce NOW$/, "");

      if (title === "GeForce Eternity | GeForce NOW" || title === "GeForce NOW") {
        mainWindow.setTitle("GeForce Eternity");
      } else {
        const modifiedTitle = `GeForce Eternity${gameName ? " | " + gameName : ""}`;
        mainWindow.setTitle(modifiedTitle);
      }
    });

    // Check if the gaming rig is ready to start a game session
    session.defaultSession.webRequest.onBeforeRequest(
      { urls: ["wss://*/*"] },
      (details, callback) => {
        const config = getConfig();
        const url = details.url;
        const isNvidiaRequest =
          url.includes("nvidiagrid.net") &&
          url.includes("/sign_in") &&
          url.includes("peer_id");

        if (isNvidiaRequest) {
          console.log(
            "Detected Nvidia Cloudmatch WebSocket upgrade request:"
          );
          if (config && config.autofocus) { 
            mainWindow.maximize();
            mainWindow.focus();

            // Force window to front on Windows
            mainWindow.setAlwaysOnTop(true);
            setTimeout(() => {
              mainWindow.setAlwaysOnTop(false);
            }, 500);
          }
        }
        callback({ cancel: false });
      }
    );

    setInterval(() => {
        const title = mainWindow.getTitle();
        console.log('betterGN: Window title:', title);
        const gameTitle = title.startsWith("GeForce Eternity | ")
            ? title.replace("GeForce Eternity | ", "")
            : "";
        console.log('betterGN: Extracted game title:', gameTitle || "(none)");
        updateActivity(gameTitle || null).catch(console.error);
    }, 15_000);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // Unregister shortcuts on quit
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    disconnectRPC();
  });
}

// Note: GeForce Now uses DRM and web platform features — this Electron wrapper
// simply loads the web UI. Some features may not work identically to the browser.
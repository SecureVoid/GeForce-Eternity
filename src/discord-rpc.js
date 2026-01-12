/**
 * Discord RPC Integration
 * Displays currently playing game in Discord status
 */

const DiscordRPC = require('discord-rpc');
const { getConfig } = require('./ipc');

const CLIENT_ID = '1460053673546748125'; // Replace with your Discord app ID

let rpc = null;
let connected = false;

/**
 * Initialize Discord RPC connection
 */
async function initializeRPC() {
  try {
    console.log('GFN_Eternity: Initializing Discord RPC with CLIENT_ID:', CLIENT_ID);
    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
      console.log('GFN_Eternity: Discord RPC connected successfully');
      console.log('Discord activity will now show your game status');
      connected = true;
    });

    rpc.on('error', (err) => {
      console.error('GFN_Eternity: Discord RPC error:', err.message);
      connected = false;
    });

    rpc.on('disconnected', () => {
      console.warn('GFN_Eternity: Discord RPC disconnected');
      connected = false;
    });

    console.log('GFN_Eternity: Attempting to login to Discord...');
    await rpc.login({ clientId: CLIENT_ID }).catch((err) => {
      console.error('GFN_Eternity: Failed to connect to Discord');
      console.error('Make sure Discord is running: https://discord.com/download');
      console.error('Error:', err.message);
      connected = false;
    });
  } catch (err) {
    console.error('GFN_Eternity: Failed to initialize Discord RPC:', err.message);
    connected = false;
  }
}

/**
 * Update Discord presence with current game title
 * @param {string|null} gameTitle - The game title to display, or null for idle
 */
async function updateActivity(gameTitle = null) {
  try {
    const config = getConfig();
    
    // Don't update if Discord RPC is disabled or not connected
    if (!config) {
      console.log('GFN_Eternity: No config available');
      return;
    }
    
    if (!config.discordRpc) {
      console.log('GFN_Eternity: Discord RPC is disabled in config');
      return;
    }
    
    if (!connected) {
      console.log('GFN_Eternity: Discord RPC not connected, attempting to reconnect...');
      return;
    }
    
    if (!rpc) {
      console.log('GFN_Eternity: Discord RPC client not initialized');
      return;
    }

    const startTime = Math.floor(Date.now() / 1000);
    const activity = !gameTitle
      ? {
          details: 'Browsing the library',
          state: 'Browsing games',
          largeImageKey: 'gfn',
          largeImageText: 'GeForce Eternity',
          startTimestamp: startTime,
          instance: true,
        }
      : {
          details: `Playing: ${gameTitle}`,
          state: 'Gaming',
          largeImageKey: 'gfn',
          largeImageText: 'GeForce Now',
          startTimestamp: startTime,
          instance: true,
        };

    console.log('GFN_Eternity: Updating Discord activity:', activity);
    const result = await rpc.setActivity(activity);
    console.log('GFN_Eternity: Discord activity updated successfully');
    return result;
  } catch (err) {
    console.error('GFN_Eternity: Failed to update Discord activity:', err.message);
  }
}

/**
 * Disconnect Discord RPC
 */
async function disconnectRPC() {
  try {
    if (rpc && connected) {
      await rpc.destroy();
      rpc = null;
      connected = false;
      console.log('GFN_Eternity: Discord RPC disconnected');
    }
  } catch (err) {
    console.error('GFN_Eternity: Failed to disconnect Discord RPC:', err);
  }
}

/**
 * Check if Discord RPC is currently connected
 */
function isConnected() {
  return connected;
}

module.exports = {
  initializeRPC,
  updateActivity,
  disconnectRPC,
  isConnected,
};

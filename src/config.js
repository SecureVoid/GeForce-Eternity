/**
 * BetterGN Configuration Manager
 * Handles persistent settings storage in userData/settings.json
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  automute: false,
  autofocus: false,
  idleguard: false,
  userAgent: "",
  discordRpc: false,
};

const userAgentOptions = [
    { label: "Better GN", value: "" },
    {
        label: "Chrome",
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    },
    {
        label: "Firefox",
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:116.0) Gecko/20100101 Firefox/116.0",
    },
];

/**
 * Get the path to the settings file
 */
function getConfigPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * Ensure the userData directory exists
 */
function ensureUserDataDir() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
}

/**
 * Load configuration from disk
 * Returns default config if file doesn't exist or is invalid
 */
function loadConfig() {
  try {
    ensureUserDataDir();
    const configPath = getConfigPath();

    if (!fs.existsSync(configPath)) {
      console.log('betterGN: No config file found, using defaults');
      return { ...DEFAULT_CONFIG };
    }

    const data = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(data);

    // Validate and merge with defaults to ensure all properties exist
    const config = {
      automute: typeof parsed.automute === 'boolean' ? parsed.automute : DEFAULT_CONFIG.automute,
      autofocus: typeof parsed.autofocus === 'boolean' ? parsed.autofocus : DEFAULT_CONFIG.autofocus,
      idleguard: typeof parsed.idleguard === 'boolean' ? parsed.idleguard : DEFAULT_CONFIG.idleguard,
      userAgent: typeof parsed.userAgent === 'string' ? parsed.userAgent : DEFAULT_CONFIG.userAgent,
      discordRpc: typeof parsed.discordRpc === 'boolean' ? parsed.discordRpc : DEFAULT_CONFIG.discordRpc,
    };

    console.log('betterGN: Config loaded:', config);
    return config;
  } catch (err) {
    console.error('betterGN: Failed to load config:', err);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to disk
 */
function saveConfig(config) {
  try {
    ensureUserDataDir();
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('betterGN: Config saved:', config);
  } catch (err) {
    console.error('betterGN: Failed to save config:', err);
  }
}

/**
 * Update a single config property and save
 */
function updateConfig(key, value) {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  return config;
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfig,
  DEFAULT_CONFIG,
};

// Preload: use contextBridge to expose a minimal API.
const { contextBridge, ipcRenderer } = require('electron');

// Expose a small API to the renderer.
contextBridge.exposeInMainWorld('betterGN', {
  version: () => '0.0.1',
  openExternal: (url) => {
    ipcRenderer.invoke('bettergn:open-external', url).catch(console.error);
  },
});

// Inject sidebar HTML and CSS from the main process when page loads
(async function initSidebar() {
  if (globalThis.__bettergnSidebarInjected) return;
  globalThis.__bettergnSidebarInjected = true;

  try {
    // Request sidebar assets and config from main process
    const { html, css } = await ipcRenderer.invoke('bettergn:inject-sidebar');
    const { config } = await ipcRenderer.invoke('bettergn:get-config');

    if (!html || !css) {
      console.warn('betterGN: sidebar assets not available');
      return;
    }

    console.log('betterGN: Initial config loaded:', config);

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectSidebar);
    } else {
      injectSidebar();
    }

    function injectSidebar() {
      // Inject CSS
      const styleEl = document.createElement('style');
      styleEl.id = 'bettergn-sidebar-styles';
      styleEl.textContent = css;
      document.head.appendChild(styleEl);

      // Inject HTML
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);

      // Wire up interactions
      const sidebar = document.getElementById('bettergn-sidebar');
      if (!sidebar) return;

      const closeBtn = sidebar.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          sidebar.classList.remove('open');
        });
      }

      // Setup toggle buttons
      const toggleAutoFocus = sidebar.querySelector('#toggle-autofocus');
      const toggleAutoMute = sidebar.querySelector('#toggle-automute');
      const toggleIdleGuard = sidebar.querySelector('#toggle-idleguard');
      const toggleDiscordRpc = sidebar.querySelector('#toggle-discordrpc');
      const selectUserAgent = sidebar.querySelector('#select-useragent');

      // Restore saved toggle states from config
      if (toggleAutoFocus && config.autofocus) {
        toggleAutoFocus.classList.add('on');
        toggleAutoFocus.setAttribute('aria-pressed', 'true');
      }
      if (toggleAutoMute && config.automute) {
        toggleAutoMute.classList.add('on');
        toggleAutoMute.setAttribute('aria-pressed', 'true');
      }
      if (toggleIdleGuard && config.idleguard) {
        toggleIdleGuard.classList.add('on');
        toggleIdleGuard.setAttribute('aria-pressed', 'true');
      }
      if (toggleDiscordRpc && config.discordRpc) {
        toggleDiscordRpc.classList.add('on');
        toggleDiscordRpc.setAttribute('aria-pressed', 'true');
      }
      if (selectUserAgent && config.userAgent) {
        selectUserAgent.value = config.userAgent;
      }

      if (toggleAutoFocus) {
        toggleAutoFocus.addEventListener('click', () => {
          toggleAutoFocus.classList.toggle('on');
          toggleAutoFocus.setAttribute('aria-pressed', toggleAutoFocus.classList.contains('on'));
          const enabled = toggleAutoFocus.classList.contains('on');
          console.log('Auto Focus:', enabled);
          // Send to main process
          ipcRenderer.invoke('bettergn:set-autofocus', enabled).catch(console.error);
          // Dispatch custom event for page to listen
          window.dispatchEvent(
            new CustomEvent('bettergn-autofocus-toggle', {
              detail: { enabled },
            })
          );
        });
      }

      if (toggleAutoMute) {
        toggleAutoMute.addEventListener('click', () => {
          toggleAutoMute.classList.toggle('on');
          toggleAutoMute.setAttribute('aria-pressed', toggleAutoMute.classList.contains('on'));
          const enabled = toggleAutoMute.classList.contains('on');
          console.log('Auto Mute:', enabled);
          // Send to main process
          ipcRenderer.invoke('bettergn:set-automute', enabled).catch(console.error);
          // Dispatch custom event for page to listen
          window.dispatchEvent(
            new CustomEvent('bettergn-automute-toggle', {
              detail: { enabled },
            })
          );
        });
      }

      if (toggleIdleGuard) {
        toggleIdleGuard.addEventListener('click', () => {
          toggleIdleGuard.classList.toggle('on');
          toggleIdleGuard.setAttribute('aria-pressed', toggleIdleGuard.classList.contains('on'));
          const enabled = toggleIdleGuard.classList.contains('on');
          console.log('Idle Guard:', enabled);
          // Send to main process
          ipcRenderer.invoke('bettergn:set-idleguard', enabled).catch(console.error);
          // Dispatch custom event for page to listen
          window.dispatchEvent(
            new CustomEvent('bettergn-idleguard-toggle', {
              detail: { enabled },
            })
          );
        });
      }

      if (toggleDiscordRpc) {
        toggleDiscordRpc.addEventListener('click', () => {
          toggleDiscordRpc.classList.toggle('on');
          toggleDiscordRpc.setAttribute('aria-pressed', toggleDiscordRpc.classList.contains('on'));
          const enabled = toggleDiscordRpc.classList.contains('on');
          console.log('Discord RPC:', enabled);
          // Send to main process
          ipcRenderer.invoke('bettergn:set-discordrpc', enabled).catch(console.error);
          // Dispatch custom event for page to listen
          window.dispatchEvent(
            new CustomEvent('bettergn-discordrpc-toggle', {
              detail: { enabled },
            })
          );
        });
      }

      if (selectUserAgent) {
        selectUserAgent.addEventListener('change', () => {
          const selectedValue = selectUserAgent.value;
          console.log('User Agent changed:', selectedValue || 'Better GN (default)');
          // Send to main process
          ipcRenderer.invoke('bettergn:set-useragent', selectedValue).catch(console.error);
          // Dispatch custom event for page to listen
          window.dispatchEvent(
            new CustomEvent('bettergn-useragent-change', {
              detail: { userAgent: selectedValue },
            })
          );
        });
      }

      // Close sidebar when clicking outside
      document.addEventListener('click', (e) => {
        if (!sidebar.classList.contains('open')) return;
        const rect = sidebar.getBoundingClientRect();
        if (e.clientX > rect.right && e.clientX > 0) {
          sidebar.classList.remove('open');
        }
      });

      console.log('betterGN: sidebar injected successfully');
    }
  } catch (err) {
    console.error('betterGN: Failed to inject sidebar:', err);
  }
})();


const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = [
      'window:minimize',
      'window:maximize',
      'window:close',
      'overlay:update',
      'overlay:acknowledge'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, func) => {
    const validChannels = [
      'global-hotkey-triggered',
      'system-tray-command',
      'note:quick-open',
      'overlay:draw'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  off: (channel, func) => {
    const validChannels = [
      'global-hotkey-triggered',
      'system-tray-command',
      'note:quick-open',
      'overlay:draw'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, func);
    }
  },
  invoke: async (channel, data) => {
    const validChannels = [
      'database:read',
      'database:write',
      'system:get-info'
    ];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data);
    }
  }
});

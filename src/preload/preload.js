'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const EVENTS = new Set([
  'settings:changed',
  'theme:changed',
  'language:changed',
  'downloads:changed',
  'shortcut',
  'popup:open',
  'popup:blocked',
  'permission:request',
  'window:state',
  'open-url',
  'internal:navigate',
  'notify',
  'query:current-tab',
]);

function on(channel, callback) {
  if (!EVENTS.has(channel) || typeof callback !== 'function') return () => {};
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('ie', {
  locale: ipcRenderer.sendSync('app:locale'),
  meta: () => ipcRenderer.invoke('app:meta'),
  startup: () => ipcRenderer.invoke('browser:startup'),
  saveSession: (payload) => ipcRenderer.invoke('browser:save-session', payload),
  openOptions: (section) => ipcRenderer.invoke('settings:open-options', section),

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  },

  favorites: {
    add: (favorite) => ipcRenderer.invoke('settings:add-favorite', favorite),
    remove: (id) => ipcRenderer.invoke('settings:remove-favorite', id),
  },

  toggleCompat: (payload) => ipcRenderer.invoke('settings:toggle-compat', payload),

  history: {
    list: () => ipcRenderer.invoke('history:list'),
    add: (entry) => ipcRenderer.invoke('history:add', entry),
    remove: (payload) => ipcRenderer.invoke('history:delete', payload),
    clear: () => ipcRenderer.invoke('history:clear'),
  },

  downloads: {
    list: () => ipcRenderer.invoke('downloads:list'),
    open: (id) => ipcRenderer.invoke('downloads:open', id),
    show: (id) => ipcRenderer.invoke('downloads:show', id),
  },

  siteInfo: (url) => ipcRenderer.invoke('site:info', url),
  fetchFeed: (url) => ipcRenderer.invoke('feed:fetch', url),
  diagnostics: (url) => ipcRenderer.invoke('diag:run', url),
  printPage: (id) => ipcRenderer.invoke('print:page', id),
  openDevTools: (id) => ipcRenderer.invoke('devtools:open', id),
  openPath: (target) => ipcRenderer.invoke('shell:open-path', target),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),

  respondPermission: (payload) => ipcRenderer.invoke('permission:respond', payload),
  replyCurrentTab: (payload) => ipcRenderer.send('browser:current-tab:reply', payload),
  on,
});

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ieOptions', {
  get: () => ipcRenderer.invoke('options:get'),
  apply: (sections) => ipcRenderer.invoke('options:apply', sections),
  reset: () => ipcRenderer.invoke('options:reset'),
  resetSection: (section) => ipcRenderer.invoke('options:reset-section', section),
  clearData: (selection) => ipcRenderer.invoke('options:clear-data', selection),
  openControlPanel: () => ipcRenderer.invoke('options:open-control-panel'),
  openCertificates: () => ipcRenderer.invoke('options:open-certificates'),
  openRegistry: () => ipcRenderer.invoke('options:open-registry'),
  openWindowsSetting: (area) => ipcRenderer.invoke('options:open-windows-setting', area),
  testConnection: (url) => ipcRenderer.invoke('options:test-connection', url),
  diagnostics: (url) => ipcRenderer.invoke('options:diagnostics', url),
  setDefaultBrowser: () => ipcRenderer.invoke('options:set-default-browser'),
  chooseDownloadDir: () => ipcRenderer.invoke('options:choose-download-dir'),
  exportConfig: () => ipcRenderer.invoke('options:export'),
  importConfig: () => ipcRenderer.invoke('options:import'),
  addons: () => ipcRenderer.invoke('options:addons'),
  toggleAddon: (payload) => ipcRenderer.invoke('options:toggle-addon', payload),
  currentTab: () => ipcRenderer.invoke('browser:current-tab'),
  close: () => ipcRenderer.invoke('options:close'),
  restart: () => ipcRenderer.invoke('options:restart'),

  onNavigate: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, section) => callback(section);
    ipcRenderer.on('options:navigate', listener);
    return () => ipcRenderer.removeListener('options:navigate', listener);
  },

  onTheme: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('theme:changed', listener);
    return () => ipcRenderer.removeListener('theme:changed', listener);
  },

  onLanguage: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('language:changed', listener);
    return () => ipcRenderer.removeListener('language:changed', listener);
  },
});

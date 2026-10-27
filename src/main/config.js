'use strict';

/**
 * Camada de configuração do IE Neo.
 *
 * A ideia é reproduzir o modelo de "Opções da Internet" do Windows: um único
 * objeto de preferências, dividido nas mesmas sete seções do painel clássico,
 * persistido em disco e espelhado (quando faz sentido) no Registro do Windows.
 */
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const SUPPORTED_LANGUAGES = new Set(['en-US', 'pt-BR']);
const DEFAULT_LANGUAGE = 'en-US';
const DEFAULT_HOME_PAGE = 'ie://newtab';
const DEFAULT_SEARCH_URL = 'https://duckduckgo.com/?q={searchTerms}';
const LEGACY_BING_URL = 'https://www.bing.com/search?q={searchTerms}';

function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.has(value) ? value : DEFAULT_LANGUAGE;
}

function isLegacyMsnHome(value) {
  return /^https?:\/\/(?:www\.)?msn\.com(?:\/|$)/i.test(value || '');
}

const DEFAULTS = {
  schema: 3,
  general: {
    startup: 'home', // home | restore | newtab
    homePage: DEFAULT_HOME_PAGE,
    searchProvider: 'duckduckgo',
    searchUrl: DEFAULT_SEARCH_URL,
    downloadDir: '',
    askDownloadLocation: false,
    reopenLastSession: true,
    showFavoritesBar: true,
    clearHistoryOnExit: false,
    historyDays: 30,
    fontFamily: '',
    fontSize: 100,
    defaultZoom: 100,
    theme: 'system', // light | dark | system
    language: 'en-US', // en-US | pt-BR
    smoothScroll: true,
    useClearType: true,
  },
  zones: {
    internet: { level: 'medium-high', protectedMode: true, sites: [] },
    intranet: { level: 'medium-low', protectedMode: true, sites: [] },
    trusted: { level: 'medium', protectedMode: true, sites: [] },
    restricted: { level: 'high', protectedMode: true, sites: [] },
  },
  privacy: {
    cookieLevel: 'medium-high', // block-all | high | medium-high | medium | low | accept-all
    perSite: [], // { domain, action: 'allow' | 'block' | 'session' }
    popupBlocker: true,
    sendDNT: true,
    geolocation: 'ask',
    camera: 'ask',
    microphone: 'ask',
    notifications: 'ask',
  },
  content: {
    feeds: true,
    autocomplete: { history: true, favorites: true, search: true },
  },
  connections: {
    autoDetect: true,
    proxy: {
      enabled: false,
      server: '',
      bypass: '*.local;10.*;172.16.*;192.168.*',
      autoConfigUrl: '',
    },
  },
  programs: {
    htmlEditor: 'notepad.exe',
    emailClient: 'Padrão do Windows',
    addons: [],
  },
  advanced: {
    showImages: true,
    playAnimations: true,
    playSounds: true,
    enableJavaScript: true,
    showStatusBar: true,
    showInfoBar: true,
    compatView: false,
    compatSites: [],
    suggestUrls: true,
    useHardwareAcceleration: true,
    useSpellcheck: true,
    httpsOnly: false,
    http3: true,
    doh: 'auto', // auto | off | cloudflare | google
    tlsLegacy: false,
    developerTools: true,
    downloadNotifications: true,
    userAgentMode: 'neo', // neo | ie11 | edge | custom
    customUA: '',
  },
  favorites: [
    { id: 'fav-ddg', title: 'DuckDuckGo', url: 'https://duckduckgo.com', folder: 'Barra de Favoritos' },
    { id: 'fav-gh', title: 'GitHub', url: 'https://github.com', folder: 'Barra de Favoritos' },
    { id: 'fav-reddit', title: 'Reddit', url: 'https://www.reddit.com', folder: 'Barra de Favoritos' },
    { id: 'fav-wiki', title: 'Wikipédia', url: 'https://pt.wikipedia.org', folder: 'Barra de Favoritos' },
    { id: 'fav-outlook', title: 'Outlook', url: 'https://outlook.live.com', folder: 'Barra de Favoritos' },
  ],
  history: [],
  downloads: [],
  session: { tabs: [], active: 0 },
  window: { width: 1280, height: 820, x: null, y: null, maximized: false },
  firstRun: true,
  lastVersion: '',
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeKnown(defaults, source) {
  if (!isPlainObject(source)) return structuredClone(defaults);
  const out = {};
  for (const [key, def] of Object.entries(defaults)) {
    if (!(key in source)) {
      out[key] = structuredClone(def);
    } else if (isPlainObject(def)) {
      out[key] = mergeKnown(def, source[key]);
    } else if (Array.isArray(def)) {
      out[key] = Array.isArray(source[key]) ? source[key] : structuredClone(def);
    } else if (typeof source[key] === typeof def) {
      out[key] = source[key];
    } else {
      out[key] = structuredClone(def);
    }
  }
  return out;
}

class ConfigStore {
  constructor() {
    this.dir = app.getPath('userData');
    this.file = path.join(this.dir, 'internet-explorer.json');
    this.data = structuredClone(DEFAULTS);
    this.saveTimer = null;
    this.migrated = false;
    this.load();
  }

  load() {
    let raw = null;
    try {
      raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      raw = null;
    }

    // Perfis da versão 1 nasceram em português; a versão 2 passa a ter o
    // inglês como padrão e ganha a preferência explícita de idioma.
    if (raw && Number(raw.schema) < 2) {
      raw.schema = 2;
      raw.general = { ...(raw.general || {}), language: DEFAULT_LANGUAGE };
      this.migrated = true;
    }

    // A versão 3 troca os padrões do MSN/Bing por IE Neo/DuckDuckGo sem
    // sobrescrever endereços ou mecanismos de busca personalizados.
    if (raw && Number(raw.schema) < 3) {
      const general = { ...(raw.general || {}) };
      if (isLegacyMsnHome(general.homePage)) general.homePage = DEFAULT_HOME_PAGE;
      if (general.searchProvider === 'bing') {
        if (!general.searchUrl || general.searchUrl === LEGACY_BING_URL) {
          general.searchProvider = 'duckduckgo';
          general.searchUrl = DEFAULT_SEARCH_URL;
        } else {
          general.searchProvider = 'custom';
        }
      }
      raw.general = general;
      if (raw.advanced && raw.advanced.userAgentMode === 'ie12') {
        raw.advanced = { ...raw.advanced, userAgentMode: 'neo' };
      }
      raw.schema = 3;
      this.migrated = true;
    }

    this.data = raw ? mergeKnown(DEFAULTS, raw) : structuredClone(DEFAULTS);
    this.data.schema = DEFAULTS.schema;
    this.data.general.language = normalizeLanguage(this.data.general.language);
    if (!Array.isArray(this.data.history)) this.data.history = [];
    if (!Array.isArray(this.data.downloads)) this.data.downloads = [];
    if (this.migrated) this.saveSoon();
  }

  get defaults() {
    return structuredClone(DEFAULTS);
  }

  get() {
    return this.data;
  }

  /** Substitui apenas as seções informadas, preservando o resto. */
  update(partial, { save = true } = {}) {
    if (!isPlainObject(partial)) return this.data;
    const allowed = new Set(['general', 'zones', 'privacy', 'content', 'connections', 'programs', 'advanced']);
    for (const [section, value] of Object.entries(partial)) {
      if (allowed.has(section) && isPlainObject(value)) {
        this.data[section] = mergeKnown(DEFAULTS[section], value);
      } else if (['window', 'session', 'firstRun', 'lastVersion'].includes(section)) {
        this.data[section] = isPlainObject(value) ? { ...this.data[section], ...value } : value;
      }
    }
    this.data.schema = DEFAULTS.schema;
    this.data.general.language = normalizeLanguage(this.data.general.language);
    if (save) this.saveSoon();
    return this.data;
  }

  replace(data) {
    this.data = mergeKnown(DEFAULTS, data);
    this.data.schema = DEFAULTS.schema;
    this.data.general.language = normalizeLanguage(this.data.general.language);
    this.saveSoon();
    return this.data;
  }

  setHistory(history) {
    this.data.history = history.slice(0, 5000);
    this.saveSoon();
  }

  addHistory(entry) {
    const list = this.data.history;
    const last = list[0];
    if (last && last.url === entry.url && Date.now() - last.time < 12000) return;
    list.unshift(entry);
    const days = Math.max(1, Number(this.data.general?.historyDays) || 30);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    this.data.history = list.filter((item) => !item.time || item.time >= cutoff).slice(0, 5000);
    this.saveSoon();
  }

  setFavorites(favorites) {
    this.data.favorites = favorites;
    this.saveSoon();
  }

  setDownloads(downloads) {
    this.data.downloads = downloads.slice(0, 200);
    this.saveSoon();
  }

  saveSoon() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 350);
  }

  saveNow() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (err) {
      console.error('[config] falha ao salvar preferências:', err.message);
    }
  }
}

module.exports = { ConfigStore, DEFAULTS };

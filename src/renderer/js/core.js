'use strict';

/* ============================================================
   IE Neo — núcleo do shell
   ============================================================ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const PALETTE = ['#2b7cb8', '#0f7b6c', '#7a5bb5', '#b25d1f', '#2e8b57', '#9c3b6e', '#4a6fa5', '#8a6d1f'];

/* Rótulos resolvidos na hora do uso para acompanhar a troca de idioma. */
const ZONE_INFO = {
  internet: { id: 'internet', get label() { return t('Internet'); }, icon: 'globe' },
  intranet: { id: 'intranet', get label() { return t('Intranet local'); }, icon: 'building' },
  trusted: { id: 'trusted', get label() { return t('Sites confiáveis'); }, icon: 'shield-check' },
  restricted: { id: 'restricted', get label() { return t('Sites restritos'); }, icon: 'shield-x' },
  internal: { id: 'internal', get label() { return t('Página interna'); }, icon: 'page' },
};

const PERMISSION_LABEL = {
  get geolocation() { return t('saber sua localização'); },
  get notifications() { return t('enviar notificações'); },
  get media() { return t('usar sua câmera e microfone'); },
  get camera() { return t('usar sua câmera'); },
  get microphone() { return t('usar seu microfone'); },
};

const state = {
  config: null,
  meta: null,
  tabs: [],
  activeId: null,
  tabSeq: 0,
  closedTabs: [],
  localHistory: [],
  suggestions: [],
  suggestionIndex: -1,
  hubMode: null,
  hubQuery: '',
  hubData: { history: [], favorites: [], downloads: [] },
  feeds: [],
  activeFeedUrl: null,
  feedCache: new Map(),
  findRequest: 0,
  findResult: null,
  permissionQueue: [],
  activePermission: null,
  shelfId: null,
  shelfItem: null,
  shelfTimer: null,
  saveTimer: null,
  lastUaKey: '',
  resolvedTheme: 'light',
  modal: null,
};

const els = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  Object.assign(els, {
    app: $('#app'),
    titlebar: $('#titlebar'),
    tabstrip: $('#tabstrip'),
    newtabBtn: $('#newtab-btn'),
    address: $('#address'),
    omnibox: $('#omnibox'),
    suggestions: $('#suggestions'),
    views: $('#views'),
    bookmarksbar: $('#bookmarksbar'),
    bookmarksItems: $('#bookmarks-items'),
    bookmarksMore: $('#bookmarks-more'),
    siteInfoBtn: $('#site-info-btn'),
    siteIcon: $('#site-icon'),
    compatBtn: $('#compat-btn'),
    goBtn: $('#go-btn'),
    favoriteBtn: $('#favorite-btn'),
    favoriteIcon: $('#favorite-icon'),
    feedsBtn: $('#feeds-btn'),
    feedDot: $('#feed-dot'),
    menuBtn: $('#menu-btn'),
    btnBack: $('#btn-back'),
    btnForward: $('#btn-forward'),
    btnReload: $('#btn-reload'),
    reloadIcon: $('#reload-icon'),
    btnHome: $('#btn-home'),
    infobar: $('#infobar'),
    infobarIcon: $('#infobar-icon'),
    infobarText: $('#infobar-text'),
    infobarActions: $('#infobar-actions'),
    statusbar: $('#statusbar'),
    statusLink: $('#status-link'),
    statusZone: $('#status-zone'),
    statusZoneLabel: $('#status-zone-label'),
    statusProtected: $('#status-protected'),
    statusZoom: $('#status-zoom'),
    statusProgress: $('#status-progress'),
    content: $('#content'),
    hub: $('#hub'),
    hubIcon: $('#hub-icon'),
    hubHeading: $('#hub-heading'),
    hubSubtitle: $('#hub-subtitle'),
    hubSearch: $('#hub-search'),
    hubPrimary: $('#hub-primary'),
    hubClose: $('#hub-close'),
    hubBody: $('#hub-body'),
    feedsPanel: $('#feeds-panel'),
    feedsClose: $('#feeds-close'),
    feedsBody: $('#feeds-body'),
    feedsSource: $('#feeds-source'),
    findbar: $('#findbar'),
    findInput: $('#find-input'),
    findCount: $('#find-count'),
    findPrev: $('#find-prev'),
    findNext: $('#find-next'),
    findClose: $('#find-close'),
    shelf: $('#downloads-shelf'),
    shelfTitle: $('#shelf-title'),
    shelfSubtitle: $('#shelf-subtitle'),
    shelfProgress: $('#shelf-progress-bar'),
    shelfOpen: $('#shelf-open'),
    shelfShow: $('#shelf-show'),
    shelfMore: $('#shelf-more'),
    shelfClose: $('#shelf-close'),
    toastStack: $('#toast-stack'),
    menuPopover: $('#menu-popover'),
    zoomPopover: $('#zoom-popover'),
    sitePopover: $('#site-popover'),
    modalRoot: $('#modal-root'),
    wcMin: $('#wc-min'),
    wcMax: $('#wc-max'),
    wcClose: $('#wc-close'),
  });

  bindWindowControls();
  bindStaticEvents();

  let startup = null;
  try {
    startup = await window.ie.startup();
    state.config = startup.config;
    window.IETheme?.apply(state.config.general?.theme);
    window.IETheme?.applyResolved(startup.theme);
    state.resolvedTheme = startup.theme === 'dark' ? 'dark' : 'light';
    state.meta = startup.meta;
    state.lastUaKey = uaKey(state.config);
    state.localHistory = (await window.ie.history.list().catch(() => [])).slice(0, 500);
  } catch (err) {
    console.error('[IE] falha ao iniciar:', err);
    return;
  }

  bindIpc();
  if (typeof bindPanelEvents === 'function') bindPanelEvents();

  applyChromeConfig();
  renderBookmarks();
  updateMaxIcon(false);

  const startupTabs = startup.tabs;
  const list = Array.isArray(startupTabs) && startupTabs.length ? startupTabs : [{ url: 'ie://newtab' }];
  const activeIndex = Math.min(Math.max(Number(startup.active) || 0, 0), list.length - 1);
  list.forEach((entry) => {
    const url = typeof entry === 'string' ? entry : entry.url || 'ie://newtab';
    createTab({
      url: isInternalPageUrl(url) ? 'ie://newtab' : url,
      title: typeof entry === 'string' ? t('Nova guia') : entry.title,
      activate: false,
    });
  });
  activateTab(state.tabs[activeIndex]?.id || state.tabs[0]?.id, { focus: false });
  updateAllUI();
  window.ie.window.isMaximized().then(updateMaxIcon).catch(() => {});

  if (state.config.general.startup === 'newtab' || activeTab()?.url === 'ie://newtab') {
    setTimeout(() => els.address.focus(), 120);
  }
}

function activeTab() {
  return state.tabs.find((tab) => tab.id === state.activeId) || null;
}

function findTab(id) {
  return state.tabs.find((tab) => tab.id === id) || null;
}

function isActive(tab) {
  return Boolean(tab) && tab.id === state.activeId;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

const escapeAttr = escapeHtml;

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isPrivateHost(host) {
  if (!host) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local')) return true;
  if (!host.includes('.')) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return true;
  if (host === '::1' || host === '[::1]') return true;
  return false;
}

function matchesHost(host, pattern) {
  const clean = String(pattern || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  if (!host || !clean) return false;
  const escaped = clean.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`(^|\\.)${escaped}$`, 'i').test(host) || new RegExp(`^${escaped}$`, 'i').test(host);
}

function classifyUrl(url) {
  if (!/^https?:/i.test(url || '')) return { ...ZONE_INFO.internal, host: '', level: '', protectedMode: true };
  const host = hostOf(url);
  const zones = state.config?.zones || {};
  let id = 'internet';
  if ((zones.restricted?.sites || []).some((site) => matchesHost(host, site))) id = 'restricted';
  else if ((zones.trusted?.sites || []).some((site) => matchesHost(host, site))) id = 'trusted';
  else if (isPrivateHost(host)) id = 'intranet';
  const zone = zones[id] || {};
  return {
    ...ZONE_INFO[id],
    host,
    level: zone.level || 'medium-high',
    protectedMode: zone.protectedMode !== false,
  };
}

function colorFor(seed) {
  let hash = 0;
  const text = String(seed || '');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function letterFor(title, url) {
  const base = (title || hostOf(url) || '?').trim();
  return base.charAt(0).toUpperCase();
}

function uaKey(config) {
  return config ? `${config.advanced.userAgentMode}|${config.advanced.customUA}` : '';
}

function uaForTab(tab) {
  if (!state.config || !state.meta) return undefined;
  if (tab.compat) return state.meta.userAgents.ie11;
  const mode = state.config.advanced.userAgentMode;
  if (mode === 'custom' && state.config.advanced.customUA) return state.config.advanced.customUA;
  return state.meta.userAgents[mode] || state.meta.userAgents.neo;
}

/* ------------------------------------------------------------------ */
/* Guias                                                               */
/* ------------------------------------------------------------------ */

function createTab({ url = 'ie://newtab', title = '', private: isPrivate = false, activate = true, background = false } = {}) {
  if (isInternalPageUrl(url)) {
    handleInternalUrl(url);
    return null;
  }
  const tab = {
    id: `tab-${(state.tabSeq += 1)}`,
    url,
    title: title || (url === 'ie://newtab' ? t('Nova guia') : hostOf(url) || t('Nova guia')),
    private: Boolean(isPrivate),
    loading: false,
    favicon: null,
    feeds: [],
    zoom: (Number(state.config?.general.defaultZoom) || 100) / 100,
    compat: false,
    error: null,
    restricted: null,
    allowedRestricted: new Set(),
    findRequestId: null,
  };
  const host = hostOf(url);
  tab.compat = Boolean(
    state.config?.advanced.compatView ||
      (state.config?.advanced.compatSites || []).some((site) => matchesHost(host, site))
  );

  const viewEl = document.createElement('div');
  viewEl.className = 'view';
  viewEl.hidden = true;

  const webview = document.createElement('webview');
  webview.setAttribute('partition', tab.private ? 'ie-inprivate' : 'persist:ie');
  webview.setAttribute('allowpopups', '');
  const userAgent = uaForTab(tab);
  if (userAgent) webview.setAttribute('useragent', userAgent);
  if (!state.config?.advanced.enableJavaScript) {
    webview.setAttribute('webpreferences', 'javascript=no');
  }

  const overlay = document.createElement('div');
  overlay.className = 'page-overlay';
  overlay.hidden = true;

  viewEl.appendChild(webview);
  viewEl.appendChild(overlay);
  els.views.appendChild(viewEl);

  tab.element = viewEl;
  tab.webview = webview;
  tab.overlay = overlay;

  attachWebviewEvents(tab);
  state.tabs.push(tab);
  webview.setAttribute('src', url);

  if (activate) activateTab(tab.id);
  else {
    renderTabs();
    saveSessionSoon();
    updateAllUI();
  }
  return tab;
}

function attachWebviewEvents(tab) {
  const wv = tab.webview;
  const on = (name, handler) => {
    wv.addEventListener(name, (event) => {
      try {
        handler(event);
      } catch (err) {
        console.error(`[IE] erro em ${name}:`, err);
      }
    });
  };

  on('dom-ready', () => {
    injectPagePrefs(tab);
    applyNewTabThemeTo(tab);
    applyAudioPreference(tab);
    try {
      wv.setZoomFactor(tab.zoom);
    } catch {
      /* zoom indisponível */
    }
    if (typeof hideOverlay === 'function' && !tab.error && !tab.restricted) hideOverlay(tab);
    detectFeeds(tab);
    ensureCompatView(tab);
  });

  on('did-start-loading', () => {
    tab.loading = true;
    updateLoadingUI(tab);
    renderTabs();
    saveSessionSoon();
  });

  on('did-stop-loading', () => {
    tab.loading = false;
    updateLoadingUI(tab);
    renderTabs();
    updateNavButtons();
    saveSessionSoon();
  });

  on('did-start-navigation', (event) => {
    if (!event.isMainFrame || event.isSameDocument) return;
    // Rotas ie:// são interceptadas pelo processo principal e abrem painéis;
    // não devem alterar a URL real da guia.
    if (isInternalPageUrl(event.url)) return;
    tab.url = event.url;
    tab.error = null;
    tab.restricted = null;
    if (/^https?:/i.test(event.url)) {
      const zone = classifyUrl(event.url);
      if (zone.id === 'restricted' && !tab.allowedRestricted.has(zone.host)) {
        // O evento will-navigate da webview não é cancelável; interromper o
        // carregamento aqui mantém o Modo Protegido eficaz em links da página.
        try {
          tab.webview.stop();
        } catch {}
        showRestricted(tab, event.url);
        if (isActive(tab)) {
          syncAddress(true);
          updateSiteUI();
        }
        return;
      }
    }
    hideOverlay(tab);
    if (isActive(tab)) {
      syncAddress(true);
      updateSiteUI();
    }
  });

  on('did-navigate', (event) => {
    tab.url = event.url;
    if (tab.restricted && tab.restricted.url === event.url) {
      if (isActive(tab)) {
        syncAddress(true);
        updateSiteUI();
      }
      return;
    }
    tab.error = null;
    tab.restricted = null;
    hideOverlay(tab);
    if (isActive(tab)) {
      syncAddress(true);
      updateSiteUI();
      updateFeedIndicator();
    }
    rememberVisit(tab);
    renderTabs();
    saveSessionSoon();
    updateNavButtons();
  });

  on('did-navigate-in-page', (event) => {
    if (!event.isMainFrame) return;
    tab.url = event.url;
    if (isActive(tab)) {
      syncAddress(true);
      updateSiteUI();
    }
    saveSessionSoon();
  });

  on('page-title-updated', (event) => {
    if (event.title) tab.title = event.title;
    renderTabs();
    saveSessionSoon();
  });

  on('page-favicon-updated', (event) => {
    tab.favicon = (event.favicons || [])[0] || null;
    renderTabs();
  });

  on('did-fail-load', (event) => {
    if (!event.isMainFrame) return;
    if (event.errorCode === -3) return;
    if (String(event.validatedURL || '').startsWith('ie://')) return;
    showError(tab, {
      url: event.validatedURL || tab.url,
      code: event.errorCode,
      description: event.errorDescription || t('Falha de rede'),
    });
  });

  on('render-process-gone', () => {
    showError(tab, {
      url: tab.url,
      code: 'CRASH',
      description: t('O processo da página foi encerrado inesperadamente.'),
    });
  });

  on('update-target-url', (event) => {
    if (isActive(tab)) els.statusLink.textContent = event.url || '';
  });

  on('found-in-page', (event) => {
    handleFoundInPage(tab, event);
  });

  on('context-menu', (event) => {
    if (typeof showContextMenu === 'function') showContextMenu(tab, event);
  });
}

function renderTabs() {
  if (!els.tabstrip) return;
  els.tabstrip.innerHTML = state.tabs
    .map((tab) => {
      const active = tab.id === state.activeId;
      // A nova guia tem título próprio por idioma; não reaproveita o texto
      // antigo guardado na aba ao trocar de idioma sem recarregar.
      const title =
        /^ie:\/\/newtab\/?$/i.test(tab.url)
          ? t('Nova guia')
          : tab.title || hostOf(tab.url) || t('Nova guia');
      return `<div class="tab${active ? ' active' : ''}${tab.private ? ' private' : ''}" data-tab-id="${tab.id}" role="tab" aria-selected="${active}" title="${escapeAttr(title)}">
        <span class="tab-favicon">${faviconMarkup(tab)}</span>
        <span class="tab-title">${escapeHtml(title)}</span>
        <button class="tab-close" data-close-tab="${tab.id}" aria-label="${escapeAttr(t('Fechar guia'))}" tabindex="-1">
          <svg><use href="#i-close" /></svg>
        </button>
      </div>`;
    })
    .join('');

  $$('#tabstrip img').forEach((img) => {
    img.addEventListener('error', () => {
      const id = img.closest('.tab')?.dataset.tabId;
      const tab = findTab(id);
      if (tab) tab.favicon = null;
      renderTabs();
    });
  });

  const activeEl = els.tabstrip.querySelector('.tab.active');
  if (activeEl) activeEl.scrollIntoView({ inline: 'nearest', block: 'nearest' });
}

function faviconMarkup(tab) {
  if (tab.loading) return '<span class="tab-spinner"></span>';
  if (tab.favicon && /^(https?:|data:image)/i.test(tab.favicon)) {
    return `<img src="${escapeAttr(tab.favicon)}" alt="" referrerpolicy="no-referrer" />`;
  }
  if (tab.private) return '<svg><use href="#i-inprivate" /></svg>';
  return `<span class="letter" style="background:${colorFor(tab.url)}">${escapeHtml(letterFor(tab.title, tab.url))}</span>`;
}

function activateTab(id, { focus = true } = {}) {
  const tab = findTab(id);
  if (!tab) return;
  if (state.activeId !== id) {
    state.activeId = id;
    state.tabs.forEach((entry) => {
      entry.element.hidden = entry.id !== id;
    });
    renderTabs();
    syncAddress(true);
    updateSiteUI();
    updateNavButtons();
    updateLoadingUI(tab);
    updateFeedIndicator();
    if (typeof closeAllPopovers === 'function') closeAllPopovers();
    if (state.hubMode && typeof closeHub === 'function') closeHub({ silent: true });
    if (typeof closeFeedsPanel === 'function' && !els.feedsPanel.hidden) closeFeedsPanel();
  }
  if (focus) {
    try {
      tab.webview.focus();
    } catch {
      /* webview ainda carregando */
    }
  }
  saveSessionSoon();
}

function closeTab(id) {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  const tab = state.tabs[index];
  state.closedTabs.unshift({
    url: tab.error?.url || tab.url,
    title: tab.title,
    private: tab.private,
  });
  state.closedTabs = state.closedTabs.slice(0, 15);
  try {
    tab.webview.stop();
    tab.element.remove();
  } catch {
    /* já removida */
  }
  state.tabs.splice(index, 1);
  if (!state.tabs.length) {
    window.ie.window.close();
    return;
  }
  if (state.activeId === id) {
    const next = state.tabs[Math.min(index, state.tabs.length - 1)];
    state.activeId = null;
    activateTab(next.id);
  } else {
    renderTabs();
    saveSessionSoon();
  }
}

function reopenClosedTab() {
  const entry = state.closedTabs.shift();
  if (!entry) {
    toast({ title: t('Nenhuma guia fechada'), body: t('Não há guias recentes para reabrir.') });
    return;
  }
  createTab({ url: entry.url, title: entry.title, private: entry.private, activate: true });
}

function cycleTab(direction) {
  if (state.tabs.length < 2) return;
  const index = state.tabs.findIndex((tab) => tab.id === state.activeId);
  const next = (index + direction + state.tabs.length) % state.tabs.length;
  activateTab(state.tabs[next].id);
}

function saveSessionSoon() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    if (!state.config) return;
    const visible = state.tabs.filter((tab) => !tab.private);
    const entries = visible.map((tab) => ({
      url: tab.error?.url || tab.url || 'ie://newtab',
      title: tab.title || '',
    }));
    let active = visible.findIndex((tab) => tab.id === state.activeId);
    if (active < 0) active = 0;
    window.ie.saveSession({ tabs: entries.length ? entries : [{ url: 'ie://newtab', title: t('Nova guia') }], active }).catch(() => {});
  }, 350);
}

/* ------------------------------------------------------------------ */
/* Navegação                                                           */
/* ------------------------------------------------------------------ */

function displayUrl(url) {
  return /^ie:\/\/newtab(?:[/?#].*)?$/i.test(url || '') ? '' : url;
}

function normalizeInput(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^(ie|https?|about|view-source):/i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(value)) return `http://${value}`;
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(value)) return `http://${value}`;
  if (/^[a-z0-9-]+\.local(:\d+)?(\/|$)/i.test(value)) return `http://${value}`;
  if (!/\s/.test(value) && /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(value)) return `https://${value}`;
  return searchUrl(value);
}

function searchUrl(query) {
  const template = state.config?.general.searchUrl || 'https://duckduckgo.com/?q={searchTerms}';
  if (template.includes('{searchTerms}')) return template.replace(/\{searchTerms\}/g, encodeURIComponent(query));
  return `${template}${encodeURIComponent(query)}`;
}

function isInternalPageUrl(url) {
  return /^ie:\/\//i.test(url || '') && !/^ie:\/\/newtab(?:[/?#]|$)/i.test(url || '');
}

function navigateTab(tab, url) {
  if (!tab || !url) return;
  if (isInternalPageUrl(url)) {
    handleInternalUrl(url);
    return;
  }
  const zone = classifyUrl(url);
  if (/^https?:/i.test(url) && zone.id === 'restricted' && !tab.allowedRestricted.has(zone.host)) {
    showRestricted(tab, url);
    return;
  }
  tab.error = null;
  tab.restricted = null;
  hideOverlay(tab);
  tab.url = url;
  if (url === 'ie://newtab') tab.title = t('Nova guia');
  else tab.title = tab.title && tab.url === url ? tab.title : hostOf(url) || tab.title;
  tab.loading = true;
  if (isActive(tab)) {
    syncAddress(true);
    updateSiteUI();
    updateLoadingUI(tab);
  }
  renderTabs();
  try {
    tab.webview.loadURL(url);
  } catch (err) {
    showError(tab, { url, code: 'LOAD', description: err.message });
    return;
  }
  try {
    tab.webview.focus();
  } catch {}
  saveSessionSoon();
}

function navigateActive(raw, options = {}) {
  const url = normalizeInput(raw);
  if (!url) return;
  if (options.newTab) {
    createTab({ url, activate: !options.background });
    return;
  }
  const tab = activeTab();
  if (tab) navigateTab(tab, url);
}

function handleInternalUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return;
  }
  const route = url.hostname.toLowerCase();
  if (route === 'settings') {
    window.ie.openOptions(url.searchParams.get('section') || 'general');
    return;
  }
  if (['history', 'favorites', 'downloads'].includes(route) && typeof openHub === 'function') {
    openHub(route);
    return;
  }
  if (route === 'about' && typeof showAboutModal === 'function') {
    showAboutModal();
    return;
  }
  if (route === 'feeds' && typeof openFeedsPanel === 'function') {
    openFeedsPanel();
    return;
  }
  if (route === 'newtab') {
    const tab = activeTab();
    if (tab) navigateTab(tab, 'ie://newtab');
  }
}

function ensureCompatView(tab) {
  if (!state.config || !/^https?:/i.test(tab.url)) return;
  const host = hostOf(tab.url);
  const should =
    state.config.advanced.compatView ||
    (state.config.advanced.compatSites || []).some((site) => matchesHost(host, site));
  if (should && !tab.compat) {
    tab.compat = true;
    try {
      tab.webview.setUserAgent(state.meta.userAgents.ie11);
    } catch {}
    updateSiteUI();
    setTimeout(() => {
      if (hostOf(tab.url) === host) {
        try {
          tab.webview.reload();
        } catch {}
      }
    }, 250);
  }
}

function toggleCompatView() {
  const tab = activeTab();
  if (!tab || !/^https?:/i.test(tab.url)) {
    toast({ title: t('Modo de Compatibilidade'), body: t('Abra um site para ativar este modo.') });
    return;
  }
  const host = hostOf(tab.url);
  if (!host) return;
  tab.compat = !tab.compat;
  try {
    tab.webview.setUserAgent(uaForTab(tab));
    tab.webview.reload();
  } catch {}
  window.ie.toggleCompat({ host, enabled: tab.compat }).catch(() => {});
  updateSiteUI();
  toast({
    title: tab.compat ? t('Modo de Compatibilidade ativado') : t('Modo de Compatibilidade desativado'),
    body: tab.compat
      ? t('{host} agora é renderizado com o identificador do Internet Explorer 11.', { host })
      : t('{host} voltou a usar o mecanismo moderno do Chromium.', { host }),
    kind: 'success',
  });
}

/* ------------------------------------------------------------------ */
/* Barra de endereços                                                  */
/* ------------------------------------------------------------------ */

function syncAddress(force = false) {
  if (!els.address) return;
  if (!force && document.activeElement === els.address) return;
  const tab = activeTab();
  els.address.value = tab ? displayUrl(tab.url) : '';
}

function buildSuggestions(query) {
  const q = String(query || '').trim().toLowerCase();
  const items = [];
  if (state.config?.advanced?.suggestUrls === false) return items;
  const auto = state.config?.content?.autocomplete || {};
  if (q && auto.search !== false) {
    items.push({ type: 'search', title: query.trim(), url: searchUrl(query.trim()) });
  }

  const favorites = (auto.favorites === false ? [] : state.config?.favorites || [])
    .filter((fav) => !q || `${fav.title} ${fav.url}`.toLowerCase().includes(q))
    .slice(0, 4)
    .map((fav) => ({ type: 'favorite', title: fav.title, url: fav.url }));
  const history = (auto.history === false ? [] : state.localHistory)
    .filter((entry) => !q || `${entry.title || ''} ${entry.url}`.toLowerCase().includes(q))
    .slice(0, 8)
    .map((entry) => ({ type: 'history', title: entry.title || hostOf(entry.url), url: entry.url }));

  const seen = new Set();
  for (const item of [...favorites, ...history]) {
    const key = item.url;
    if (seen.has(key) || item.type === 'search') continue;
    seen.add(key);
    items.push(item);
    if (items.length >= 8) break;
  }
  return items;
}

function showSuggestions(query) {
  if (!String(query || '').trim()) {
    hideSuggestions();
    return;
  }
  state.suggestions = buildSuggestions(query);
  state.suggestionIndex = -1;
  renderSuggestions();
}

function renderSuggestions() {
  if (!state.suggestions.length) {
    els.suggestions.hidden = true;
    return;
  }
  els.suggestions.innerHTML = state.suggestions
    .map((item, index) => {
      if (item.type === 'search') {
        return `<div class="suggestion search${index === state.suggestionIndex ? ' selected' : ''}" data-suggestion="${index}">
          <svg><use href="#i-search" /></svg>
          <div class="suggestion-main">
            <span class="suggestion-title">${escapeHtml(t('Pesquisar por'))} <strong>${escapeHtml(item.title)}</strong></span>
            <span class="suggestion-url">${escapeHtml(hostOf(item.url) || 'DuckDuckGo')}</span>
          </div>
          <span class="suggestion-hint">${escapeHtml(t('Pesquisa'))}</span>
        </div>`;
      }
      const icon = item.type === 'favorite' ? 'i-star-fill' : 'i-history';
      return `<div class="suggestion${index === state.suggestionIndex ? ' selected' : ''}" data-suggestion="${index}">
        <svg><use href="#${icon}" /></svg>
        <div class="suggestion-main">
          <span class="suggestion-title">${escapeHtml(item.title)}</span>
          <span class="suggestion-url">${escapeHtml(item.url)}</span>
        </div>
        <span class="suggestion-hint">${escapeHtml(item.type === 'favorite' ? t('Favorito') : t('Histórico'))}</span>
      </div>`;
    })
    .join('');
  els.suggestions.hidden = false;
}

function hideSuggestions() {
  els.suggestions.hidden = true;
  state.suggestions = [];
  state.suggestionIndex = -1;
}

function applySuggestion(index, { newTab = false } = {}) {
  const item = state.suggestions[index];
  if (!item) return;
  hideSuggestions();
  if (newTab) createTab({ url: item.url, activate: true });
  else navigateActive(item.url);
}

function moveSuggestion(delta) {
  if (!state.suggestions.length) return;
  const total = state.suggestions.length;
  state.suggestionIndex = (state.suggestionIndex + delta + total) % total;
  renderSuggestions();
  const selected = els.suggestions.querySelector('.suggestion.selected');
  if (selected) selected.scrollIntoView({ block: 'nearest' });
}

/* ------------------------------------------------------------------ */
/* Status, zona e aparência                                            */
/* ------------------------------------------------------------------ */

function updateSiteUI() {
  const tab = activeTab();
  if (!tab) return;
  const zone = classifyUrl(tab.url);
  els.statusZoneLabel.textContent = zone.label;
  els.statusZone.className = `status-item status-zone status-clickable zone-${zone.id}`;
  els.statusZone.querySelector('use')?.setAttribute('href', `#i-${zone.icon}`);
  els.statusZone.title = t('Zona de segurança: {zone} — nível {level}', { zone: zone.label, level: zone.level || '—' });

  const protectedMode = zone.id !== 'internal' ? zone.protectedMode : true;
  els.statusProtected.classList.toggle('on', protectedMode);
  els.statusProtected.classList.toggle('off', !protectedMode);
  els.statusProtected.querySelector('span').textContent = t('Modo Protegido: {state}', {
    state: protectedMode ? t('Ativado') : t('Desativado'),
  });
  els.statusProtected.querySelector('use')?.setAttribute('href', protectedMode ? '#i-shield-check' : '#i-shield-x');

  let icon = 'i-page';
  let cls = '';
  if (/^https:/i.test(tab.url)) {
    icon = 'i-lock';
    cls = 'secure';
  } else if (/^http:/i.test(tab.url)) {
    icon = 'i-warning';
    cls = 'insecure';
  }
  if (zone.id === 'restricted') {
    icon = 'i-shield-x';
    cls = 'restricted';
  }
  els.siteIcon.setAttribute('href', `#${icon}`);
  els.siteInfoBtn.className = `site-badge ${cls}`;
  els.siteInfoBtn.title = zone.id === 'internal' ? t('Página interna') : `${zone.label} — ${zone.level || ''}`;

  els.compatBtn.classList.toggle('active', Boolean(tab.compat));
  els.compatBtn.title = tab.compat
    ? t('Modo de Compatibilidade ativado — clique para desativar')
    : t('Modo de Exibição de Compatibilidade');

  const favorited = (state.config?.favorites || []).some((fav) => fav.url === tab.url);
  els.favoriteIcon.setAttribute('href', favorited ? '#i-star-fill' : '#i-star');
  els.favoriteBtn.classList.toggle('favorited', favorited);
  els.favoriteBtn.title = favorited ? t('Remover dos favoritos') : t('Adicionar aos favoritos (Ctrl+D)');

  document.body.classList.toggle('inprivate', Boolean(tab.private));
  els.statusZoom.textContent = `${Math.round((tab.zoom || 1) * 100)}%`;
}

function updateNavButtons() {
  const tab = activeTab();
  let back = false;
  let forward = false;
  try {
    back = Boolean(tab?.webview.canGoBack());
    forward = Boolean(tab?.webview.canGoForward());
  } catch {
    back = false;
    forward = false;
  }
  els.btnBack.disabled = !back;
  els.btnForward.disabled = !forward;
}

function updateLoadingUI(tab) {
  if (!isActive(tab)) return;
  els.statusProgress.hidden = !tab.loading;
  els.reloadIcon.setAttribute('href', tab.loading ? '#i-stop' : '#i-reload');
  els.btnReload.title = tab.loading ? t('Parar (Esc)') : t('Atualizar (F5)');
  els.statusbar.style.setProperty('--load-progress', tab.loading ? '35%' : '100%');
  if (!tab.loading) {
    setTimeout(() => {
      if (!activeTab()?.loading) els.statusbar.style.setProperty('--load-progress', '0%');
    }, 420);
  }
}

function updateAllUI() {
  syncAddress(true);
  updateSiteUI();
  updateNavButtons();
  const tab = activeTab();
  if (tab) updateLoadingUI(tab);
  updateFeedIndicator();
  updateMaxIcon(false);
}

function applyChromeConfig() {
  if (!state.config) return;
  els.bookmarksbar.hidden = !state.config.general.showFavoritesBar;
  els.statusbar.hidden = !state.config.advanced.showStatusBar;
  if (!state.config.advanced.showInfoBar && !els.infobar.hidden) els.infobar.hidden = true;
  renderBookmarks();
  state.tabs.forEach((tab) => {
    applyAudioPreference(tab);
    injectPagePrefs(tab);
  });
  if (activeTab()) updateSiteUI();
}

function applyAudioPreference(tab) {
  try {
    tab.webview.setAudioMuted(!state.config.advanced.playSounds);
  } catch {}
}

function injectPagePrefs(tab) {
  if (!state.config) return;
  const font = String(state.config.general.fontFamily || '').replace(/[;"{}<>\\]/g, '').trim();
  const size = Math.min(200, Math.max(50, Number(state.config.general.fontSize) || 100));
  const images = Boolean(state.config.advanced.showImages);
  const animations = Boolean(state.config.advanced.playAnimations);
  let css = '';
  if (font) css += `html,body,body *{font-family:${JSON.stringify(font)} !important;}`;
  if (size !== 100) css += `html{font-size:${size}% !important;}`;
  if (!images) css += 'img,picture,video{visibility:hidden !important;}';
  if (!animations) css += '*,*::before,*::after{animation:none !important;transition:none !important;scroll-behavior:auto !important;}';
  const script = `(function(){try{
    var id='__ieneo_page_prefs';
    var old=document.getElementById(id);
    if(old) old.remove();
    var css=${JSON.stringify(css)};
    if(css){var s=document.createElement('style');s.id=id;s.textContent=css;(document.head||document.documentElement).appendChild(s);}
  }catch(e){}})();`;
  tab.webview
    .executeJavaScript(script, false)
    .catch(() => {});
}

function setZoom(factor) {
  const tab = activeTab();
  if (!tab) return;
  const zoom = Math.min(5, Math.max(0.25, factor));
  tab.zoom = zoom;
  try {
    tab.webview.setZoomFactor(zoom);
  } catch {}
  els.statusZoom.textContent = `${Math.round(zoom * 100)}%`;
}

function zoomStep(delta) {
  const tab = activeTab();
  if (!tab) return;
  const steps = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
  const current = tab.zoom || 1;
  const next =
    delta > 0
      ? steps.find((step) => step > current + 0.001)
      : [...steps].reverse().find((step) => step < current - 0.001);
  setZoom(next || (delta > 0 ? 5 : 0.25));
}

/* ------------------------------------------------------------------ */
/* Histórico local e favoritos                                         */
/* ------------------------------------------------------------------ */

function rememberVisit(tab) {
  if (tab.private || !/^https?:/i.test(tab.url)) return;
  const url = tab.url;
  const title = tab.title || hostOf(url);
  const existing = state.localHistory.find((entry) => entry.url === url);
  const now = Date.now();
  if (existing) {
    existing.time = now;
    existing.title = title;
    state.localHistory = [existing, ...state.localHistory.filter((entry) => entry.url !== url)];
  } else {
    state.localHistory.unshift({ url, title, time: now });
    if (state.localHistory.length > 500) state.localHistory.length = 500;
  }
  setTimeout(() => {
    if (tab.url === url) window.ie.history.add({ url, title: tab.title || title }).catch(() => {});
  }, 700);
}

function bookmarkIconMarkup(fav) {
  return `<span class="favicon" style="background:${colorFor(fav.url)}">${escapeHtml(letterFor(fav.title, fav.url))}</span>`;
}

function renderBookmarks() {
  if (!els.bookmarksItems || !state.config) return;
  const favorites = state.config.favorites || [];
  els.bookmarksItems.innerHTML = favorites
    .slice(0, 18)
    .map(
      (fav) => `<button class="bookmark" data-bookmark-url="${escapeAttr(fav.url)}" title="${escapeAttr(fav.title)} — ${escapeAttr(fav.url)}">
        ${bookmarkIconMarkup(fav)}
        <span>${escapeHtml(fav.title)}</span>
      </button>`
    )
    .join('');
  els.bookmarksItems.querySelectorAll('[data-bookmark-url]').forEach((button) => {
    button.addEventListener('click', () => navigateActive(button.dataset.bookmarkUrl));
    button.addEventListener('auxclick', (event) => {
      if (event.button === 1) {
        event.preventDefault();
        createTab({ url: button.dataset.bookmarkUrl, activate: false });
      }
    });
  });
}

function toggleFavorite() {
  const tab = activeTab();
  if (!tab || !/^https?:/i.test(tab.url)) {
    toast({ title: t('Não é possível favoritar esta página'), body: t('Abra um site http ou https primeiro.') });
    return;
  }
  const existing = (state.config.favorites || []).find((fav) => fav.url === tab.url);
  if (existing) {
    window.ie.favorites.remove(existing.id).catch(() => {});
    state.config.favorites = state.config.favorites.filter((fav) => fav.id !== existing.id);
    renderBookmarks();
    updateSiteUI();
    toast({ title: t('Removido dos favoritos'), body: tab.title });
    return;
  }
  if (typeof showAddFavoriteModal === 'function') {
    showAddFavoriteModal(tab);
  }
}

/* ------------------------------------------------------------------ */
/* Feeds                                                               */
/* ------------------------------------------------------------------ */

async function detectFeeds(tab) {
  if (!state.config?.content.feeds) {
    tab.feeds = [];
    updateFeedIndicator();
    return;
  }
  let feeds = [];
  try {
    const script = `(function(){
      try{
        var links = Array.prototype.slice.call(document.querySelectorAll('link[rel~="alternate"]'));
        return links.filter(function(l){return /rss|atom|xml/i.test(l.type||'') && /^https?:/i.test(l.href);})
          .slice(0,6)
          .map(function(l){return {title:(l.title||document.title||'Feed'),href:l.href,type:l.type||''};});
      }catch(e){return [];}
    })();`;
    const result = await tab.webview.executeJavaScript(script, false);
    if (Array.isArray(result)) feeds = result;
  } catch {
    feeds = [];
  }
  if (!feeds.length && /(\.xml|\.rss|\/feed\/?$|\/atom\/?$)/i.test(tab.url)) {
    feeds = [{ title: tab.title || t('Feed da página'), href: tab.url, type: 'application/rss+xml' }];
  }
  tab.feeds = feeds;
  updateFeedIndicator();
  if (!els.feedsPanel.hidden && isActive(tab)) renderFeedSources();
}

function updateFeedIndicator() {
  const tab = activeTab();
  const count = tab?.feeds?.length || 0;
  els.feedDot.hidden = count === 0;
  els.feedsBtn.title = count ? t('Feeds disponíveis ({count})', { count }) : t('Feeds');
}

/* ------------------------------------------------------------------ */
/* Localizar na página                                                 */
/* ------------------------------------------------------------------ */

function openFind() {
  const tab = activeTab();
  if (!tab) return;
  els.findbar.hidden = false;
  els.findInput.focus();
  els.findInput.select();
  if (els.findInput.value) runFind(true);
}

function closeFind() {
  const tab = activeTab();
  if (tab) {
    try {
      tab.webview.stopFindInPage('clearSelection');
    } catch {}
  }
  els.findbar.hidden = true;
  state.findResult = null;
  renderFindCount();
}

/** Escreve o contador de ocorrências no idioma atual. */
function renderFindCount() {
  const matches = state.findResult?.matches || 0;
  const current = state.findResult?.activeMatchOrdinal || 0;
  els.findCount.textContent = matches ? t('{current} de {total}', { current, total: matches }) : t('0 de 0');
}

function runFind(forward = true) {
  const tab = activeTab();
  if (!tab) return;
  const query = els.findInput.value;
  if (!query) {
    state.findResult = null;
    renderFindCount();
    try {
      tab.webview.stopFindInPage('clearSelection');
    } catch {}
    return;
  }
  try {
    tab.findRequestId = tab.webview.findInPage(query, { forward, findNext: true });
  } catch {}
}

function handleFoundInPage(tab, event) {
  if (!isActive(tab) || !event.result) return;
  const { matches = 0, activeMatchOrdinal = 0 } = event.result;
  state.findResult = { matches, activeMatchOrdinal };
  renderFindCount();
}

/* ------------------------------------------------------------------ */
/* Páginas de erro e sites restritos                                   */
/* ------------------------------------------------------------------ */

function hideOverlay(tab) {
  if (!tab?.overlay) return;
  tab.overlay.hidden = true;
  tab.overlay.className = 'page-overlay';
  tab.overlay.innerHTML = '';
}

function showError(tab, info) {
  tab.error = info;
  tab.loading = false;
  renderTabs();
  updateLoadingUI(tab);
  const overlay = tab.overlay;
  overlay.hidden = false;
  overlay.className = 'page-overlay error-overlay';
  const description = escapeHtml(info.description || t('Falha de rede'));
  const code = String(info.code || '');
  overlay.innerHTML = `<div class="error-page">
    <div class="error-art">
      <svg viewBox="0 0 120 90" aria-hidden="true">
        <rect x="18" y="13" width="84" height="62" rx="5" fill="#fff" stroke="#b9c9d7" stroke-width="2"/>
        <path d="M18 27h84" stroke="#dbe5ee" stroke-width="2"/>
        <circle cx="27" cy="20" r="2.2" fill="#c7d5e2"/><circle cx="35" cy="20" r="2.2" fill="#c7d5e2"/><circle cx="43" cy="20" r="2.2" fill="#c7d5e2"/>
        <circle cx="60" cy="49" r="15" fill="none" stroke="#d9534f" stroke-width="2.4"/>
        <path d="M60 41v10" stroke="#d9534f" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="60" cy="56.5" r="1.6" fill="#d9534f"/>
        <path d="M37 65l8-9 7 6 9-12 8 9 6-5 8 11" fill="none" stroke="#e2eaf2" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h1>${escapeHtml(t('Esta página não pode ser exibida'))}</h1>
    <p class="error-lead">${escapeHtml(t('O IE Neo encontrou um problema ao carregar'))} <b>${escapeHtml(info.url || tab.url)}</b>.</p>
    <div class="error-meta">
      <span>${description}</span>
      ${code ? `<span class="error-code">${escapeHtml(t('Código: {code}', { code }))}</span>` : ''}
    </div>
    <div class="error-actions">
      <button class="btn primary" data-ov="retry">${escapeHtml(t('Atualizar página'))}</button>
      <button class="btn" data-ov="diag">${escapeHtml(t('Diagnosticar problemas de conexão'))}</button>
      <button class="btn" data-ov="home">${escapeHtml(t('Página inicial'))}</button>
    </div>
    <div class="diag-slot"></div>
    <p class="error-hint">${escapeHtml(t('Se o endereço estiver correto, o site poderá estar temporariamente indisponível. Verifique sua conexão e as configurações de proxy em'))} <b>${escapeHtml(t('Opções da Internet'))}</b>.</p>
  </div>`;

  overlay.querySelector('[data-ov="retry"]').addEventListener('click', () => {
    hideOverlay(tab);
    navigateTab(tab, info.url || tab.url);
  });
  overlay.querySelector('[data-ov="home"]').addEventListener('click', () => {
    hideOverlay(tab);
    navigateTab(tab, state.config.general.homePage || 'ie://newtab');
  });
  overlay.querySelector('[data-ov="diag"]').addEventListener('click', () => runDiagnosticsPanel(tab, info.url));
  if (isActive(tab)) {
    updateSiteUI();
    syncAddress(true);
  }
}

async function runDiagnosticsPanel(tab, url) {
  const slot = tab.overlay.querySelector('.diag-slot');
  if (!slot) return;
  slot.innerHTML = `<div class="diag-loading"><span class="spinner"></span> ${escapeHtml(t('Executando diagnóstico de conexão…'))}</div>`;
  let data;
  try {
    data = await window.ie.diagnostics(url);
  } catch (err) {
    slot.innerHTML = `<div class="diag-error">${escapeHtml(t('Não foi possível executar o diagnóstico: {message}', { message: err.message }))}</div>`;
    return;
  }
  const rows = (data.checks || [])
    .map(
      (check) => `<div class="diag-row">
        <span class="diag-status ${check.status}">${check.status === 'ok' ? '✓' : check.status === 'fail' ? '✕' : 'i'}</span>
        <div><strong>${escapeHtml(check.name)}</strong><span>${escapeHtml(check.detail)}</span></div>
      </div>`
    )
    .join('');
  slot.innerHTML = `<div class="diag-card">
    <div class="diag-head">
      <strong>${escapeHtml(t('Diagnóstico de conexão'))}</strong>
      <button class="diag-link" data-diag="options">${escapeHtml(t('Abrir Opções da Internet'))}</button>
    </div>
    ${rows}
    <p class="diag-foot">${escapeHtml(t('Destino: {target}', { target: data.target || url }))}</p>
  </div>`;
  slot.querySelector('[data-diag="options"]')?.addEventListener('click', () => window.ie.openOptions('connections'));
}

function showRestricted(tab, url) {
  tab.restricted = { url };
  tab.loading = false;
  renderTabs();
  updateLoadingUI(tab);
  const overlay = tab.overlay;
  overlay.hidden = false;
  overlay.className = 'page-overlay restricted-overlay';
  const host = hostOf(url);
  overlay.innerHTML = `<div class="error-page restricted-page">
    <div class="restricted-art"><svg viewBox="0 0 64 64"><path d="M32 6 54 14v16c0 13-8.6 23.8-22 29C18.6 53.8 10 43 10 30V14Z" fill="#fdecea" stroke="#c42b1c" stroke-width="2.4" stroke-linejoin="round"/><path d="m24 24 16 16m0-16L24 40" stroke="#c42b1c" stroke-width="3" stroke-linecap="round"/></svg></div>
    <span class="restricted-badge">${escapeHtml(t('Zona Sites restritos'))}</span>
    <h1>${escapeHtml(t('O Modo Protegido bloqueou este site'))}</h1>
    <p class="error-lead"><b>${escapeHtml(host || url)}</b> ${escapeHtml(t('está na zona'))} <b>${escapeHtml(t('Sites restritos'))}</b>. ${escapeHtml(t('Por padrão, o IE Neo impede o carregamento de páginas dessa zona para proteger seu computador.'))}</p>
    <div class="restricted-url">${escapeHtml(url)}</div>
    <div class="error-actions">
      <button class="btn" data-ov="back">${escapeHtml(t('Voltar'))}</button>
      <button class="btn primary" data-ov="continue">${escapeHtml(t('Continuar mesmo assim'))}</button>
      <button class="btn" data-ov="manage">${escapeHtml(t('Gerenciar sites restritos'))}</button>
    </div>
    <p class="error-hint">${escapeHtml(t('Você também pode adicionar este site à zona'))} <b>${escapeHtml(t('Sites confiáveis'))}</b> ${escapeHtml(t('nas Opções da Internet. A proteção do Modo Protegido continuará ativa.'))}</p>
  </div>`;

  overlay.querySelector('[data-ov="back"]').addEventListener('click', () => {
    hideOverlay(tab);
    tab.restricted = null;
    const current = tab.webview.getURL();
    if (current) {
      tab.url = current;
      if (isActive(tab)) {
        syncAddress(true);
        updateSiteUI();
      }
      try {
        tab.webview.focus();
      } catch {}
    } else {
      navigateTab(tab, 'ie://newtab');
    }
  });
  overlay.querySelector('[data-ov="manage"]').addEventListener('click', () => window.ie.openOptions('security'));
  overlay.querySelector('[data-ov="continue"]').addEventListener('click', () => {
    tab.allowedRestricted.add(host);
    hideOverlay(tab);
    navigateTab(tab, url);
  });
  if (isActive(tab)) {
    updateSiteUI();
    syncAddress(true);
  }
}

/* ------------------------------------------------------------------ */
/* Ações e atalhos                                                     */
/* ------------------------------------------------------------------ */

function runAction(action) {
  const tab = activeTab();
  switch (action) {
    case 'new-tab':
      createTab({ url: 'ie://newtab', activate: true });
      setTimeout(() => els.address.focus(), 60);
      break;
    case 'new-private-tab': {
      createTab({ url: 'ie://newtab', private: true, activate: true });
      showInfoBar({
        text: t('Você está navegando em InPrivate. O IE Neo não salvará histórico, cookies nem dados de formulário desta sessão.'),
        icon: 'i-inprivate',
        actions: [{ label: t('Saiba mais'), onClick: () => window.ie.openOptions('privacy') }],
      });
      break;
    }
    case 'close-tab':
      if (tab) closeTab(tab.id);
      break;
    case 'reopen-tab':
      reopenClosedTab();
      break;
    case 'next-tab':
      cycleTab(1);
      break;
    case 'prev-tab':
      cycleTab(-1);
      break;
    case 'focus-address':
      els.address.focus();
      els.address.select();
      break;
    case 'home':
      if (tab) navigateTab(tab, state.config.general.homePage || 'ie://newtab');
      break;
    case 'back':
      try {
        if (tab) tab.webview.goBack();
      } catch {}
      break;
    case 'forward':
      try {
        if (tab) tab.webview.goForward();
      } catch {}
      break;
    case 'reload':
      try {
        if (tab) tab.webview.reload();
      } catch {}
      break;
    case 'hard-reload':
      try {
        if (tab) tab.webview.reloadIgnoringCache();
      } catch {}
      break;
    case 'stop':
      try {
        if (tab) tab.webview.stop();
      } catch {}
      break;
    case 'find':
      els.findbar.hidden ? openFind() : closeFind();
      break;
    case 'favorite':
      toggleFavorite();
      break;
    case 'feeds':
      if (typeof openFeedsPanel === 'function') openFeedsPanel();
      break;
    case 'history':
      if (typeof openHub === 'function') openHub('history');
      break;
    case 'favorites':
      if (typeof openHub === 'function') openHub('favorites');
      break;
    case 'downloads':
      if (typeof openHub === 'function') openHub('downloads');
      break;
    case 'print':
      if (tab) window.ie.printPage(tab.webview.getWebContentsId()).catch(() => {});
      break;
    case 'view-source':
      if (tab && /^https?:/i.test(tab.url)) createTab({ url: `view-source:${tab.url}`, activate: true });
      break;
    case 'devtools':
      if (tab) window.ie.openDevTools(tab.webview.getWebContentsId()).catch(() => {});
      break;
    case 'zoom-in':
      zoomStep(1);
      break;
    case 'zoom-out':
      zoomStep(-1);
      break;
    case 'zoom-reset':
      setZoom(1);
      break;
    case 'inprivate':
      runAction('new-private-tab');
      break;
    case 'options':
      window.ie.openOptions('general');
      break;
    case 'clear-data':
      window.ie.openOptions('privacy');
      break;
    case 'about':
    case 'help':
      if (typeof showAboutModal === 'function') showAboutModal();
      break;
    case 'fullscreen':
      window.ie.window.toggleFullscreen().catch(() => {});
      break;
    case 'escape':
      handleEscape();
      break;
    default: {
      const match = /^tab-([1-9])$/.exec(action);
      if (match) {
        const target = state.tabs[Number(match[1]) - 1];
        if (target) activateTab(target.id);
      }
    }
  }
}

function handleEscape() {
  if (state.modal) {
    if (typeof closeModal === 'function') closeModal();
    return;
  }
  if (state.activePermission) {
    if (typeof respondPermission === 'function') respondPermission(false, false);
    return;
  }
  if (typeof closeAllPopovers === 'function') closeAllPopovers();
  if (!els.findbar.hidden) {
    closeFind();
    return;
  }
  if (!els.feedsPanel.hidden) {
    if (typeof closeFeedsPanel === 'function') closeFeedsPanel();
    return;
  }
  if (state.hubMode) {
    if (typeof closeHub === 'function') closeHub();
    return;
  }
  if (!els.infobar.hidden) {
    els.infobar.hidden = true;
    return;
  }
  const tab = activeTab();
  if (tab?.loading) {
    try {
      tab.webview.stop();
    } catch {}
  }
}

function localShortcut(event) {
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;
  const key = (event.key || '').toLowerCase();
  if (event.altKey && key === 'arrowleft') return 'back';
  if (event.altKey && key === 'arrowright') return 'forward';
  if (event.altKey && key === 'home') return 'home';
  if (event.altKey && key === 'j') return 'feeds';
  if (ctrl && shift && key === 'delete') return 'clear-data';
  if (ctrl && shift && key === 'p') return 'inprivate';
  if (ctrl && shift && key === 't') return 'reopen-tab';
  if (ctrl && shift && key === 'i') return 'devtools';
  if (ctrl && shift && key === 'tab') return 'prev-tab';
  if (ctrl && shift && key === 'o') return 'favorites';
  if (ctrl && key === 'tab') return 'next-tab';
  if (ctrl && key === 't') return 'new-tab';
  if (ctrl && key === 'w') return 'close-tab';
  if (ctrl && key === 'n') return 'new-tab';
  if (ctrl && key === 'l') return 'focus-address';
  if (ctrl && key === 'r') return 'reload';
  if (ctrl && key === 'd') return 'favorite';
  if (ctrl && key === 'h') return 'history';
  if (ctrl && key === 'j') return 'downloads';
  if (ctrl && key === 'i') return 'favorites';
  if (ctrl && key === 'f') return 'find';
  if (ctrl && key === 'p') return 'print';
  if (ctrl && key === 'u') return 'view-source';
  if (ctrl && key === '=') return 'zoom-in';
  if (ctrl && key === '+') return 'zoom-in';
  if (ctrl && key === '-') return 'zoom-out';
  if (ctrl && key === '0') return 'zoom-reset';
  if (ctrl && /^[1-9]$/.test(key)) return `tab-${key}`;
  const fkeys = { f1: 'help', f3: 'find', f5: shift ? 'hard-reload' : 'reload', f6: 'focus-address', f11: 'fullscreen', f12: 'devtools' };
  if (fkeys[key]) return fkeys[key];
  if (key === 'browserback') return 'back';
  if (key === 'browserforward') return 'forward';
  if (key === 'escape') return 'escape';
  return null;
}

/* ------------------------------------------------------------------ */
/* Bindings                                                            */
/* ------------------------------------------------------------------ */

function bindWindowControls() {
  els.wcMin.addEventListener('click', () => window.ie.window.minimize());
  els.wcMax.addEventListener('click', () => window.ie.window.toggleMaximize().then(updateMaxIcon));
  els.wcClose.addEventListener('click', () => window.ie.window.close());
  els.titlebar.addEventListener('dblclick', (event) => {
    if (event.target.closest('.tab, button, input')) return;
    window.ie.window.toggleMaximize().then(updateMaxIcon);
  });
}

function updateMaxIcon(maximized) {
  const use = els.wcMax.querySelector('use');
  if (use) use.setAttribute('href', maximized ? '#i-restore' : '#i-max');
  els.wcMax.title = maximized ? t('Restaurar') : t('Maximizar');
  document.body.classList.toggle('window-maximized', Boolean(maximized));
}

function bindStaticEvents() {
  els.btnBack.addEventListener('click', () => runAction('back'));
  els.btnForward.addEventListener('click', () => runAction('forward'));
  els.btnHome.addEventListener('click', () => runAction('home'));
  els.btnReload.addEventListener('click', () => {
    const tab = activeTab();
    if (tab?.loading) runAction('stop');
    else runAction('reload');
  });

  els.newtabBtn.addEventListener('click', () => runAction('new-tab'));
  els.tabstrip.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close-tab]');
    if (close) {
      event.stopPropagation();
      closeTab(close.dataset.closeTab);
      return;
    }
    const tab = event.target.closest('.tab');
    if (tab) activateTab(tab.dataset.tabId);
  });
  els.tabstrip.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    const tab = event.target.closest('.tab');
    if (tab) {
      event.preventDefault();
      closeTab(tab.dataset.tabId);
    }
  });
  els.tabstrip.addEventListener('contextmenu', (event) => {
    const tabEl = event.target.closest('.tab');
    if (!tabEl) return;
    event.preventDefault();
    if (typeof showTabContextMenu === 'function') showTabContextMenu(tabEl.dataset.tabId, event);
  });

  els.omnibox.addEventListener('focusin', () => els.omnibox.classList.add('focused'));
  els.omnibox.addEventListener('focusout', () => els.omnibox.classList.remove('focused'));
  els.address.addEventListener('focus', () => {
    els.address.select();
    showSuggestions(els.address.value);
  });
  els.address.addEventListener('input', () => showSuggestions(els.address.value));
  els.address.addEventListener('blur', () => {
    setTimeout(() => {
      hideSuggestions();
      syncAddress(true);
    }, 140);
  });
  els.address.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSuggestion(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSuggestion(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (state.suggestionIndex >= 0) applySuggestion(state.suggestionIndex);
      else {
        hideSuggestions();
        navigateActive(els.address.value, { newTab: event.altKey });
      }
      els.address.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      hideSuggestions();
      els.address.blur();
      syncAddress(true);
    } else if (event.key === 'Tab' && state.suggestionIndex >= 0) {
      event.preventDefault();
      els.address.value = state.suggestions[state.suggestionIndex].url;
    }
  });
  els.goBtn.addEventListener('click', () => {
    hideSuggestions();
    navigateActive(els.address.value);
  });
  els.suggestions.addEventListener('mousedown', (event) => {
    const item = event.target.closest('[data-suggestion]');
    if (!item) return;
    event.preventDefault();
    applySuggestion(Number(item.dataset.suggestion), { newTab: event.ctrlKey });
    els.address.blur();
  });

  els.favoriteBtn.addEventListener('click', toggleFavorite);
  els.feedsBtn.addEventListener('click', () => {
    if (typeof openFeedsPanel === 'function') openFeedsPanel();
  });
  els.menuBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (typeof toggleMenu === 'function') toggleMenu();
  });

  els.statusZone.addEventListener('click', () => window.ie.openOptions('security'));
  els.statusProtected.addEventListener('click', () => window.ie.openOptions('security'));
  els.statusZoom.addEventListener('click', () => {
    if (typeof toggleZoomPopover === 'function') toggleZoomPopover();
  });
  els.siteInfoBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (typeof toggleSitePopover === 'function') toggleSitePopover();
  });
  els.compatBtn.addEventListener('click', toggleCompatView);

  els.infobar.querySelector('#infobar-close').addEventListener('click', () => {
    els.infobar.hidden = true;
  });

  els.findInput.addEventListener('input', () => runFind(true));
  els.findInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runFind(!event.shiftKey);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeFind();
    }
  });
  els.findNext.addEventListener('click', () => runFind(true));
  els.findPrev.addEventListener('click', () => runFind(false));
  els.findClose.addEventListener('click', closeFind);

  document.addEventListener('keydown', (event) => {
    if (state.modal && event.key === 'Escape') {
      event.preventDefault();
      if (typeof closeModal === 'function') closeModal();
      return;
    }
    const action = localShortcut(event);
    if (!action) return;
    if (event.key === 'Escape' && document.activeElement === els.address) return;
    event.preventDefault();
    runAction(action);
  });

  window.addEventListener('resize', () => {
    if (typeof positionPopovers === 'function') positionPopovers();
  });
  window.addEventListener('beforeunload', () => {
    if (state.config) {
      const visible = state.tabs.filter((tab) => !tab.private);
      window.ie.saveSession({
        tabs: visible.map((tab) => ({ url: tab.error?.url || tab.url, title: tab.title })),
        active: visible.findIndex((tab) => tab.id === state.activeId),
      });
    }
  });
}

/** Injeta o tema resolvido em uma webview da página de nova guia. */
function applyThemeToNewTab(webview, theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  try {
    Promise.resolve(
      webview.executeJavaScript(
        `document.documentElement.dataset.theme = ${JSON.stringify(resolved)};` +
          `document.documentElement.style.colorScheme = ${JSON.stringify(resolved)};`,
        false
      )
    ).catch(() => {});
  } catch {}
}

/**
 * Aplica o tema às páginas de nova guia já abertas. Abas InPrivate mantêm o
 * visual claro clássico, coerente com o chrome da sessão privada.
 */
function applyNewTabTheme(theme) {
  state.tabs.forEach((tab) => {
    if (!tab.webview || !String(tab.url || '').startsWith('ie://newtab')) return;
    applyThemeToNewTab(tab.webview, tab.private ? 'light' : theme);
  });
}

function applyNewTabThemeTo(tab) {
  if (!tab?.webview || !String(tab.url || '').startsWith('ie://newtab')) return;
  applyThemeToNewTab(tab.webview, tab.private ? 'light' : state.resolvedTheme);
}

function bindIpc() {
  window.ie.on('settings:changed', (config) => {
    const previous = state.config;
    state.config = config;
    const effective = window.IETheme?.apply(config.general?.theme);
    applyNewTabTheme(effective);
    const newKey = uaKey(config);
    if (newKey !== state.lastUaKey) {
      state.lastUaKey = newKey;
      state.tabs.forEach((tab) => {
        if (!tab.compat) {
          try {
            tab.webview.setUserAgent(uaForTab(tab));
          } catch {}
        }
      });
    }
    applyChromeConfig();
    updateSiteUI();
    if (previous?.advanced.userAgentMode !== config.advanced.userAgentMode) {
      toast({ title: t('Identificador do navegador atualizado'), body: t('A nova identificação será usada nas próximas navegações.') });
    }
  });

  window.ie.on('theme:changed', ({ theme } = {}) => {
    window.IETheme?.apply(state.config?.general?.theme);
    if (theme === 'dark' || theme === 'light') {
      state.resolvedTheme = theme;
      window.IETheme?.applyResolved(theme);
    }
    applyNewTabTheme(theme);
  });

  window.ie.on('language:changed', ({ locale } = {}) => {
    window.IEI18n?.setLocale(locale || window.ie.locale);
    window.IEI18n?.localize(document);
    // Textos montados em JS são refeitos aqui; abas e a página atual continuam.
    renderTabs();
    renderBookmarks();
    updateAllUI();
    applyChromeConfig();
    // Páginas de erro/restrição também são geradas aqui e precisam do novo idioma.
    state.tabs.forEach((tab) => {
      if (!tab.overlay || tab.overlay.hidden) return;
      if (tab.error) showError(tab, tab.error);
      else if (tab.restricted) showRestricted(tab, tab.restricted.url);
    });
    if (!els.findbar.hidden) renderFindCount();
    // A nova guia é um webview: pede que ela mesma reaplique o idioma.
    const activeLocale = window.IEI18n?.getLocale() || window.ie.locale;
    state.tabs.forEach((tab) => {
      if (!tab.webview || !String(tab.url || '').startsWith('ie://newtab')) return;
      tab.webview
        .executeJavaScript(
          `window.IE_newtabRefresh && window.IE_newtabRefresh(${JSON.stringify(activeLocale)});`,
          false
        )
        .catch(() => {});
    });
    if (typeof refreshHub === 'function') refreshHub();
    if (typeof refreshFeedsPanel === 'function') refreshFeedsPanel();
    if (typeof refreshDownloadShelf === 'function') refreshDownloadShelf();
    if (typeof refreshOpenModal === 'function') refreshOpenModal();
    if (typeof closeAllPopovers === 'function') closeAllPopovers();
    // O texto do infobar é renderizado na hora; some para não ficar no idioma antigo.
    els.infobar.hidden = true;
    window.ie.window.isMaximized().then(updateMaxIcon).catch(() => {});
  });

  window.ie.on('downloads:changed', (list) => {
    state.downloads = list || [];
    if (state.hubMode === 'downloads' && typeof renderHub === 'function') renderHub();
    if (typeof handleDownloadShelf === 'function') handleDownloadShelf(state.downloads);
  });

  window.ie.on('shortcut', ({ action }) => {
    if (action) runAction(action);
  });

  window.ie.on('internal:navigate', ({ url } = {}) => {
    if (url) handleInternalUrl(url);
  });

  window.ie.on('notify', ({ title, body, kind } = {}) => {
    if (title) toast({ title, body, kind });
  });

  window.ie.on('popup:open', ({ url, background }) => {
    createTab({ url, activate: !background });
  });

  window.ie.on('popup:blocked', ({ url }) => {
    showInfoBar({
      text: t('O bloqueador de pop-ups do IE Neo bloqueou um pop-up de {host}.', {
        host: hostOf(activeTab()?.url) || t('este site'),
      }),
      icon: 'i-shield',
      actions: [
        { label: t('Abrir pop-up'), onClick: () => createTab({ url, activate: true }) },
        { label: t('Configurações'), onClick: () => window.ie.openOptions('privacy') },
      ],
    });
  });

  window.ie.on('permission:request', (request) => {
    state.permissionQueue.push(request);
    if (typeof showNextPermission === 'function') showNextPermission();
  });

  window.ie.on('window:state', ({ maximized }) => updateMaxIcon(maximized));

  window.ie.on('open-url', ({ url, newTab }) => {
    if (newTab || !activeTab()) createTab({ url, activate: true });
    else navigateActive(url);
  });

  window.ie.on('query:current-tab', ({ requestId }) => {
    const tab = activeTab();
    window.ie.replyCurrentTab({
      requestId,
      tab: tab
        ? {
            url: tab.error?.url || tab.url,
            title: tab.title,
            private: tab.private,
          }
        : null,
    });
  });
}

'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  shell,
  Menu,
  dialog,
  protocol,
  net,
  webContents,
  nativeTheme,
} = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dns = require('dns').promises;
const netNode = require('net');
const { pathToFileURL } = require('url');
const { ConfigStore } = require('./config');
const registry = require('./registry');
const zones = require('./zones');
const { createSessionConfigurator, applyProxy, testConnection } = require('./network');
const i18n = require('../shared/i18n');
i18n.register(require('../shared/i18n-en-common'));
i18n.register(require('./i18n-en'));

/** Atalho local para traduzir textos do processo principal. */
const t = (source, vars) => i18n.t(source, vars);

const isDev = process.argv.includes('--dev');

const APP_NAME = 'IE Neo';
const AUTHOR_NAME = 'FGOMESX';
const AUTHOR_URL = 'https://github.com/fgomesx';
const PROJECT_URL = 'https://github.com/fgomesx/ie-neo';
// Diretórios de perfis usados por versões anteriores, do mais recente ao mais antigo.
const LEGACY_APP_NAMES = ['Internet Explorer Neo', 'Internet Explorer'];

// O nome precisa ser definido antes do ConfigStore resolver o userData.
app.setName(APP_NAME);

// Perfis de teste (smoke/screenshots) apontam para uma pasta temporária e
// não contaminam as preferências reais do usuário.
const userDataOverride = process.env.IENEO_USER_DATA;
if (userDataOverride) {
  const overrideDir = path.resolve(userDataOverride);
  fs.mkdirSync(overrideDir, { recursive: true });
  app.setPath('userData', overrideDir);
} else {
  // Migra as preferências de versões anteriores (Internet Explorer Neo e
  // Internet Explorer) para o diretório do IE Neo, sem apagar os dados antigos.
  try {
    const currentConfig = path.join(app.getPath('userData'), 'internet-explorer.json');
    if (!fs.existsSync(currentConfig)) {
      for (const legacyName of LEGACY_APP_NAMES) {
        const legacyDir = path.join(app.getPath('appData'), legacyName);
        const legacyConfig = path.join(legacyDir, 'internet-explorer.json');
        if (fs.existsSync(legacyConfig)) {
          fs.mkdirSync(path.dirname(currentConfig), { recursive: true });
          fs.copyFileSync(legacyConfig, currentConfig);
          console.log(`[config] preferências migradas de ${legacyDir}`);
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[config] não foi possível migrar as preferências:', err.message);
  }
}

const store = new ConfigStore();
const cfg = () => store.get();

/**
 * Aplica o idioma escolhido no instalador somente na primeira execução do
 * usuário. Um perfil já existente (inclusive migrado) sempre prevalece.
 */
function applyInstallerLanguage() {
  if (!app.isPackaged || fs.existsSync(store.file)) return;
  const candidates = [
    path.join(process.resourcesPath, 'install-language.txt'),
    path.join(path.dirname(app.getPath('exe')), 'install-language.txt'),
  ];
  const file = candidates.find((candidate) => fs.existsSync(candidate));
  if (!file) return;
  try {
    const language = i18n.normalize(fs.readFileSync(file, 'utf8').trim());
    store.update({ general: { ...store.data.general, language } });
  } catch (err) {
    console.warn('[config] não foi possível ler o idioma do instalador:', err.message);
  }
}

applyInstallerLanguage();

/**
 * Idioma efetivo da interface. Fica em sincronia com a preferência salva e
 * alimenta os preloads via IPC síncrono (`app:locale`).
 */
let currentLocale = i18n.getLocale();

function syncLocale() {
  const next = i18n.normalize(cfg().general?.language);
  const changed = next !== currentLocale;
  if (changed) {
    i18n.setLocale(next);
    currentLocale = next;
  }
  return changed;
}

syncLocale();

const THEMES = new Set(['light', 'dark', 'system']);

/** Tema efetivo escolhido pelo usuário (padrão: acompanhar o Windows). */
function themePreference() {
  const value = cfg().general?.theme;
  return THEMES.has(value) ? value : 'system';
}

/**
 * Aplica o tema ao Chromium/Electron. Isso governa as janelas nativas, as
 * barras de rolagem, prefers-color-scheme nas páginas e o tema da nova guia.
 */
function applyTheme() {
  try {
    nativeTheme.themeSource = themePreference();
  } catch {}
  updateWindowBackgrounds();
}

const THEME_CYCLE = ['light', 'dark', 'system'];

/**
 * Alterna a preferência de tema em Claro → Escuro → Automático. Usado pelo
 * cartão "Make it yours" da nova guia, que não tem acesso a IPC.
 */
function cycleTheme() {
  const current = themePreference();
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
  store.update({ general: { ...cfg().general, theme: next } });
  applyTheme();
  notifySettingsChanged();
  return next;
}

function windowBackground(kind) {
  const dark = nativeTheme.shouldUseDarkColors;
  if (kind === 'options') return dark ? '#1b232a' : '#f6f7f9';
  return dark ? '#202a33' : '#eef1f5';
}

function updateWindowBackgrounds() {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(windowBackground('main'));
    }
    if (optionsWindow && !optionsWindow.isDestroyed()) {
      optionsWindow.setBackgroundColor(windowBackground('options'));
    }
  } catch {}
}

const NORMAL_PARTITION = 'persist:ie';
const PRIVATE_PARTITION = 'ie-inprivate';

let mainWindow = null;
let optionsWindow = null;
let pendingPermissionId = 0;
const pendingPermissions = new Map();
let quittingAfterCleanup = false;
let firstLaunch = false;
let welcomePending = false;

/* ------------------------------------------------------------------ */
/* Inicialização                                                       */
/* ------------------------------------------------------------------ */

const gotSingleInstanceLock = app.requestSingleInstanceLock();

app.setAppUserModelId('IENeo.Conceptual');

// Flags que precisam existir antes do Chromium subir.
(function applyStartupSwitches() {
  const c = cfg();
  if (!c.advanced.useHardwareAcceleration) app.disableHardwareAcceleration();
  if (!c.advanced.http3) app.commandLine.appendSwitch('disable-quic');
  if (!c.advanced.smoothScroll) app.commandLine.appendSwitch('disable-smooth-scrolling');
  if (c.advanced.tlsLegacy) app.commandLine.appendSwitch('ssl-version-min', 'tls1');
  if (!c.advanced.useClearType) app.commandLine.appendSwitch('disable-lcd-text');
  app.commandLine.appendSwitch('enable-features', 'OverlayScrollbar');
})();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ie',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

/* ------------------------------------------------------------------ */
/* Sessões                                                             */
/* ------------------------------------------------------------------ */

const configureSession = createSessionConfigurator({
  getConfig: cfg,
  promptPermission: (request) => askPermission(request),
});

let normalSession = null;
let privateSession = null;
let allSessions = [];

/** As sessões só podem ser criadas depois de app.whenReady(). */
function initSessions() {
  normalSession = session.fromPartition(NORMAL_PARTITION);
  privateSession = session.fromPartition(PRIVATE_PARTITION);
  allSessions = [normalSession, privateSession];
  allSessions.forEach(configureSession);
  allSessions.forEach(attachDownloads);
}

let downloadSeq = 0;

function downloadList() {
  return store.get().downloads || [];
}

function broadcastDownloads() {
  const payload = downloadList().slice(0, 50);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('downloads:changed', payload);
  }
}

function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  const dir = path.dirname(target);
  const ext = path.extname(target);
  const base = path.basename(target, ext);
  for (let i = 1; i < 1000; i += 1) {
    const candidate = path.join(dir, `${base} (${i})${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(dir, `${base}-${Date.now()}${ext}`);
}

function attachDownloads(ses) {
  ses.on('will-download', (event, item) => {
    const c = cfg();
    const id = `dl-${Date.now()}-${(downloadSeq += 1)}`;
    if (!c.general.askDownloadLocation) {
      const dir = c.general.downloadDir || app.getPath('downloads');
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        /* pasta inválida */
      }
      try {
        item.setSavePath(uniquePath(path.join(dir, item.getFilename())));
      } catch {
        /* deixa o Chromium escolher */
      }
    }
    const entry = {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      mime: item.getMimeType(),
      total: item.getTotalBytes(),
      received: 0,
      state: 'progressing',
      startedAt: Date.now(),
      savePath: item.getSavePath() || '',
    };
    const list = downloadList();
    list.unshift(entry);
    store.setDownloads(list);
    broadcastDownloads();

    let lastPush = 0;
    item.on('updated', (_e, state) => {
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      entry.state = state === 'interrupted' ? 'interrupted' : item.isPaused() ? 'paused' : 'progressing';
      entry.savePath = item.getSavePath() || entry.savePath;
      const now = Date.now();
      if (now - lastPush > 400) {
        lastPush = now;
        store.setDownloads(downloadList());
        broadcastDownloads();
      }
    });
    item.once('done', (_e, state) => {
      entry.received = item.getReceivedBytes();
      entry.total = item.getTotalBytes();
      entry.state = state === 'completed' ? 'completed' : state;
      entry.savePath = item.getSavePath() || entry.savePath;
      entry.finishedAt = Date.now();
      store.setDownloads(downloadList());
      broadcastDownloads();
      if (cfg().advanced.downloadNotifications) {
        const title = state === 'completed' ? t('Download concluído') : t('Falha no download');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('notify', {
            title,
            body: entry.filename,
            kind: state === 'completed' ? 'success' : 'error',
          });
        }
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Protocolo interno ie://                                             */
/* ------------------------------------------------------------------ */

const PAGES_DIR = path.join(__dirname, '..', 'renderer', 'pages');

function fileResponse(filePath, contentType) {
  try {
    const data = fs.readFileSync(filePath);
    return new Response(data, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-cache',
      },
    });
  } catch {
    return new Response(t('Recurso não encontrado'), { status: 404 });
  }
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}

function buildNewTabData(isPrivate = false) {
  const c = cfg();
  const seen = new Set();
  const topSites = [];
  for (const entry of c.history) {
    let host = '';
    try {
      host = new URL(entry.url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (!host || seen.has(host)) continue;
    seen.add(host);
    topSites.push({ title: entry.title || host, url: entry.url, host });
    if (topSites.length >= 8) break;
  }
  const favorites = c.favorites.filter((f) => f.folder !== 'Outros favoritos').slice(0, 8);
  const user = (() => {
    try {
      const name = os.userInfo().username || t('usuário');
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch {
      return t('usuário');
    }
  })();
  const welcome = welcomePending && !isPrivate;
  if (welcome) welcomePending = false;
  return {
    favorites,
    topSites,
    user,
    searchUrl: c.general.searchUrl,
    searchProvider: c.general.searchProvider,
    zone: t('Internet'),
    version: app.getVersion(),
    theme: !isPrivate && nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    themeMode: c.general.theme,
    language: i18n.getLocale(),
    welcome,
    projectUrl: PROJECT_URL,
  };
}

function scriptResponse(source) {
  return new Response(source, {
    status: 200,
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}

function registerInternalProtocol(sessions = []) {
  const isPrivateRequest = (request, host, pathname) => {
    const origin = request.initiatorOrigin || '';
    if (!origin) return false;
    if (/^ie:\/\/newtab\/?$/i.test(origin)) return false;
    if (/^file:\/\//i.test(origin)) return false;
    return host === 'internal' || pathname === '/data.json';
  };

  const handler = async (request, context = {}) => {
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return new Response(t('Requisição inválida'), { status: 400 });
    }
    const host = url.hostname;
    // Impede que páginas remotas leiam favoritos, histórico e preferências
    // expostos pelo protocolo interno.
    if (isPrivateRequest(request, host, url.pathname)) {
      return new Response(t('Acesso negado'), { status: 403 });
    }
    if (host === 'newtab') {
      if (url.pathname === '/data.json') return jsonResponse(buildNewTabData(context.private));
      // O idioma é resolvido pelo processo principal antes do i18n.js rodar,
      // evitando que a nova guia pisque em português ao abrir.
      if (url.pathname === '/locale.js') {
        return scriptResponse(`window.__IE_LOCALE__=${JSON.stringify(i18n.getLocale())};`);
      }
      if (url.pathname === '/i18n.js') {
        return fileResponse(path.join(__dirname, '..', 'shared', 'i18n.js'), 'text/javascript; charset=utf-8');
      }
      if (url.pathname === '/i18n-en-common.js') {
        return fileResponse(
          path.join(__dirname, '..', 'shared', 'i18n-en-common.js'),
          'text/javascript; charset=utf-8'
        );
      }
      if (url.pathname === '/i18n-en-newtab.js') {
        return fileResponse(
          path.join(__dirname, '..', 'renderer', 'js', 'i18n-en-newtab.js'),
          'text/javascript; charset=utf-8'
        );
      }
      if (url.pathname === '/newtab.css') {
        return fileResponse(path.join(PAGES_DIR, 'newtab.css'), 'text/css; charset=utf-8');
      }
      if (url.pathname === '/newtab.js') {
        return fileResponse(path.join(PAGES_DIR, 'newtab.js'), 'text/javascript; charset=utf-8');
      }
      if (url.pathname === '/assets/icon.png') {
        return fileResponse(path.join(PAGES_DIR, '..', 'assets', 'icon.png'), 'image/png');
      }
      return fileResponse(path.join(PAGES_DIR, 'newtab.html'), 'text/html; charset=utf-8');
    }
    if (host === 'internal' && url.pathname === '/diagnostics') {
      const target = url.searchParams.get('url') || '';
      return jsonResponse(await runDiagnostics(target));
    }
    if (host === 'internal' && url.pathname === '/permissions') {
      return jsonResponse({
        zones: zones.ZONE_META,
        levels: zones.LEVELS,
      });
    }
    return new Response(t('Página interna desconhecida'), { status: 404 });
  };

  protocol.handle('ie', handler);
  // Cada partição tem seu próprio mapa de protocolos: webviews não herdam
  // automaticamente o manipulador registrado na sessão padrão.
  for (const ses of sessions) {
    try {
      const isPrivate = ses === privateSession;
      ses.protocol.handle('ie', (request) => handler(request, { private: isPrivate }));
    } catch (err) {
      console.error('[protocolo] falha ao registrar ie:// na sessão:', err.message);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Janela principal                                                    */
/* ------------------------------------------------------------------ */

function windowState() {
  const state = store.get().window || {};
  return {
    width: Math.max(1000, Math.min(state.width || 1280, 2600)),
    height: Math.max(640, Math.min(state.height || 820, 1600)),
    x: Number.isInteger(state.x) ? state.x : undefined,
    y: Number.isInteger(state.y) ? state.y : undefined,
    maximized: Boolean(state.maximized),
  };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) return;
  const bounds = mainWindow.getNormalBounds();
  store.update({
    window: {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: mainWindow.isMaximized(),
    },
  });
}

function sendToChrome(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function createMainWindow() {
  const state = windowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 980,
    minHeight: 620,
    frame: false,
    show: false,
    backgroundColor: windowBackground('main'),
    title: APP_NAME,
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      spellcheck: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.webviewTag = false;
    if (params.partition !== PRIVATE_PARTITION) params.partition = NORMAL_PARTITION;
    if (!/^(https?:|ie:)/i.test(params.src || '')) params.src = 'ie://newtab';
  });

  mainWindow.once('ready-to-show', () => {
    if (state.maximized) mainWindow.maximize();
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  let saveTimer = null;
  const queueSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 400);
  };
  mainWindow.on('resize', queueSave);
  mainWindow.on('move', queueSave);
  mainWindow.on('maximize', () => {
    queueSave();
    sendToChrome('window:state', { maximized: true });
  });
  mainWindow.on('unmaximize', () => {
    queueSave();
    sendToChrome('window:state', { maximized: false });
  });
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
}

/* ------------------------------------------------------------------ */
/* Janela de Opções da Internet                                        */
/* ------------------------------------------------------------------ */

const OPTIONS_WINDOW_WIDTH = 900;
const OPTIONS_WINDOW_HEIGHT = 620;

function openOptionsWindow(section = 'general') {
  if (optionsWindow && !optionsWindow.isDestroyed()) {
    optionsWindow.show();
    optionsWindow.focus();
    optionsWindow.webContents.send('options:navigate', section);
    return;
  }
  optionsWindow = new BrowserWindow({
    width: OPTIONS_WINDOW_WIDTH,
    height: OPTIONS_WINDOW_HEIGHT,
    parent: mainWindow || undefined,
    modal: false,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    backgroundColor: windowBackground('options'),
    title: t('Opções da Internet'),
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'options-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  optionsWindow.setMenuBarVisibility(false);
  optionsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'options.html'), {
    query: { section },
  });
  optionsWindow.once('ready-to-show', () => {
    optionsWindow.show();
    optionsWindow.focus();
  });
  optionsWindow.on('closed', () => {
    optionsWindow = null;
  });
}

function notifySettingsChanged() {
  const languageChanged = syncLocale();
  sendToChrome('settings:changed', cfg());
  notifyThemeChanged();
  if (languageChanged) notifyLanguageChanged();
}

/**
 * Informa o tema realmente resolvido (Claro/Escuro) para as páginas internas.
 */
function notifyThemeChanged() {
  const payload = { theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light' };
  sendToChrome('theme:changed', payload);
  if (optionsWindow && !optionsWindow.isDestroyed()) {
    optionsWindow.webContents.send('theme:changed', payload);
  }
}

/**
 * Reconstrói o que é nativo (menu, título da janela) e avisa os renderers.
 * Eles mesmos reaplicam os textos sem recarregar, preservando guias e edições.
 */
function notifyLanguageChanged() {
  const payload = { locale: i18n.getLocale() };
  try {
    buildApplicationMenu();
  } catch (err) {
    console.warn('[i18n] falha ao reconstruir o menu:', err.message);
  }
  if (optionsWindow && !optionsWindow.isDestroyed()) {
    optionsWindow.setTitle(t('Opções da Internet'));
    optionsWindow.webContents.send('language:changed', payload);
  }
  sendToChrome('language:changed', payload);
}

function buildApplicationMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: t('Editar'),
        submenu: [
          { role: 'undo', label: t('Desfazer') },
          { role: 'redo', label: t('Refazer') },
          { type: 'separator' },
          { role: 'cut', label: t('Recortar') },
          { role: 'copy', label: t('Copiar') },
          { role: 'paste', label: t('Colar') },
          { role: 'selectAll', label: t('Selecionar tudo') },
        ],
      },
    ])
  );
}

async function applyRuntimeSettings() {
  const c = cfg();
  applyTheme();
  await Promise.all(allSessions.map((ses) => applyProxy(ses, c)));
  allSessions.forEach((ses) => {
    try {
      ses.setSpellCheckerEnabled(c.advanced.useSpellcheck);
    } catch {}
  });
}

async function applyAndPersist(sections) {
  store.update(sections);
  await applyRuntimeSettings();
  await registry.writeWindowsState(cfg()).catch(() => {});
  notifySettingsChanged();
  return cfg();
}

/* ------------------------------------------------------------------ */
/* Permissões (prompt no chrome)                                       */
/* ------------------------------------------------------------------ */

function askPermission({ permission, requestingUrl, zone, mediaTypes }) {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) return resolve(false);
    const id = `perm-${(pendingPermissionId += 1)}`;
    const timer = setTimeout(() => {
      pendingPermissions.delete(id);
      resolve(false);
    }, 45000);
    pendingPermissions.set(id, { resolve, timer, request: { permission, requestingUrl, zone } });
    sendToChrome('permission:request', {
      id,
      permission,
      mediaTypes,
      url: requestingUrl,
      origin: zones.hostOf(requestingUrl),
      zone: { id: zone.zoneId, label: zone.label, level: zone.level },
    });
  });
}

/* ------------------------------------------------------------------ */
/* Diagnóstico de conexão                                              */
/* ------------------------------------------------------------------ */

function tcpCheck(host, port, timeout = 6000) {
  return new Promise((resolve) => {
    const socket = new netNode.Socket();
    const started = Date.now();
    let done = false;
    const finish = (ok, detail) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ok, detail, elapsed: Date.now() - started });
    };
    socket.setTimeout(timeout);
    socket.once('connect', () =>
      finish(true, t('Conexão TCP estabelecida na porta {port}.', { port }))
    );
    socket.once('timeout', () =>
      finish(false, t('Tempo esgotado ao conectar na porta {port}.', { port }))
    );
    socket.once('error', (err) => finish(false, err.message));
    socket.connect(port, host);
  });
}

async function runDiagnostics(rawUrl) {
  const c = cfg();
  let target = rawUrl;
  if (!target || target.startsWith('ie://')) target = c.general.homePage;
  let host = '';
  let scheme = 'https';
  try {
    const parsed = new URL(target);
    host = parsed.hostname;
    scheme = parsed.protocol.replace(':', '');
  } catch {
    host = '';
  }
  const checks = [];
  checks.push({
    name: t('Adaptador de rede'),
    status: net.isOnline() ? 'ok' : 'fail',
    detail: net.isOnline()
      ? t('O Windows reporta uma conexão ativa.')
      : t('Nenhuma conexão de rede ativa.'),
  });

  if (host) {
    const dnsStarted = Date.now();
    try {
      const result = await Promise.race([
        dns.lookup(host, { all: true }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(t('Tempo esgotado'))), 6000)
        ),
      ]);
      checks.push({
        name: `DNS — ${host}`,
        status: 'ok',
        detail: t('Resolvido para {addresses} ({ms} ms).', {
          addresses: result
            .map((r) => r.address)
            .slice(0, 3)
            .join(', '),
          ms: Date.now() - dnsStarted,
        }),
      });
    } catch (err) {
      checks.push({
        name: `DNS — ${host}`,
        status: 'fail',
        detail: t('Não foi possível resolver o nome: {error}.', { error: err.message }),
      });
    }

    const port = scheme === 'http' ? 80 : 443;
    const tcp = await tcpCheck(host, port);
    checks.push({
      name: t('Porta {port}', { port }),
      status: tcp.ok ? 'ok' : 'fail',
      detail: tcp.detail,
    });
  }

  const proxy = c.connections.proxy;
  const proxyDetail = proxy.autoConfigUrl
    ? t('Script de configuração automática: {pac}', { pac: proxy.autoConfigUrl })
    : proxy.enabled
      ? t('Servidor proxy: {server}', { server: proxy.server || t('(não definido)') })
      : c.connections.autoDetect
        ? t('Detecção automática de configurações ativada, sem proxy fixo.')
        : t('Conexão direta, sem proxy.');
  checks.push({
    name: t('Configuração de proxy'),
    status: 'info',
    detail: proxyDetail,
  });

  const zone = zones.classify(target, c.zones);
  checks.push({
    name: t('Zona de segurança'),
    status: 'info',
    detail: t('{zone} — Modo Protegido {state}.', {
      zone: t(zone.label),
      state: c.zones.internet.protectedMode ? t('ativado') : t('desativado'),
    }),
  });

  return {
    target,
    host,
    checks,
    proxy: {
      enabled: proxy.enabled,
      server: proxy.server,
      pac: proxy.autoConfigUrl,
    },
    timestamp: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* Atalhos de teclado globais do navegador                             */
/* ------------------------------------------------------------------ */

function shortcutFor(input) {
  if (input.type !== 'keyDown') return null;
  const ctrl = input.control || input.meta;
  const shift = input.shift;
  const key = (input.key || '').toLowerCase();
  const map = {
    f1: 'help',
    f3: 'find',
    f5: shift ? 'hard-reload' : 'reload',
    f6: 'focus-address',
    f7: 'caret',
    f11: 'fullscreen',
    f12: 'devtools',
    escape: 'escape',
    browserback: 'back',
    browserforward: 'forward',
  };
  if (map[key] && !ctrl) return map[key];
  if (input.alt && !ctrl) {
    if (key === 'arrowleft') return 'back';
    if (key === 'arrowright') return 'forward';
    if (key === 'home') return 'home';
    if (key === 'j') return 'feeds';
  }
  if (!ctrl) return null;
  if (shift && key === 'delete') return 'clear-data';
  if (shift && key === 'p') return 'inprivate';
  if (shift && key === 't') return 'reopen-tab';
  if (shift && key === 'tab') return 'prev-tab';
  if (shift && key === 'n') return 'new-tab';
  if (key === 'tab') return 'next-tab';
  if (key === 't') return 'new-tab';
  if (key === 'w') return 'close-tab';
  if (key === 'n') return 'new-tab';
  if (key === 'l' || key === 'o') return 'focus-address';
  if (key === 'r') return 'reload';
  if (key === 'd') return 'favorite';
  if (key === 'h') return 'history';
  if (key === 'j') return 'downloads';
  if (key === 'f') return 'find';
  if (key === 'p') return 'print';
  if (key === 'u') return 'view-source';
  if (key === 'i') return 'devtools';
  if (key === '=' || key === '+') return 'zoom-in';
  if (key === '-') return 'zoom-out';
  if (key === '0') return 'zoom-reset';
  if (/^[1-9]$/.test(key)) return `tab-${key}`;
  return null;
}

function isInternalPageUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'ie:' && parsed.hostname !== 'newtab';
  } catch {
    return false;
  }
}

function attachWebviewBehaviors(contents) {
  contents.on('will-navigate', (event, legacyUrl) => {
    const target = event.url || legacyUrl || '';
    if (!isInternalPageUrl(target)) return;
    // O evento DOM equivalente na webview não é cancelável; apenas o do
    // processo principal consegue impedir a navegação para uma rota ie://.
    event.preventDefault();
    // O cartão de tema da nova guia não tem IPC: ele navega para ie://theme e
    // a troca é feita aqui, devolvendo o novo modo à própria página.
    if (/^ie:\/\/theme(?:[/?#]|$)/i.test(target)) {
      const mode = cycleTheme();
      const resolved = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      contents
        .executeJavaScript(
          `window.IE_newtabTheme && window.IE_newtabTheme(${JSON.stringify(mode)}, ${JSON.stringify(resolved)});`,
          false
        )
        .catch(() => {});
      return;
    }
    sendToChrome('internal:navigate', { url: target });
  });

  contents.setWindowOpenHandler((details) => {
    const c = cfg();
    const url = details.url || '';
    if (isInternalPageUrl(url)) {
      sendToChrome('internal:navigate', { url });
      return { action: 'deny' };
    }
    if (!/^(https?:|ie:)/i.test(url)) {
      if (/^(mailto:|tel:)/i.test(url)) openExternal(url);
      return { action: 'deny' };
    }
    if (c.privacy.popupBlocker && details.disposition === 'new-window') {
      sendToChrome('popup:blocked', { url, source: contents.getURL() });
    } else if (url !== 'about:blank') {
      sendToChrome('popup:open', {
        url,
        background: details.disposition === 'background-tab',
        source: contents.getURL(),
      });
    }
    return { action: 'deny' };
  });

  contents.on('before-input-event', (event, input) => {
    const action = shortcutFor(input);
    if (!action) return;
    // Deixa o Chromium cuidar de atalhos de edição dentro de campos.
    if (input.isAutoRepeat) return;
    event.preventDefault();
    sendToChrome('shortcut', { action, key: input.key, shift: input.shift });
  });

  if (isDev) {
    contents.on('console-message', (_e, level, message) => {
      if (level >= 3) console.log('[webview]', message);
    });
  }
}

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    attachWebviewBehaviors(contents);
  }
});

/* ------------------------------------------------------------------ */
/* Shell / links externos                                              */
/* ------------------------------------------------------------------ */

function openExternal(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      shell.openExternal(rawUrl);
    }
  } catch {}
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

function registerIpc() {
  // Preloads consultam o idioma de forma síncrona antes de carregar o i18n.
  ipcMain.on('app:locale', (event) => {
    event.returnValue = i18n.getLocale();
  });

  ipcMain.handle('app:meta', () => ({
    name: app.getName(),
    author: AUTHOR_NAME,
    authorUrl: AUTHOR_URL,
    projectUrl: PROJECT_URL,
    version: app.getVersion(),
    electron: process.versions.electron,
    chromium: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    locale: i18n.getLocale(),
    isDefaultBrowser: app.isDefaultProtocolClient('http'),
    configFile: store.file,
    registryKeys: {
      main: registry.MAIN_KEY,
      settings: registry.SETTINGS_KEY,
    },
    userAgents: buildUserAgents(),
  }));

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle('window:is-maximized', (event) => {
    return Boolean(BrowserWindow.fromWebContents(event.sender)?.isMaximized());
  });

  ipcMain.handle('browser:startup', () => {
    const c = cfg();
    const showWelcome = firstLaunch;
    firstLaunch = false;
    let tabs;
    if (showWelcome) {
      tabs = [{ url: 'ie://newtab', title: t('Nova guia') }];
    } else if (c.general.startup === 'restore' && c.general.reopenLastSession && c.session.tabs?.length) {
      tabs = c.session.tabs;
    } else if (c.general.startup === 'newtab') {
      tabs = [{ url: 'ie://newtab', title: t('Nova guia') }];
    } else {
      tabs = [{ url: c.general.homePage || 'ie://newtab', title: t('Página inicial') }];
    }
    return {
      config: c,
      tabs,
      active: showWelcome ? 0 : c.session.active || 0,
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      locale: i18n.getLocale(),
      meta: {
        author: AUTHOR_NAME,
        authorUrl: AUTHOR_URL,
        projectUrl: PROJECT_URL,
        version: app.getVersion(),
        chromium: process.versions.chrome,
        userAgents: buildUserAgents(),
        isDefaultBrowser: app.isDefaultProtocolClient('http'),
        configFile: store.file,
        downloadsPath: app.getPath('downloads'),
      },
    };
  });

  ipcMain.handle('browser:save-session', (_event, payload) => {
    if (!payload) return;
    const tabs = (payload.tabs || []).slice(0, 40).filter((t) => t && typeof t.url === 'string');
    store.update({ session: { tabs, active: payload.active || 0 } });
  });

  ipcMain.handle('settings:open-options', (_event, section) => {
    openOptionsWindow(section || 'general');
  });

  ipcMain.handle('settings:add-favorite', (_event, favorite) => {
    if (!favorite || !favorite.url) return cfg().favorites;
    const list = cfg().favorites.slice();
    if (!list.some((f) => f.url === favorite.url)) {
      list.unshift({
        id: `fav-${Date.now()}`,
        title: favorite.title || favorite.url,
        url: favorite.url,
        folder: favorite.folder || 'Barra de Favoritos',
        createdAt: Date.now(),
      });
      store.setFavorites(list);
      notifySettingsChanged();
    }
    return cfg().favorites;
  });

  ipcMain.handle('settings:remove-favorite', (_event, id) => {
    const list = cfg().favorites.filter((f) => f.id !== id);
    store.setFavorites(list);
    notifySettingsChanged();
    return list;
  });

  ipcMain.handle('settings:toggle-compat', (_event, { host, enabled }) => {
    const c = cfg();
    const list = new Set(c.advanced.compatSites || []);
    if (!host) return [...list];
    if (enabled) list.add(host);
    else list.delete(host);
    store.update({ advanced: { ...c.advanced, compatSites: [...list] } });
    notifySettingsChanged();
    return [...list];
  });

  ipcMain.handle('window:toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    win.setFullScreen(!win.isFullScreen());
    return win.isFullScreen();
  });

  ipcMain.handle('history:list', () => cfg().history);
  ipcMain.handle('history:add', (_event, entry) => {
    if (!entry || !/^https?:/i.test(entry.url || '')) return false;
    store.addHistory({
      url: entry.url,
      title: entry.title || entry.url,
      time: Date.now(),
    });
    return true;
  });
  ipcMain.handle('history:delete', (_event, { url, time }) => {
    store.setHistory(
      cfg().history.filter((h) => (time ? h.time !== time : h.url !== url))
    );
    return cfg().history;
  });
  ipcMain.handle('history:clear', () => {
    store.setHistory([]);
    return [];
  });

  ipcMain.handle('downloads:list', () => cfg().downloads);
  ipcMain.handle('downloads:open', (_event, id) => {
    const item = cfg().downloads.find((d) => d.id === id);
    if (item?.savePath && item.state === 'completed') shell.openPath(item.savePath);
  });
  ipcMain.handle('downloads:show', (_event, id) => {
    const item = cfg().downloads.find((d) => d.id === id);
    if (item?.savePath) shell.showItemInFolder(item.savePath);
  });

  ipcMain.handle('permission:respond', (_event, { id, allow, remember }) => {
    const pending = pendingPermissions.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingPermissions.delete(id);
    pending.resolve(Boolean(allow));
    if (remember) {
      const request = pending.request;
      const key = request?.permission === 'media' ? 'camera' : request?.permission;
      if (key && ['geolocation', 'camera', 'microphone', 'notifications'].includes(key)) {
        store.update({ privacy: { ...cfg().privacy, [key]: allow ? 'allow' : 'deny' } });
        notifySettingsChanged();
      }
    }
  });

  ipcMain.handle('options:get', async () => {
    const c = cfg();
    let windowsState = null;
    try {
      windowsState = await registry.readWindowsState();
    } catch {
      windowsState = null;
    }
    return {
      config: c,
      defaults: store.defaults,
      windowsState,
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      locale: i18n.getLocale(),
      meta: {
        author: AUTHOR_NAME,
        authorUrl: AUTHOR_URL,
        projectUrl: PROJECT_URL,
        version: app.getVersion(),
        chromium: process.versions.chrome,
        electron: process.versions.electron,
        configFile: store.file,
        isDefaultBrowser: app.isDefaultProtocolClient('http'),
        userAgents: buildUserAgents(),
      },
      levels: zones.LEVELS,
      levelOrder: zones.LEVEL_ORDER,
      zoneMeta: zones.ZONE_META,
    };
  });

  ipcMain.handle('options:apply', async (_event, sections) => {
    const saved = await applyAndPersist(sections || {});
    const windowsState = await registry.readWindowsState().catch(() => null);
    return {
      config: saved,
      windowsState,
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
      locale: i18n.getLocale(),
    };
  });

  ipcMain.handle('options:reset', async () => {
    const c = cfg();
    const keep = {
      favorites: c.favorites,
      history: c.history,
      downloads: c.downloads,
      window: c.window,
      session: c.session,
    };
    const defaults = store.defaults;
    const next = {
      ...defaults,
      favorites: keep.favorites,
      history: keep.history,
      downloads: keep.downloads,
      window: keep.window,
      session: keep.session,
      firstRun: false,
      lastVersion: app.getVersion(),
    };
    store.replace(next);
    await applyRuntimeSettings();
    registry.writeWindowsState(cfg()).catch(() => {});
    notifySettingsChanged();
    return cfg();
  });

  ipcMain.handle('options:reset-section', async (_event, section) => {
    const defaults = store.defaults;
    if (!defaults[section]) return cfg();
    store.update({ [section]: defaults[section] });
    await applyRuntimeSettings();
    await registry.writeWindowsState(cfg()).catch(() => {});
    notifySettingsChanged();
    return cfg();
  });

  ipcMain.handle('options:clear-data', async (_event, selection = {}) => {
    const done = [];
    if (selection.history) {
      store.setHistory([]);
      done.push(t('histórico'));
    }
    if (selection.downloads) {
      store.setDownloads([]);
      done.push(t('downloads'));
    }
    for (const ses of allSessions) {
      if (selection.cookies) {
        try {
          await ses.clearStorageData({ storages: ['cookies'] });
        } catch {}
      }
      if (selection.siteData) {
        try {
          await ses.clearStorageData({
            storages: ['localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage', 'shadercache'],
          });
        } catch {}
      }
      if (selection.cache) {
        try {
          await ses.clearCache();
        } catch {}
      }
    }
    if (selection.cookies) done.push(t('cookies'));
    if (selection.cache) done.push(t('cache'));
    if (selection.siteData) done.push(t('dados de sites'));
    broadcastDownloads();
    notifySettingsChanged();
    return { done, historyCount: cfg().history.length };
  });

  ipcMain.handle('options:open-control-panel', () => registry.openControlPanel());
  ipcMain.handle('options:open-certificates', () => registry.openCertificateManager());
  ipcMain.handle('options:open-registry', () => registry.openRegistryEditor());
  ipcMain.handle('options:open-windows-setting', (_event, area) => {
    const allow = {
      network: 'ms-settings:network',
      proxy: 'ms-settings:network-proxy',
      family: 'ms-settings:family-group',
      defaultapps: 'ms-settings:defaultapps',
      vpn: 'ms-settings:network-vpn',
      dialup: 'ms-settings:network-dialup',
      privacy: 'ms-settings:privacy',
    };
    if (allow[area]) shell.openExternal(allow[area]);
  });

  ipcMain.handle('options:test-connection', async (_event, url) => testConnection(url, normalSession));
  ipcMain.handle('options:diagnostics', async (_event, url) => runDiagnostics(url));

  ipcMain.handle('options:set-default-browser', async () => {
    let ok = false;
    try {
      ok = app.setAsDefaultProtocolClient('http') && app.setAsDefaultProtocolClient('https');
      shell.openExternal('ms-settings:defaultapps');
    } catch {
      ok = false;
    }
    return { ok, isDefault: app.isDefaultProtocolClient('http') };
  });

  ipcMain.handle('options:choose-download-dir', async () => {
    const result = await dialog.showOpenDialog(optionsWindow || mainWindow, {
      title: t('Escolher pasta de downloads'),
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: cfg().general.downloadDir || app.getPath('downloads'),
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('options:export', async () => {
    const result = await dialog.showSaveDialog(optionsWindow || mainWindow, {
      title: t('Exportar configurações'),
      defaultPath: path.join(app.getPath('documents'), 'ie-neo-configuracoes.json'),
      filters: [{ name: t(`Configurações do ${APP_NAME}`), extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return null;
    const c = cfg();
    const payload = {
      exportedBy: `${APP_NAME} ${app.getVersion()}`,
      exportedAt: new Date().toISOString(),
      sections: {
        general: c.general,
        zones: c.zones,
        privacy: c.privacy,
        content: c.content,
        connections: c.connections,
        programs: c.programs,
        advanced: c.advanced,
      },
    };
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
    return result.filePath;
  });

  ipcMain.handle('options:import', async () => {
    const result = await dialog.showOpenDialog(optionsWindow || mainWindow, {
      title: t('Importar configurações'),
      properties: ['openFile'],
      filters: [{ name: t(`Configurações do ${APP_NAME}`), extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    try {
      const raw = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
      const sections = raw.sections || raw;
      const saved = await applyAndPersist(sections);
      return { ok: true, config: saved };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('options:addons', () => {
    const c = cfg();
    return [
      {
        id: 'pdf',
        name: t('Visualizador de PDF do Chromium'),
        publisher: 'Microsoft',
        version: process.versions.chrome,
        enabled: true,
        locked: true,
        description: t('Abre arquivos PDF diretamente no navegador.'),
        setting: null,
      },
      {
        id: 'widevine',
        name: t('Módulo de descriptografia de conteúdo Widevine'),
        publisher: 'Google',
        version: '4.10.2891.0',
        enabled: true,
        locked: true,
        description: t('Necessário para reprodução de conteúdo protegido (DRM).'),
        setting: null,
      },
      {
        id: 'feeds',
        name: t('Descoberta de Feeds'),
        publisher: 'Microsoft',
        version: app.getVersion(),
        enabled: c.content.feeds,
        locked: false,
        description: t('Detecta feeds RSS/Atom nas páginas e alimenta o leitor de feeds.'),
        setting: 'content.feeds',
      },
      {
        id: 'compat',
        name: t('Assistente de Compatibilidade'),
        publisher: 'Microsoft',
        version: app.getVersion(),
        enabled: c.advanced.compatView || c.advanced.compatSites.length > 0,
        locked: false,
        description: t(
          'Emula o mecanismo Trident para sites que exigem o Internet Explorer clássico.'
        ),
        setting: 'advanced.compatView',
      },
    ];
  });

  ipcMain.handle('options:toggle-addon', (_event, { id, enabled }) => {
    const c = cfg();
    if (id === 'feeds') store.update({ content: { ...c.content, feeds: enabled } });
    if (id === 'compat') store.update({ advanced: { ...c.advanced, compatView: enabled } });
    notifySettingsChanged();
    return true;
  });

  ipcMain.handle('options:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle('options:restart', () => {
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 120);
    return true;
  });

  ipcMain.handle('site:info', async (_event, url) => {
    const c = cfg();
    const zone = zones.classify(url, c.zones);
    let cookies = 0;
    try {
      const list = await normalSession.cookies.get({ url });
      cookies = list.length;
    } catch {
      cookies = 0;
    }
    const userAgents = buildUserAgents();
    return {
      zone: { id: zone.zoneId, label: zone.label, level: zone.level, protectedMode: zone.protectedMode },
      cookies,
      https: /^https:/i.test(url),
      ua: userAgents[c.advanced.userAgentMode] || userAgents.neo,
      compat: c.advanced.compatView || c.advanced.compatSites.some((s) => zones.matches(zones.hostOf(url), s)),
    };
  });

  ipcMain.handle('feed:fetch', async (_event, url) => {
    try {
      const response = await net.fetch(url, {
        session: normalSession,
        headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      const text = await response.text();
      return { ok: true, text: text.slice(0, 2_000_000), finalUrl: response.url };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('diag:run', async (_event, url) => runDiagnostics(url));

  ipcMain.handle('print:page', async (event, webContentsId) => {
    const target = webContents.fromId(Number(webContentsId));
    if (!target) return false;
    return new Promise((resolve) => {
      target.print({ silent: false, printBackground: true }, (success) => resolve(success));
    });
  });

  ipcMain.handle('devtools:open', async (_event, webContentsId) => {
    const target = webContents.fromId(Number(webContentsId));
    if (target) target.openDevTools({ mode: 'detach' });
  });

  ipcMain.handle('shell:open-path', (_event, target) => shell.openPath(target));

  ipcMain.handle('clipboard:write', (event, text) => {
    require('electron').clipboard.writeText(String(text || ''));
    return true;
  });

  let currentTabRequest = null;
  ipcMain.handle('browser:current-tab', async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return null;
    return new Promise((resolve) => {
      const requestId = `q-${Date.now()}`;
      const timer = setTimeout(() => {
        currentTabRequest = null;
        resolve(null);
      }, 3000);
      currentTabRequest = { requestId, resolve, timer };
      mainWindow.webContents.send('query:current-tab', { requestId });
    });
  });

  ipcMain.on('browser:current-tab:reply', (_event, payload) => {
    if (!currentTabRequest || payload?.requestId !== currentTabRequest.requestId) return;
    clearTimeout(currentTabRequest.timer);
    currentTabRequest.resolve(payload.tab || null);
    currentTabRequest = null;
  });
}

function buildUserAgents() {
  const chrome = process.versions.chrome;
  const chromiumUA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chrome} Safari/537.36`;
  return {
    neo: `${chromiumUA} IENeo/1.0`,
    ie11: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    edge: `${chromiumUA} Edg/${chrome.split('.')[0]}.0.0.0`,
    custom: '',
  };
}

/* ------------------------------------------------------------------ */
/* Ciclo de vida                                                       */
/* ------------------------------------------------------------------ */

async function clearBrowsingDataOnExit() {
  store.setHistory([]);
  for (const ses of allSessions) {
    try {
      await ses.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage'] });
      await ses.clearCache();
    } catch {}
  }
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = argv.find((arg) => /^https?:\/\//i.test(arg));
    if (url) sendToChrome('open-url', { url, newTab: true });
  });

  app.whenReady().then(async () => {
    initSessions();
    registerInternalProtocol(allSessions);
    registerIpc();

    nativeTheme.on('updated', () => {
      updateWindowBackgrounds();
      notifyThemeChanged();
    });

    // Menu invisível: mantém atalhos de edição nativos nos campos de texto.
    buildApplicationMenu();

    await applyRuntimeSettings();

    const doh = cfg().advanced.doh;
    if (doh && doh !== 'auto') {
      const servers = {
        cloudflare: 'https://cloudflare-dns.com/dns-query',
        google: 'https://dns.google/dns-query',
      };
      if (servers[doh]) {
        try {
          app.configureHostResolver({ secureDnsMode: 'secure', secureDnsServers: [servers[doh]] });
        } catch {}
      }
    }

    // Primeira execução: importa a página inicial já configurada no Windows.
    if (cfg().firstRun) {
      firstLaunch = true;
      welcomePending = true;
      try {
        const win = await registry.readWindowsState();
        // Ignora a página inicial padrão da Microsoft para que o IE Neo
        // continue abrindo a nova guia em instalações novas.
        if (
          win.startPage &&
          /^https?:/i.test(win.startPage) &&
          !win.startPage.includes('go.microsoft.com') &&
          !/^https?:\/\/(?:www\.)?msn\.com(?:\/|$)/i.test(win.startPage)
        ) {
          store.update({ general: { ...cfg().general, homePage: win.startPage } });
        }
        if (win.proxyEnabled && win.proxyServer) {
          store.update({
            connections: {
              ...cfg().connections,
              proxy: { ...cfg().connections.proxy, enabled: true, server: win.proxyServer, bypass: win.proxyOverride || cfg().connections.proxy.bypass, autoConfigUrl: win.autoConfigUrl || '' },
            },
          });
        }
      } catch {
        /* sem registro acessível */
      }
      store.update({ firstRun: false, lastVersion: app.getVersion() });
      store.saveNow();
    }

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', (event) => {
    store.saveNow();
    if (cfg().general.clearHistoryOnExit && !quittingAfterCleanup) {
      event.preventDefault();
      quittingAfterCleanup = true;
      clearBrowsingDataOnExit().finally(() => app.quit());
    }
  });

  app.on('will-quit', () => {
    store.saveNow();
  });
}

'use strict';

/**
 * Ponte entre as "Opções da Internet" e a pilha de rede do Chromium.
 * Tudo aqui tem efeito real: proxy, DNT, cookies, HTTPS, permissões.
 */
const { net } = require('electron');
const { classify, hostOf, isPrivateHost, matches } = require('./zones');

const PERMISSION_MAP = {
  geolocation: 'geolocation',
  notifications: 'notifications',
  media: 'media',
  camera: 'camera',
  microphone: 'microphone',
};

function siteKey(host) {
  if (!host) return '';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return host;
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const twoLevel = new Set(['com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'co.uk', 'com.au', 'co.jp']);
  const lastTwo = parts.slice(-2).join('.');
  if (twoLevel.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

function perSiteRule(host, rules) {
  for (const rule of rules || []) {
    if (!rule || !rule.domain) continue;
    if (matches(host, rule.domain) || siteKey(host) === siteKey(rule.domain)) return rule;
  }
  return null;
}

function shouldBlockCookies(url, topUrl, cfg) {
  const host = hostOf(url);
  if (!host) return false;
  const level = cfg.privacy.cookieLevel;
  const rule = perSiteRule(host, cfg.privacy.perSite);
  if (rule) {
    if (rule.action === 'block') return true;
    if (rule.action === 'allow' || rule.action === 'session') return false;
  }
  if (level === 'block-all') return true;
  if (level === 'accept-all') return false;

  const topHost = topUrl ? hostOf(topUrl) : '';
  const thirdParty = Boolean(topHost) && siteKey(topHost) !== siteKey(host);
  if (!thirdParty) return false;
  return level === 'high' || level === 'medium-high';
}

function permissionSetting(cfg, permission, details) {
  let key = PERMISSION_MAP[permission];
  if (permission === 'media') {
    const types = details?.mediaTypes || [];
    if (types.includes('video') && !types.includes('audio')) key = 'camera';
    else if (types.includes('audio') && !types.includes('video')) key = 'microphone';
    else key = 'camera';
  }
  return key && cfg.privacy[key] ? cfg.privacy[key] : null;
}

function defaultPermission(permission) {
  const allowed = new Set([
    'fullscreen',
    'clipboard-sanitized-write',
    'pointerLock',
    'keyboardLock',
    'idle-detection',
    'storage-access',
    'top-level-storage-access',
    'mediaKeySystem',
  ]);
  if (allowed.has(permission)) return 'allow';
  if (permission === 'openExternal') return 'allow';
  return 'deny';
}

function createSessionConfigurator({ getConfig, promptPermission, isPrivateSession = false }) {
  return function configureSession(ses) {
    const cfg = () => getConfig();

    ses.setSpellCheckerEnabled(true);
    try {
      ses.setSpellCheckerLanguages(['pt-BR', 'en-US']);
    } catch {}

    ses.setPermissionRequestHandler(async (webContents, permission, callback, details) => {
      const cfgNow = cfg();
      const requestingUrl = details?.requestingUrl || webContents?.getURL?.() || '';
      const zone = classify(requestingUrl, cfgNow.zones);
      if (zone.zoneId === 'restricted') return callback(false);
      if (zone.zoneId === 'trusted') return callback(defaultPermission(permission) === 'allow');

      const setting = permissionSetting(cfgNow, permission, details);
      if (!setting) return callback(defaultPermission(permission) === 'allow');
      if (setting === 'allow') return callback(true);
      if (setting === 'deny') return callback(false);

      if (zone.zoneId === 'trusted' && permission !== 'media') return callback(true);
      if (!promptPermission) return callback(false);
      try {
        const answer = await promptPermission({
          permission,
          requestingUrl,
          zone,
          mediaTypes: details?.mediaTypes || [],
        });
        callback(Boolean(answer));
      } catch {
        callback(false);
      }
    });

    ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
      const cfgNow = cfg();
      const zone = classify(requestingOrigin || '', cfgNow.zones);
      if (zone.zoneId === 'restricted') return false;
      const setting = permissionSetting(cfgNow, permission, null);
      if (setting === 'allow' || setting === 'deny') return setting === 'allow';
      return defaultPermission(permission) === 'allow';
    });

    ses.webRequest.onBeforeRequest((details, callback) => {
      const cfgNow = cfg();
      if (!cfgNow.advanced.httpsOnly) return callback({});
      if (!/^http:\/\//i.test(details.url)) return callback({});
      if (isPrivateHost(hostOf(details.url))) return callback({});
      return callback({ redirectURL: details.url.replace(/^http:/i, 'https:') });
    });

    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      const cfgNow = cfg();
      const headers = { ...details.requestHeaders };
      if (cfgNow.privacy.sendDNT) {
        headers.DNT = '1';
        headers['Sec-GPC'] = '1';
      }
      const host = hostOf(details.url);
      const perSite = perSiteRule(host, cfgNow.privacy.perSite);
      const blockCookies = shouldBlockCookies(details.url, details.frame?.top?.url || details.webContents?.getURL?.() || '', cfgNow);
      if (blockCookies || perSite?.action === 'block') {
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === 'cookie') delete headers[key];
        }
      }
      callback({ requestHeaders: headers });
    });

    ses.webRequest.onHeadersReceived((details, callback) => {
      const cfgNow = cfg();
      const topUrl = details.frame?.top?.url || details.webContents?.getURL?.() || details.url;
      const perSite = perSiteRule(hostOf(details.url), cfgNow.privacy.perSite);
      const blockCookies =
        shouldBlockCookies(details.url, topUrl, cfgNow) || perSite?.action === 'block';
      if (!blockCookies) return callback({});

      const responseHeaders = {};
      for (const [name, value] of Object.entries(details.responseHeaders || {})) {
        const lower = name.toLowerCase();
        if (lower === 'set-cookie' || lower === 'set-cookie2') continue;
        responseHeaders[name] = value;
      }
      callback({ responseHeaders });
    });

  };
}

async function applyProxy(ses, cfg) {
  const proxy = cfg.connections.proxy || {};
  try {
    if (proxy.autoConfigUrl) {
      await ses.setProxy({
        mode: 'pac_script',
        pacScript: proxy.autoConfigUrl,
        proxyBypassRules: proxy.bypass || '',
      });
    } else if (proxy.enabled && proxy.server) {
      await ses.setProxy({
        mode: 'fixed_servers',
        proxyRules: proxy.server,
        proxyBypassRules: proxy.bypass || '',
      });
    } else if (cfg.connections.autoDetect) {
      await ses.setProxy({ mode: 'auto_detect' });
    } else {
      await ses.setProxy({ mode: 'direct' });
    }
    return true;
  } catch (err) {
    console.error('[rede] falha ao aplicar proxy:', err.message);
    return false;
  }
}

async function testConnection(url = 'https://duckduckgo.com', ses = null, timeout = 12000) {
  const started = Date.now();
  try {
    const options = { signal: AbortSignal.timeout(timeout) };
    if (ses) options.session = ses;
    const response = await net.fetch(url, options);
    return {
      ok: response.ok,
      status: response.status,
      elapsed: Date.now() - started,
      url: response.url,
    };
  } catch (err) {
    return { ok: false, error: err.message, elapsed: Date.now() - started };
  }
}

module.exports = {
  createSessionConfigurator,
  applyProxy,
  testConnection,
  shouldBlockCookies,
  siteKey,
};

'use strict';

/**
 * Integração real com as chaves do Registro do Windows usadas pelo painel
 * "Opções da Internet" (inetcpl.cpl). Apenas valores por usuário (HKCU),
 * que é exatamente o escopo do painel clássico.
 */
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const MAIN_KEY = 'HKCU\\Software\\Microsoft\\Internet Explorer\\Main';
const SETTINGS_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

function decode(buffer) {
  if (!buffer || !buffer.length) return '';
  // reg.exe emite UTF-16LE quando a saída é redirecionada.
  let zeros = 0;
  for (let i = 1; i < Math.min(buffer.length, 400); i += 2) if (buffer[i] === 0) zeros += 1;
  if (zeros > 20) return buffer.toString('ucs2');
  return buffer.toString('latin1');
}

async function reg(args) {
  try {
    const { stdout } = await execFileAsync('reg.exe', args, {
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'buffer',
    });
    return decode(stdout);
  } catch (err) {
    const out = err.stdout ? decode(err.stdout) : '';
    return out;
  }
}

function parseValues(text) {
  const map = {};
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^\s{2,}(.+?)\s{4}(REG_[A-Z_]+)\s{4}(.*)$/);
    if (!match) continue;
    const [, name, type, raw] = match;
    let value = raw;
    if (type === 'REG_DWORD') value = parseInt(raw.replace(/^0x/i, ''), 16);
    if (type === 'REG_NONE') value = '';
    map[name] = { type, value };
  }
  return map;
}

async function readKey(key) {
  return parseValues(await reg(['query', key]));
}

async function readValue(key, name) {
  const values = await readKey(key);
  return values[name] ? values[name].value : null;
}

async function writeValue(key, name, value, type = 'REG_SZ') {
  const data = type === 'REG_DWORD' ? `0x${Number(value).toString(16)}` : String(value);
  await reg(['add', key, '/v', name, '/t', type, '/d', data, '/f']);
}

async function deleteValue(key, name) {
  await reg(['delete', key, '/v', name, '/f']);
}

/** Lê o estado que o Windows já tem configurado. */
async function readWindowsState() {
  const [main, settings] = await Promise.all([readKey(MAIN_KEY), readKey(SETTINGS_KEY)]);
  return {
    startPage: main['Start Page']?.value || '',
    searchPage: main['Search Page']?.value || '',
    defaultPageUrl: main['Default_Page_URL']?.value || '',
    proxyEnabled: Number(settings.ProxyEnable?.value || 0) === 1,
    proxyServer: settings.ProxyServer?.value || '',
    proxyOverride: settings.ProxyOverride?.value || '',
    autoConfigUrl: settings.AutoConfigURL?.value || '',
    userAgent: settings['User Agent']?.value || '',
  };
}

/** Aplica as preferências do navegador no painel do Windows. */
async function writeWindowsState(cfg) {
  const jobs = [];
  const home = cfg.general?.homePage;
  // Start Page/Default_Page_URL são consumidos pelo Windows e por outros
  // navegadores: uma rota interna como ie://newtab não faz sentido lá. Nesse
  // caso o valor já existente no Registro é preservado.
  const homeIsWeb = /^https?:\/\//i.test(home || '');
  if (homeIsWeb) jobs.push(writeValue(MAIN_KEY, 'Start Page', home));
  if (homeIsWeb) jobs.push(writeValue(MAIN_KEY, 'Default_Page_URL', home));
  const search = cfg.general?.searchUrl?.replace('{searchTerms}', '');
  if (search) jobs.push(writeValue(MAIN_KEY, 'Search Page', search));

  const proxy = cfg.connections?.proxy || {};
  const autoDetect = cfg.connections?.autoDetect !== false;
  jobs.push(writeValue(SETTINGS_KEY, 'ProxyEnable', proxy.enabled ? 1 : 0, 'REG_DWORD'));
  if (proxy.server) jobs.push(writeValue(SETTINGS_KEY, 'ProxyServer', proxy.server));
  if (proxy.bypass) jobs.push(writeValue(SETTINGS_KEY, 'ProxyOverride', proxy.bypass));
  if (proxy.autoConfigUrl) {
    jobs.push(writeValue(SETTINGS_KEY, 'AutoConfigURL', proxy.autoConfigUrl));
  } else {
    jobs.push(deleteValue(SETTINGS_KEY, 'AutoConfigURL'));
  }
  jobs.push(writeValue(SETTINGS_KEY, 'AutoDetect', autoDetect ? 1 : 0, 'REG_DWORD'));

  await Promise.allSettled(jobs);
}

async function openControlPanel() {
  // Abre o painel clássico para quem quiser conferir/ajustar no Windows.
  return new Promise((resolve) => {
    execFile('rundll32.exe', ['shell32.dll,Control_RunDLL', 'inetcpl.cpl'], { windowsHide: false }, (err) =>
      resolve(!err)
    );
  });
}

async function openCertificateManager() {
  return new Promise((resolve) => {
    execFile('certmgr.msc', [], { shell: true }, (err) => resolve(!err));
  });
}

async function openRegistryEditor() {
  return new Promise((resolve) => {
    execFile('regedt32.exe', [], { windowsHide: false }, (err) => resolve(!err));
  });
}

module.exports = {
  readWindowsState,
  writeWindowsState,
  openControlPanel,
  openCertificateManager,
  openRegistryEditor,
  readValue,
  MAIN_KEY,
  SETTINGS_KEY,
};

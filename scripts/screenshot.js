'use strict';

/**
 * Smoke test visual do IE Neo.
 * Uso: npm run shot
 */
const { _electron: electron } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const PROFILE = path.join(os.tmpdir(), 'ie-neo-shot-profile');
const SHOT_THEME = process.env.IENEO_SHOT_THEME || 'light';
const PREFIX = process.env.IENEO_SHOT_THEME ? `${SHOT_THEME}-` : '';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Só nos interessam erros gerados pelo próprio app. Páginas externas
// (MSN, sites de terceiros) podem registrar erros de console legítimos que
// não dizem respeito ao IE Neo.
function isInternalLocation(url) {
  if (!url) return true;
  return (
    url.startsWith('file://') ||
    url.startsWith('ie://') ||
    url.startsWith('devtools://') ||
    url.startsWith('chrome-extension://')
  );
}

function collectConsole(errors, page, label) {
  page.on('pageerror', (err) => errors.push(`${label} pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    let url = '';
    try {
      url = msg.location().url || '';
    } catch {
      url = '';
    }
    if (!isInternalLocation(url)) return;
    errors.push(`${label} console: ${msg.text()}`);
  });
}

async function capture(window, name) {
  await sleep(350);
  const file = path.join(SHOTS, `${PREFIX}${name}.png`);
  await window.screenshot({ path: file });
  console.log(`[shot] ${path.relative(ROOT, file)}`);
}

async function captureBrowser(app, name) {
  await sleep(500);
  const dataUrl = await app.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const image = await win.webContents.capturePage();
    return image.toDataURL();
  });
  const file = path.join(SHOTS, `${PREFIX}${name}.png`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`[shot] ${path.relative(ROOT, file)}`);
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.rmSync(PROFILE, { recursive: true, force: true });
  fs.mkdirSync(PROFILE, { recursive: true });
  fs.writeFileSync(
    path.join(PROFILE, 'internet-explorer.json'),
    JSON.stringify({ schema: 2, general: { theme: SHOT_THEME, language: 'en-US' } }),
    'utf8'
  );
  const errors = [];

  const app = await electron.launch({
    executablePath: require('electron'),
    args: [ROOT],
    cwd: ROOT,
    env: { ...process.env, IENEO_USER_DATA: PROFILE },
    timeout: 60000,
  });

  const browser = await app.firstWindow();
  collectConsole(errors, browser, 'browser');
  await browser.waitForLoadState('domcontentloaded');
  await sleep(1200);
  await browser.keyboard.press('Escape');
  await sleep(300);
  await captureBrowser(app, '01b-browser-welcome');

  // Nova guia interna, para não depender da rede.
  await browser.evaluate(() => {
    if (typeof runAction === 'function') runAction('new-tab');
  });
  await sleep(2600);
  await browser.keyboard.press('Escape');
  await sleep(400);
  await captureBrowser(app, '01-browser-newtab');

  // Abre as Opções da Internet pela ponte do navegador.
  await browser.evaluate(() => window.ie.openOptions('general'));
  await sleep(1200);

  let options = null;
  for (const page of app.windows()) {
    const title = await page.title().catch(() => '');
    if (title.includes('Internet Options') || title.includes('Opções')) {
      options = page;
      break;
    }
  }
  if (!options) throw new Error('A janela de Opções da Internet não abriu.');

  collectConsole(errors, options, 'options');
  await options.waitForLoadState('domcontentloaded');
  await sleep(900);
  await capture(options, '02-options-general');

  // Rola até o seletor de idioma para registrar a nova opção.
  await options.evaluate(() => {
    document.querySelector('[data-path="general.language"]')?.scrollIntoView({ block: 'center' });
  });
  await sleep(350);
  await capture(options, '02b-options-language');
  await options.evaluate(() => {
    document.getElementById('opt-main')?.scrollTo({ top: 0 });
  });
  await sleep(300);

  const sections = [
    ['security', '03-options-security'],
    ['privacy', '04-options-privacy'],
    ['content', '05-options-content'],
    ['connections', '06-options-connections'],
    ['programs', '07-options-programs'],
    ['advanced', '08-options-advanced'],
  ];

  for (const [section, name] of sections) {
    await options.click(`.opt-nav-item[data-section="${section}"]`);
    await sleep(500);
    await capture(options, name);
  }

  // Abre o gerenciador de cookies para conferir o modal.
  await options.click('.opt-nav-item[data-section="privacy"]');
  await sleep(300);
  await options.click('#privacy-cookie-sites');
  await sleep(400);
  await capture(options, '09-options-cookie-modal');
  await options.keyboard.press('Escape');

  const unique = [...new Set(errors)];
  const summary = unique.length ? unique : ['Sem erros de console.'];
  console.log('\n[resultado]');
  summary.forEach((line) => console.log(` - ${line}`));

  await app.close();
  try {
    fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    /* arquivos ainda em uso pelo Chromium */
  }
  if (unique.length) process.exitCode = 1;
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
});

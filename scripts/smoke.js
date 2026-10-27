'use strict';

/**
 * Teste funcional do IE Neo e das Opções da Internet.
 * Uso: node scripts/smoke.js
 */
const { _electron: electron } = require('playwright-core');
const { execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(os.tmpdir(), 'ie-neo-smoke-profile');
const MAIN_KEY = 'HKCU\\Software\\Microsoft\\Internet Explorer\\Main';
const SETTINGS_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(`FALHA: ${message}`);
  console.log(`[ok] ${message}`);
}

function regSet(key, name, value, type = 'REG_SZ') {
  if (value == null || value === '') {
    try {
      execFileSync('reg.exe', ['delete', key, '/v', name, '/f'], { windowsHide: true, stdio: 'ignore' });
    } catch {
      /* valor já ausente */
    }
    return;
  }
  execFileSync('reg.exe', ['add', key, '/v', name, '/t', type, '/d', String(value), '/f'], {
    windowsHide: true,
    stdio: 'ignore',
  });
}

function restoreRegistry(original) {
  if (!original) return;
  regSet(MAIN_KEY, 'Start Page', original.startPage);
  regSet(MAIN_KEY, 'Search Page', original.searchPage);
  regSet(MAIN_KEY, 'Default_Page_URL', original.defaultPageUrl);
  regSet(SETTINGS_KEY, 'ProxyEnable', original.proxyEnabled ? 1 : 0, 'REG_DWORD');
  regSet(SETTINGS_KEY, 'ProxyServer', original.proxyServer);
  regSet(SETTINGS_KEY, 'ProxyOverride', original.proxyOverride);
  regSet(SETTINGS_KEY, 'AutoConfigURL', original.autoConfigUrl);
  console.log('[ok] valores originais do Registro restaurados');
}

async function findOptionsWindow(app) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    for (const page of app.windows()) {
      const title = await page.title().catch(() => '');
      if (title.includes('Internet Options') || title.includes('Opções da Internet')) return page;
    }
    await sleep(250);
  }
  throw new Error('A janela de Opções da Internet não abriu.');
}

async function openOptions(app, browser, section) {
  await browser.evaluate((target) => window.ie.openOptions(target), section);
  const page = await findOptionsWindow(app);
  await page.waitForLoadState('domcontentloaded');
  await sleep(500);
  return page;
}

async function waitForToast(page, text) {
  await page.waitForFunction(
    (expected) => {
      const toast = document.getElementById('opt-toast');
      return toast && !toast.hidden && toast.textContent.includes(expected);
    },
    text,
    { timeout: 15000 }
  );
}

async function main() {
  let original = null;
  fs.rmSync(PROFILE, { recursive: true, force: true });
  const app = await electron.launch({
    executablePath: require('electron'),
    args: [ROOT],
    cwd: ROOT,
    env: { ...process.env, IENEO_USER_DATA: PROFILE },
    timeout: 60000,
  });

  try {
    const browser = await app.firstWindow();
    await browser.waitForLoadState('domcontentloaded');
    await sleep(2200);
    await browser.keyboard.press('Escape');

    const newtab = await browser.evaluate(async () => {
      const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
      const url = (() => {
        try {
          return wv.getURL();
        } catch {
          return '';
        }
      })();
      const title = await wv.executeJavaScript('document.title');
      const text = await wv.executeJavaScript('document.body.innerText');
      const welcome = await wv.executeJavaScript(`(() => {
        const panel = document.getElementById('nt-welcome');
        const link = document.getElementById('nt-welcome-project');
        const visible = Boolean(panel && !panel.hidden);
        const details = panel ? panel.innerText : '';
        const project = link ? link.href : '';
        document.getElementById('nt-welcome-close')?.click();
        const dismissed = Boolean(panel && panel.hidden);
        return { visible, details, project, dismissed };
      })()`);
      return { url, title, text, welcome };
    });
    assert(newtab.url.startsWith('ie://newtab'), 'nova guia usa o protocolo interno ie://');
    assert(
      (await browser.locator('#address').inputValue()) === '',
      'barra de endereços fica vazia na nova guia'
    );
    assert(newtab.title === 'New tab' || newtab.title === 'Nova guia', 'página de nova guia carregou');
    assert(
      /Good (morning|afternoon|evening)|Boa (tarde|noite)|Bom dia/.test(newtab.text),
      'saudação da nova guia foi renderizada'
    );
    assert(
      newtab.welcome.visible && /FGOMESX/.test(newtab.welcome.details),
      'boas-vindas da primeira execução citam FGOMESX'
    );
    assert(
      newtab.welcome.project === 'https://github.com/fgomesx/ie-neo',
      'boas-vindas ligam à página do projeto'
    );
    assert(newtab.welcome.dismissed, 'boas-vindas podem ser fechadas');
    assert(/Conheça o IE Neo|Meet IE Neo/.test(newtab.text), 'nova guia destaca o projeto');
    assert(/About project|Sobre o projeto/.test(newtab.text), 'seção de projeto usa o título About project');
    assert(!/MSN|Bing/i.test(newtab.text), 'nova guia não referencia MSN ou Bing');

    // O cartão de projeto abre a janela Sobre pela rota interna ie://about.
    const aboutCard = await browser.evaluate(async () => {
      const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
      return wv.executeJavaScript(`(() => {
        const link = document.querySelector('a[href="ie://about"]');
        if (!link) return false;
        link.click();
        return true;
      })()`);
    });
    await sleep(800);
    const aboutRoute = await browser.evaluate(() => document.getElementById('modal-root')?.innerText || '');
    assert(
      aboutCard && /FGOMESX/.test(aboutRoute) && /Versão|Version/.test(aboutRoute),
      'cartão Sobre abre a janela interna ie://about'
    );
    await browser.evaluate(() => closeModal());
    await sleep(250);

    await browser.evaluate(() => showAboutModal());
    await sleep(250);
    const about = await browser.evaluate(() => document.getElementById('modal-root')?.innerText || '');
    assert(
      about.includes('FGOMESX') && /Developer|Desenvolvedor/.test(about),
      'modal Sobre credita o desenvolvedor FGOMESX'
    );
    const aboutLink = await browser.evaluate(() => document.querySelector('.about-link')?.href || '');
    assert(aboutLink === 'https://github.com/fgomesx', 'modal Sobre liga ao perfil de FGOMESX');
    const projectLink = await browser.evaluate(
      () => document.querySelector('a.about-link[href="https://github.com/fgomesx/ie-neo"]')?.href || ''
    );
    assert(projectLink === 'https://github.com/fgomesx/ie-neo', 'modal Sobre liga à página do projeto');
    await browser.evaluate(() => closeModal());
    await sleep(250);

    // O cartão "Make it yours" alterna Claro → Escuro → Automático sem abrir Opções.
    const clickThemeCard = () =>
      browser.evaluate(() => {
        const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
        return wv.executeJavaScript(`(() => {
          const card = document.getElementById('nt-theme-card');
          if (!card) return false;
          card.click();
          return true;
        })()`);
      });
    const readTheme = () =>
      browser.evaluate(async () => {
        const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
        const page = await wv.executeJavaScript(`({
          label: document.getElementById('nt-theme-label')?.textContent || '',
          resolved: document.documentElement.dataset.theme || '',
        })`);
        const startup = await window.ie.startup();
        return { ...page, mode: startup.config.general.theme };
      });

    await clickThemeCard();
    await sleep(700);
    const lightTheme = await readTheme();
    assert(lightTheme.mode === 'light' && lightTheme.resolved === 'light', 'cartão de tema muda para claro');
    assert(/Light|Claro/.test(lightTheme.label), 'cartão de tema mostra o modo claro');

    await clickThemeCard();
    await sleep(700);
    const darkTheme = await readTheme();
    assert(darkTheme.mode === 'dark' && darkTheme.resolved === 'dark', 'cartão de tema muda para escuro');
    assert(/Dark|Escuro/.test(darkTheme.label), 'cartão de tema mostra o modo escuro');

    await clickThemeCard();
    await sleep(700);
    const systemTheme = await readTheme();
    assert(systemTheme.mode === 'system', 'cartão de tema volta para automático');
    assert(/Automatic|Automático/.test(systemTheme.label), 'cartão de tema mostra o modo automático');
    assert(
      !app.windows().some((page) => page.url().includes('options.html')),
      'cartão de tema não abre as Opções'
    );

    // Ctrl+1 deve ativar a primeira guia, sem navegar para a página inicial.
    const tabCount = await browser.locator('.tab').count();
    await browser.click('#newtab-btn');
    await sleep(700);
    assert((await browser.locator('.tab').count()) === tabCount + 1, 'nova guia adicional foi criada');

    // Atalho no chrome: Ctrl+1 ativa a primeira guia.
    await browser.evaluate(() => document.getElementById('address').focus());
    await browser.keyboard.press('Control+1');
    await sleep(500);
    const chromeFirst = await browser.evaluate(() =>
      document.querySelector('#tabstrip .tab')?.classList.contains('active')
    );
    assert(Boolean(chromeFirst), 'Ctrl+1 alterna para a primeira guia');

    // Atalho na webview: o processo principal encaminha Ctrl+2/Ctrl+1 ao chrome.
    await browser.evaluate(() => {
      const wv = document.querySelector('.view:not([hidden]) webview');
      if (wv) wv.focus();
    });
    await app.evaluate(({ webContents }) => {
      const guests = webContents.getAllWebContents().filter((wc) => wc.getType() === 'webview');
      const guest = guests.find((wc) => wc.isFocused()) || guests[0];
      guest?.sendInputEvent({ type: 'keyDown', keyCode: '2', modifiers: ['control'] });
      guest?.sendInputEvent({ type: 'keyUp', keyCode: '2', modifiers: ['control'] });
    });
    await sleep(500);
    const webviewSecond = await browser.evaluate(() =>
      document.querySelectorAll('#tabstrip .tab')[1]?.classList.contains('active')
    );
    assert(Boolean(webviewSecond), 'Ctrl+2 na webview ativa a segunda guia');
    await app.evaluate(({ webContents }) => {
      const guests = webContents.getAllWebContents().filter((wc) => wc.getType() === 'webview');
      const guest = guests.find((wc) => wc.isFocused()) || guests[0];
      guest?.sendInputEvent({ type: 'keyDown', keyCode: '1', modifiers: ['control'] });
      guest?.sendInputEvent({ type: 'keyUp', keyCode: '1', modifiers: ['control'] });
    });
    await sleep(500);
    const webviewFirst = await browser.evaluate(() =>
      document.querySelector('#tabstrip .tab')?.classList.contains('active')
    );
    assert(Boolean(webviewFirst), 'Ctrl+1 na webview não abre a página inicial');

    let options = await openOptions(app, browser, 'general');
    const info = await options.evaluate(() => window.ieOptions.get());
    original = info.windowsState;
    assert(original && typeof original.startPage === 'string', 'estado do Windows foi lido');
    assert(typeof info.config.general.homePage === 'string' && info.config.general.homePage.length > 0, 'configuração inicial foi lida');
    assert(info.config.general.homePage === 'ie://newtab', 'página inicial padrão é ie://newtab');
    assert(info.config.general.searchProvider === 'duckduckgo', 'DuckDuckGo é o provedor de busca padrão');
    assert(
      info.config.general.searchUrl.includes('duckduckgo.com'),
      'URL de pesquisa padrão aponta para o DuckDuckGo'
    );
    assert(info.meta.version === '1.0.0', 'versão do aplicativo é 1.0.0');
    assert(['light', 'dark', 'system'].includes(info.config.general.theme), 'tema inicial é válido');
    assert(info.config.general.language === 'en-US', 'idioma inicial é inglês (en-US)');
    assert(info.locale === 'en-US', 'processo principal expõe o idioma atual');
    assert(info.meta.author === 'FGOMESX', 'metadados expõem o desenvolvedor FGOMESX');
    const favTitles = info.config.favorites.map((fav) => fav.title);
    assert(
      !favTitles.includes('IE Neo') && !favTitles.includes('FGOMESX'),
      'favoritos padrão não trazem IE Neo nem FGOMESX'
    );
    assert(
      favTitles[favTitles.indexOf('GitHub') + 1] === 'Reddit',
      'Reddit aparece logo depois do GitHub nos favoritos padrão'
    );

    // Aplica uma mudança reversível e confere a gravação no Registro.
    const toggle = options.locator('[data-path="general.askDownloadLocation"]');
    const before = await toggle.isChecked();
    await toggle.setChecked(!before);
    assert(await options.locator('#opt-apply').isEnabled(), 'botão Aplicar ativa quando há alterações');
    await options.locator('#opt-apply').click();
    await waitForToast(options, 'Settings applied');
    const applied = await options.evaluate(() => window.ieOptions.get());
    assert(applied.config.general.askDownloadLocation === !before, 'preferência aplicada foi persistida');
    // A página inicial interna (ie://newtab) não deve sobrescrever o valor do
    // Windows; a URL de pesquisa em http continua sendo espelhada.
    assert(
      applied.windowsState.startPage === original.startPage,
      'Start Page do Windows é preservada quando a página inicial é interna'
    );
    assert(
      applied.windowsState.searchPage.includes('duckduckgo.com'),
      'Search Page foi gravada no Registro do Windows'
    );

    // Restaura a seção Geral e confere o retorno ao padrão.
    await options.locator('#opt-section-reset').click();
    await sleep(250);
    await options.locator('.opt-modal [data-action="1"]').click();
    await waitForToast(options, 'General section restored');
    const restored = await options.evaluate(() => window.ieOptions.get());
    assert(
      restored.config.general.askDownloadLocation === info.defaults.general.askDownloadLocation,
      'Restaurar seção volta aos valores padrão'
    );

    // Alternância de idioma: aplica pt-BR, confere a UI ao vivo e volta ao inglês.
    const languageSelect = options.locator('[data-path="general.language"]');
    assert((await languageSelect.inputValue()) === 'en-US', 'seletor de idioma mostra inglês');
    await languageSelect.selectOption('pt-BR');
    await options.locator('#opt-apply').click();
    await waitForToast(options, 'Configurações aplicadas');
    const portuguese = await options.evaluate(() => window.ieOptions.get());
    assert(portuguese.config.general.language === 'pt-BR', 'idioma português foi persistido');
    await browser.waitForFunction(() => document.documentElement.lang === 'pt-BR');
    assert(
      (await browser.locator('#newtab-btn').getAttribute('aria-label')) === 'Nova guia',
      'chrome reaplica o idioma sem recarregar'
    );
    const ptTitles = await browser.locator('.tab-title').allInnerTexts();
    assert(ptTitles.includes('Nova guia'), 'título da aba de nova guia acompanha o idioma');
    await sleep(600);
    const ptNewtab = await browser.evaluate(async () => {
      const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
      return {
        lang: await wv.executeJavaScript('document.documentElement.lang'),
        text: await wv.executeJavaScript('document.body.innerText'),
      };
    });
    assert(ptNewtab.lang === 'pt-BR', 'nova guia aberta acompanha o idioma');
    assert(
      /Bom dia|Boa (tarde|noite)/.test(ptNewtab.text),
      'saudação da nova guia é traduzida ao vivo'
    );
    assert(
      (await options.locator('h1').innerText()).includes('Opções da Internet'),
      'janela de Opções reaplica o idioma'
    );
    await options.locator('[data-path="general.language"]').selectOption('en-US');
    await options.locator('#opt-apply').click();
    await waitForToast(options, 'Settings applied');
    await browser.waitForFunction(() => document.documentElement.lang === 'en-US');
    assert(
      (await browser.locator('#newtab-btn').getAttribute('aria-label')) === 'New tab',
      'idioma volta ao inglês'
    );
    const enTitles = await browser.locator('.tab-title').allInnerTexts();
    assert(enTitles.includes('New tab'), 'título da aba volta ao inglês');
    await sleep(600);
    const enNewtab = await browser.evaluate(async () => {
      const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
      return {
        lang: await wv.executeJavaScript('document.documentElement.lang'),
        text: await wv.executeJavaScript('document.body.innerText'),
      };
    });
    assert(enNewtab.lang === 'en-US', 'nova guia volta ao inglês');

    // Zonas de segurança: adicionar um site e descartar depois.
    await options.locator('.opt-nav-item[data-section="security"]').click();
    await sleep(250);
    await options.locator('[data-zone="trusted"]').click();
    await sleep(250);
    await options.locator('#zone-site-input').fill('example.org');
    await options.locator('#zone-site-add').click();
    await sleep(350);
    const chip = await options.locator('.zone-detail .site-chip').first().innerText();
    assert(chip.includes('example.org'), 'site é adicionado à zona de segurança');
    await options.locator('#opt-cancel').click();
    await sleep(250);
    await options.getByRole('button', { name: 'Discard and exit' }).click({ noWaitAfter: true }).catch(() => {});
    await sleep(700);
    assert(options.isClosed(), 'janela de Opções fecha ao descartar alterações');

    // Regras de cookies por site.
    options = await openOptions(app, browser, 'privacy');
    await options.locator('#privacy-cookie-sites').click();
    await sleep(250);
    await options.locator('#cookie-domain').fill('example.net');
    await options.locator('#cookie-add').click();
    await sleep(200);
    assert(
      (await options.locator('.rule-row .domain').first().innerText()).includes('example.net'),
      'regra de cookie por site é criada'
    );
    await options.getByRole('button', { name: 'Save rules' }).click();
    await sleep(300);
    assert(
      (await options.locator('#opt-pane').innerText()).includes('1 site with its own rule'),
      'painel de Privacidade reflete a nova regra'
    );

    // Diagnóstico real de rede.
    const diagnostics = await options.evaluate(() => window.ieOptions.diagnostics('https://example.com'));
    assert(Array.isArray(diagnostics.checks) && diagnostics.checks.length >= 3, 'diagnóstico de rede retorna verificações');
    assert(diagnostics.checks.some((check) => check.name.startsWith('DNS')), 'diagnóstico inclui resolução DNS');

    // Filtro da aba Avançado.
    await options.locator('.opt-nav-item[data-section="advanced"]').click();
    await sleep(250);
    await options.locator('#adv-filter').fill('TLS 1.0');
    await sleep(250);
    const visibleCases = await options.locator('.adv-item:not([hidden])').count();
    assert(visibleCases >= 1 && visibleCases <= 2, 'filtro do Avançado reduz a lista de opções');

    await options.locator('#opt-cancel').click();
    await sleep(300);
    if (!options.isClosed()) {
      const discard = options.getByRole('button', { name: 'Discard and exit' });
      if (await discard.count()) await discard.click({ noWaitAfter: true }).catch(() => {});
      await sleep(500);
    }
    assert(options.isClosed(), 'segunda janela de Opções também fecha corretamente');

    // Links internos da nova guia: abrem o painel sem navegar para ie://.
    const openedInternal = await browser.evaluate(async () => {
      const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
      return wv.executeJavaScript(`(() => {
        const link = [...document.querySelectorAll('a')].find((item) => (item.getAttribute('href') || '') === 'ie://favorites');
        if (!link) return false;
        link.click();
        return true;
      })()`);
    });
    await sleep(900);
    const internalState = await browser.evaluate(() => {
      const wv = document.querySelector('.view:not([hidden]) webview') || document.querySelector('webview');
      return {
        url: wv.getURL(),
        open: !document.getElementById('hub').hidden,
        heading: document.getElementById('hub-heading').textContent,
      };
    });
    assert(
      openedInternal && internalState.open && internalState.heading === 'Favorites',
      'link interno abre Favoritos sem sair da nova guia'
    );
    assert(
      internalState.url.startsWith('ie://newtab'),
      'link interno não navega para uma página interna desconhecida'
    );
    await browser.keyboard.press('Escape');
    await sleep(350);
    assert(
      await browser.evaluate(() => document.getElementById('hub').hidden),
      'Esc fecha a central de Favoritos'
    );

    // Histórico: uma navegação real grava URL e título.
    const historyServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>Smoke history</title><h1>Smoke history</h1>');
    });
    await new Promise((resolve) => historyServer.listen(0, '127.0.0.1', resolve));
    try {
      const historyUrl = `http://127.0.0.1:${historyServer.address().port}/smoke-history`;
      await browser.fill('#address', historyUrl);
      await browser.press('#address', 'Enter');
      await sleep(1800);
      const history = await browser.evaluate(() => window.ie.history.list());
      const entry = history.find((item) => item.url === historyUrl);
      assert(Boolean(entry), 'navegação é gravada no histórico');
      assert(entry?.title === 'Smoke history', 'histórico guarda o título da página');
    } finally {
      historyServer.close();
    }

    console.log('\nTodos os testes funcionais passaram.');
  } finally {
    try {
      restoreRegistry(original);
    } catch (err) {
      console.error('[aviso] não foi possível restaurar o Registro:', err.message);
    }
    await app.close();
    try {
      fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      /* arquivos ainda em uso pelo Chromium */
    }
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exitCode = 1;
});

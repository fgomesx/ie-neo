'use strict';

/* ============================================================
   Opções da Internet — Conteúdo, Conexões, Programas e Avançado
   ============================================================ */

(function () {
  const U = window.IEOptUI;
  const P = window.IEOptionPanes;

  /* ------------------------------------------------------------------ */
  /* Conteúdo                                                           */
  /* ------------------------------------------------------------------ */

  function renderContent(ctx) {
    const feeds = U.card(
      t('Feeds e conteúdo'),
      U.check(
        'content.feeds',
        t('Ativar descoberta de feeds RSS/Atom'),
        t(
          'O botão de feeds na barra de ferramentas detecta feeds anunciados pela página e abre o leitor integrado (Alt+J).'
        )
      ) +
        U.notice(
          t(
            'O leitor usa a mesma sessão de rede do navegador e respeita cookies, proxy, HTTPS e as zonas de segurança. Feeds protegidos por autenticação aparecem somente quando a sessão já está autenticada.'
          ),
          '',
          'i-rss'
        ),
      t('Detecte e leia feeds sem instalar extensões.')
    );

    const autocomplete = U.card(
      t('AutoCompletar'),
      U.check(
        'content.autocomplete.favorites',
        t('Sugerir favoritos na barra de endereços'),
        t('Mostra correspondências da sua pasta de Favoritos enquanto você digita.')
      ) +
        U.check(
          'content.autocomplete.history',
          t('Sugerir endereços do histórico'),
          t('Usa o histórico local para completar endereços já visitados.')
        ) +
        U.check(
          'content.autocomplete.search',
          t('Sugerir a pesquisa digitada'),
          t('Exibe a opção Pesquisar por “termo” no topo da lista de sugestões.')
        ),
      t('As sugestões são calculadas localmente; nada é enviado a um serviço externo.')
    );

    const certificates = U.card(
      t('Certificados e conteúdo confiável'),
      `<p style="margin:0 0 10px;font-size:11.8px;line-height:1.55;color:#5b7284">${t(
        'O navegador valida TLS com o repositório do Windows. Use o Gerenciador de Certificados para importar certificados pessoais, remover raízes não confiáveis ou conferir certificados de cliente.'
      )}</p>
      <button class="opt-small-btn" id="content-certificates">${U.icon('i-key')} ${t(
        'Abrir Gerenciador de Certificados'
      )}</button>` +
        U.notice(
          t(
            'A classificação de conteúdo PICS do Internet Explorer clássico não é aplicada pelo Chromium. Controles parentais do Windows continuam válidos no nível do sistema.'
          ),
          'warn',
          'i-warning'
        ),
      t('Confiança, certificados e conteúdo avaliado.')
    );

    return feeds + autocomplete + certificates;
  }

  function mountContent(root, ctx) {
    root.querySelector('#content-certificates')?.addEventListener('click', async () => {
      const ok = await ctx.ipc.openCertificates();
      if (!ok) ctx.toast(t('Não foi possível abrir o Gerenciador de Certificados.'), 'error');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Conexões                                                           */
  /* ------------------------------------------------------------------ */

  function renderConnections(ctx) {
    const { draft, state } = ctx;
    const win = state.windowsState || {};

    const windows = U.card(
      t('Configuração atual do Windows'),
      U.winState([
        [t('Página inicial'), win.startPage],
        [t('Página de pesquisa'), win.searchPage],
        [t('Página padrão'), win.defaultPageUrl],
        [t('Proxy ativado'), win.proxyEnabled ? t('Sim') : t('Não')],
        [t('Servidor proxy'), win.proxyServer],
        [t('Exceções'), win.proxyOverride],
        [t('Script automático'), win.autoConfigUrl],
      ]) +
        U.notice(
          t(
            'Estes valores vêm de <b>HKCU\\Software\\Microsoft\\Internet Explorer\\Main</b> e <b>HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings</b>. Ao aplicar, o IE Neo grava página inicial, página de pesquisa e proxy nessas chaves.'
          ),
          '',
          'i-windows'
        ),
      t('Leitura real do Registro do usuário, sem privilégios administrativos.')
    );

    const auto = U.card(
      t('Configuração automática'),
      U.check(
        'connections.autoDetect',
        t('Detectar configurações automaticamente'),
        t(
          'Pede ao Windows que localize um script de configuração (WPAD) quando nenhum proxy fixo ou PAC estiver definido.'
        )
      ) +
        U.notice(
          t(
            'O Chromium aplica a configuração em todas as sessões, inclusive InPrivate. Alterações de proxy entram em vigor imediatamente após Aplicar.'
          ),
          '',
          'i-network'
        ),
      t('Deixe o Windows descobrir a rede da empresa ou da residência.')
    );

    const proxy = U.card(
      t('Servidor proxy'),
      U.check(
        'connections.proxy.enabled',
        t('Usar um servidor proxy para conexões'),
        t(
          'Ativa o proxy fixo abaixo. Se houver um script automático, ele tem prioridade sobre o proxy fixo.'
        )
      ) +
        U.field(
          t('Endereço'),
          U.input('connections.proxy.server', {
            grow: true,
            placeholder: t('http=proxy.empresa.com:8080;https=proxy.empresa.com:8080'),
            spellcheck: false,
          }),
          t(
            'Aceita o formato do Windows: <b>http=host:porta;https=host:porta</b> ou um único <b>host:porta</b>.'
          )
        ) +
        U.field(
          t('Não usar proxy para'),
          U.input('connections.proxy.bypass', {
            grow: true,
            placeholder: '*.local;10.*;192.168.*',
            spellcheck: false,
          }),
          t('Lista separada por ponto e vírgula. O valor é gravado em <b>ProxyOverride</b>.')
        ) +
        U.field(
          t('Script de configuração automática (PAC)'),
          U.input('connections.proxy.autoConfigUrl', {
            grow: true,
            placeholder: 'https://empresa.com/proxy.pac',
            spellcheck: false,
          }),
          t(
            'Também gravado em <b>AutoConfigURL</b>. Deixe em branco para remover o script.'
          )
        ),
      t('Configuração equivalente à aba Conexões do inetcpl.cpl.')
    );

    const test = U.card(
      t('Teste de conexão e diagnóstico'),
      U.field(
        t('Endereço para testar'),
        `<div class="opt-input-row"><input class="opt-input grow" id="conn-test-url" spellcheck="false" placeholder="https://duckduckgo.com" value="https://duckduckgo.com" /><button class="opt-small-btn" id="conn-test">${t(
          'Testar conexão'
        )}</button><button class="opt-small-btn" id="conn-diagnostics">${t(
          'Diagnóstico'
        )}</button></div>`,
        t('O teste usa a sessão de rede normal e a configuração de proxy já aplicada.')
      ) + '<div class="test-result" id="conn-test-result"></div><div id="conn-diag-result"></div>',
      t(
        'Verifique DNS, porta TCP, adaptador e proxy antes de concluir que um site está fora do ar.'
      )
    );

    const tools = U.card(
      t('Ferramentas do Windows'),
      `<div class="opt-inline-links" style="flex-wrap:wrap">
        <button class="opt-text-link" data-win-setting="network">${t(
          'Configurações de rede'
        )}</button>
        <button class="opt-text-link" data-win-setting="proxy">${t('Proxy do Windows')}</button>
        <button class="opt-text-link" data-win-setting="vpn">VPN</button>
        <button class="opt-text-link" data-win-setting="dialup">${t(
          'Conexões discadas'
        )}</button>
        <button class="opt-text-link" id="conn-registry">${t('Editor do Registro')}</button>
      </div>` +
        U.notice(
          t(
            'O IE Neo não altera as zonas de segurança do Windows por segurança. As zonas internas do navegador são gravadas somente no arquivo de configuração local.'
          ),
          '',
          'i-info'
        ),
      t('Atalhos para os painéis clássicos e modernos do Windows.')
    );

    return windows + auto + proxy + test + tools;
  }

  function mountConnections(root, ctx) {
    const urlField = root.querySelector('#conn-test-url');

    // Rótulos fixos do diagnóstico vêm do processo principal em português;
    // traduzimos no momento da exibição, inclusive portas dinâmicas.
    const diagName = (name) => {
      const port = /^Porta (\d+)$/.exec(String(name || ''));
      return port ? t('Porta {port}', { port: port[1] }) : t(name);
    };

    root.querySelector('#conn-test')?.addEventListener('click', async () => {
      const button = root.querySelector('#conn-test');
      const output = root.querySelector('#conn-test-result');
      const target = (urlField?.value || '').trim() || ctx.draft.general.homePage;
      button.disabled = true;
      output.innerHTML = `<span style="color:#7b8d9d">${t('Testando conexão…')}</span>`;
      try {
        const result = await ctx.ipc.testConnection(target);
        if (result.ok) {
          output.innerHTML = `<span class="ok">${t('Conexão bem-sucedida')}</span> — ${t(
            'HTTP {status} em {elapsed} ms.',
            { status: result.status, elapsed: result.elapsed }
          )}<br /><span style="color:#7b8d9d;font-size:10.8px">${U.esc(
            result.url || target
          )}</span>`;
        } else {
          output.innerHTML = `<span class="fail">${t('Falha na conexão')}</span> — ${U.esc(
            result.error || `HTTP ${result.status}`
          )} <span style="color:#7b8d9d">(${result.elapsed} ms)</span>`;
        }
      } catch (err) {
        output.innerHTML = `<span class="fail">${t('Falha na conexão')}</span> — ${U.esc(
          err.message
        )}`;
      } finally {
        button.disabled = false;
      }
    });

    root.querySelector('#conn-diagnostics')?.addEventListener('click', async () => {
      const button = root.querySelector('#conn-diagnostics');
      const output = root.querySelector('#conn-diag-result');
      const target = (urlField?.value || '').trim() || ctx.draft.general.homePage;
      button.disabled = true;
      output.innerHTML = `<div class="test-result" style="color:#7b8d9d">${t(
        'Executando diagnóstico…'
      )}</div>`;
      try {
        const result = await ctx.ipc.diagnostics(target);
        const items = (result.checks || [])
          .map(
            (check) => `<div class="diag-item"><span class="dot ${
              check.status === 'ok' ? 'ok' : check.status === 'fail' ? 'fail' : ''
            }"></span><div><strong>${U.esc(diagName(check.name))}</strong><span>${U.esc(
              check.detail
            )}</span></div></div>`
          )
          .join('');
        output.innerHTML = `<div class="diag-list">${items}</div>`;
      } catch (err) {
        output.innerHTML = `<div class="test-result"><span class="fail">${t(
          'Erro no diagnóstico'
        )}</span> — ${U.esc(err.message)}</div>`;
      } finally {
        button.disabled = false;
      }
    });

    root.querySelectorAll('[data-win-setting]').forEach((button) => {
      button.addEventListener('click', () => ctx.ipc.openWindowsSetting(button.dataset.winSetting));
    });

    root.querySelector('#conn-registry')?.addEventListener('click', () => ctx.ipc.openRegistry());
  }

  /* ------------------------------------------------------------------ */
  /* Programas                                                          */
  /* ------------------------------------------------------------------ */

  function renderPrograms(ctx) {
    const { draft, state } = ctx;
    const isDefault = Boolean(state.meta?.isDefaultBrowser);

    const browser = U.card(
      t('Navegador padrão'),
      `<p style="margin:0 0 10px;font-size:11.8px;line-height:1.55;color:#5b7284">${
        isDefault
          ? t(
              'O IE Neo está registrado como manipulador de <b>http</b> e <b>https</b> para o seu usuário.'
            )
          : t(
              'O IE Neo ainda não é o navegador padrão. O Windows 11 exige que a escolha seja confirmada nas Configurações de aplicativos padrão.'
            )
      }</p>
      <div class="opt-inline-links">
        <button class="opt-text-link" id="programs-default">${t(
          'Definir como navegador padrão'
        )}</button>
        <button class="opt-text-link" id="programs-default-apps">${t(
          'Abrir aplicativos padrão'
        )}</button>
      </div>` +
        U.notice(
          t(
            'O Windows moderno não permite que um aplicativo se torne padrão silenciosamente. O IE Neo registra os protocolos e abre a página correta das Configurações para a confirmação final.'
          ),
          '',
          'i-windows'
        ),
      t('Integração com os protocolos HTTP e HTTPS do Windows.')
    );

    const apps = U.card(
      t('Programas do Windows'),
      U.field(
        t('Editor HTML'),
        U.input('programs.htmlEditor', { grow: true, placeholder: 'notepad.exe' }),
        t(
          'Programa usado para editar o código-fonte de uma página. O valor é apenas informativo neste build.'
        )
      ) +
        U.field(
          t('Cliente de e-mail'),
          U.input('programs.emailClient', { grow: true, placeholder: t('Padrão do Windows') }),
          t(
            'Cliente sugerido em links mailto: quando nenhum aplicativo padrão estiver definido.'
          )
        ) +
        U.notice(
          t(
            'Os aplicativos associados a arquivos e protocolos são gerenciados pelo Windows. Use “Abrir aplicativos padrão” para alterar associações.'
          ),
          '',
          'i-apps'
        ),
      t('Preferências herdadas das Opções da Internet clássicas.')
    );

    const addons = (state.addons || [])
      .map(
        (addon) => `<div class="addon-row">
          <div>
            <strong>${U.esc(t(addon.name))}</strong>
            <span class="meta">${U.esc(addon.publisher)} · ${t('versão {version}', {
              version: addon.version,
            })}</span>
            <p>${U.esc(t(addon.description))}</p>
          </div>
          <label class="opt-switch" title="${U.esc(
            addon.locked ? t('Componente interno obrigatório') : t('Ativar ou desativar')
          )}">
            <input type="checkbox" data-addon-id="${U.esc(addon.id)}" ${
              addon.enabled ? 'checked' : ''
            } ${addon.locked ? 'disabled' : ''} aria-label="${U.esc(t(addon.name))}" />
            <span></span>
          </label>
        </div>`
      )
      .join('');

    const addonCard = U.card(
      t('Complementos e componentes'),
      `<div id="addons-list">${
        addons || `<div class="adv-empty">${t('Nenhum complemento disponível.')}</div>`
      }</div>` +
        U.notice(
          t(
            'Componentes marcados como obrigatórios fazem parte do motor Chromium e não podem ser desativados. Os demais complementos internos alteram configurações reais de privacidade, feeds ou compatibilidade.'
          ),
          '',
          'i-shield-check'
        ),
      t('Componentes carregados pelo IE Neo.')
    );

    return browser + apps + addonCard;
  }

  function mountPrograms(root, ctx) {
    root.querySelector('#programs-default')?.addEventListener('click', async () => {
      const result = await ctx.ipc.setDefaultBrowser();
      if (result?.isDefault) ctx.toast(t('O IE Neo está registrado como navegador padrão.'));
      else ctx.toast(t('Confirme o IE Neo nas Configurações do Windows.'));
      await ctx.reload({ keepView: true });
    });

    root.querySelector('#programs-default-apps')?.addEventListener('click', () => {
      ctx.ipc.openWindowsSetting('defaultapps');
    });

    root.querySelectorAll('[data-addon-id]').forEach((input) => {
      input.addEventListener('change', async () => {
        const id = input.dataset.addonId;
        input.disabled = true;
        const ok = await ctx.toggleAddon(id, input.checked);
        input.disabled = false;
        if (!ok) {
          input.checked = !input.checked;
          ctx.toast(t('Não foi possível alterar este complemento.'), 'error');
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Avançado                                                           */
  /* ------------------------------------------------------------------ */

  function advCheck(path, label, description = '', restart = false) {
    const search = `${label} ${description}`.toLowerCase();
    return `<div class="adv-item" data-adv-text="${U.esc(search)}">${U.check(
      path,
      label,
      description,
      { restart }
    )}</div>`;
  }

  function advSelect(path, label, description, options, restart = false) {
    const search = `${label} ${description}`.toLowerCase();
    return `<div class="adv-select-row adv-item" data-adv-text="${U.esc(search)}">
      <div>${label}${restart ? U.badge : ''}<small>${description}</small></div>
      ${U.select(path, options)}
    </div>`;
  }

  function group(title, items) {
    return `<div class="adv-group"><h3>${title}</h3><div class="adv-card">${items.join('')}</div></div>`;
  }

  function renderAdvanced(ctx) {
    const { draft, state } = ctx;
    const compatSites = Array.isArray(draft.advanced.compatSites) ? draft.advanced.compatSites : [];
    const chips = compatSites.length
      ? compatSites
          .map(
            (site, index) =>
              `<span class="site-chip">${U.esc(site)}<button data-remove-compat="${index}" title="${U.esc(
                t('Remover')
              )}" aria-label="${U.esc(t('Remover site'))}">${U.icon('i-close')}</button></span>`
          )
          .join('')
      : `<div class="site-empty">${t(
          'Nenhum site na lista. O Modo de Exibição de Compatibilidade global continua disponível.'
        )}</div>`;

    const groups = [
      group(t('Multimídia'), [
        advCheck(
          'advanced.showImages',
          t('Mostrar imagens'),
          t('Desativa o carregamento de imagens para economizar dados.')
        ),
        advCheck(
          'advanced.playAnimations',
          t('Reproduzir animações em páginas da Web'),
          t('Desativa animações e transições CSS nas páginas.')
        ),
        advCheck(
          'advanced.playSounds',
          t('Reproduzir sons em páginas da Web'),
          t('Silencia o áudio de todas as guias.')
        ),
      ]),
      group(t('Navegação'), [
        advCheck(
          'advanced.enableJavaScript',
          t('Ativar JavaScript'),
          t('Aplicado a novas guias. Desativar quebra a maioria dos sites modernos.'),
          false
        ),
        advCheck(
          'advanced.showStatusBar',
          t('Mostrar barra de status'),
          t('Exibe a zona, o Modo Protegido e o estado do carregamento.')
        ),
        advCheck(
          'advanced.showInfoBar',
          t('Mostrar barra de informações'),
          t('Exibe avisos não bloqueantes, como pop-ups bloqueados e sessões InPrivate.')
        ),
        advCheck(
          'advanced.suggestUrls',
          t('Mostrar sugestões na barra de endereços'),
          t('Combina favoritos, histórico e a pesquisa digitada.')
        ),
        advCheck(
          'advanced.downloadNotifications',
          t('Notificar quando um download terminar'),
          t('Mostra uma notificação do sistema ao concluir.')
        ),
      ]),
      group(t('Compatibilidade'), [
        advCheck(
          'advanced.compatView',
          t('Exibir todos os sites no Modo de Exibição de Compatibilidade'),
          t(
            'Envia o agente de usuário do Internet Explorer 11 e desativa recursos modernos para máxima compatibilidade.'
          )
        ),
        advSelect(
          'advanced.userAgentMode',
          t('Cadeia de agente de usuário'),
          t(
            'Identidade enviada aos sites. O modo IE Neo anuncia Chromium com a assinatura IE Neo.'
          ),
          [
            { value: 'neo', label: t('IE Neo (padrão)') },
            { value: 'ie11', label: 'Internet Explorer 11 (Trident)' },
            { value: 'edge', label: 'Microsoft Edge (Chromium)' },
            { value: 'custom', label: t('Personalizada') },
          ]
        ),
        `<div class="adv-item" id="custom-ua-row">${U.field(
          t('Agente de usuário personalizado'),
          U.input('advanced.customUA', { grow: true, spellcheck: false }),
          t('Usado somente quando a opção Personalizada está selecionada.')
        )}</div>`,
      ]),
      group(t('Privacidade e segurança'), [
        advCheck(
          'advanced.httpsOnly',
          t('Exigir HTTPS em todos os sites'),
          t('Redireciona HTTP para HTTPS, exceto na intranet local.')
        ),
        advCheck(
          'advanced.useSpellcheck',
          t('Verificar ortografia ao digitar'),
          t('Usa os dicionários pt-BR e en-US do Chromium.')
        ),
      ]),
      group(t('Rede e desempenho'), [
        advCheck(
          'advanced.useHardwareAcceleration',
          t('Usar aceleração de hardware quando disponível'),
          t('Desative apenas se houver falhas gráficas.'),
          true
        ),
        advCheck(
          'advanced.http3',
          t('Ativar HTTP/3 (QUIC)'),
          t('Usa QUIC em sites que oferecem suporte.'),
          true
        ),
        advSelect(
          'advanced.doh',
          t('DNS sobre HTTPS (DoH)'),
          t(
            'Resolve nomes por um provedor criptografado. A opção Automático usa a configuração do sistema.'
          ),
          [
            { value: 'auto', label: t('Automático (sistema)') },
            { value: 'off', label: t('Desativado') },
            { value: 'cloudflare', label: 'Cloudflare (1.1.1.1)' },
            { value: 'google', label: 'Google (8.8.8.8)' },
          ],
          true
        ),
        advCheck(
          'advanced.tlsLegacy',
          t('Permitir TLS 1.0 e 1.1 (inseguro)'),
          t('Compatibilidade com servidores antigos. Não recomendado.'),
          true
        ),
      ]),
      group(t('Desenvolvimento'), [
        advCheck(
          'advanced.developerTools',
          t('Habilitar Ferramentas do Desenvolvedor'),
          t('Permite abrir DevTools com F12 e inspecionar elementos.')
        ),
      ]),
    ].join('');

    const compat = U.card(
      t('Sites de compatibilidade'),
      `<div class="site-chips">${chips}</div>
      <div class="opt-input-row"><input class="opt-input grow" id="compat-site-input" placeholder="${U.esc(
        t('exemplo.com ou *.exemplo.com')
      )}" spellcheck="false" /><button class="opt-small-btn" id="compat-site-add">${t(
        'Adicionar'
      )}</button></div>
      <small style="display:block;margin-top:5px;color:#7b8d9d;font-size:10.8px">${t(
        'Estes sites recebem o agente do Internet Explorer 11 e o modo de compatibilidade, mesmo que a opção global esteja desativada.'
      )}</small>`,
      t('Exceções por site para sites legados que exigem o motor Trident.')
    );

    return `<div class="opt-filter">${U.icon('i-search')}<input id="adv-filter" placeholder="${U.esc(
      t('Localizar uma configuração')
    )}" spellcheck="false" autocomplete="off" value="${U.esc(
      state.advFilter || ''
    )}" /></div>${groups}${compat}`;
  }

  function applyAdvancedFilter(root, term) {
    const query = String(term || '').trim().toLowerCase();
    root.querySelectorAll('.adv-item').forEach((item) => {
      item.hidden = Boolean(query) && !String(item.dataset.advText || '').includes(query);
    });
    root.querySelectorAll('.adv-group').forEach((groupEl) => {
      const items = [...groupEl.querySelectorAll('.adv-item')];
      groupEl.hidden = Boolean(query) && !items.some((item) => !item.hidden);
    });
  }

  function syncCustomUA(root) {
    const select = root.querySelector('[data-path="advanced.userAgentMode"]');
    const row = root.querySelector('#custom-ua-row');
    if (select && row) row.hidden = select.value !== 'custom';
  }

  function mountAdvanced(root, ctx) {
    const filter = root.querySelector('#adv-filter');
    filter?.addEventListener('input', () => {
      ctx.state.advFilter = filter.value;
      applyAdvancedFilter(root, filter.value);
    });
    if (ctx.state.advFilter) applyAdvancedFilter(root, ctx.state.advFilter);

    const uaSelect = root.querySelector('[data-path="advanced.userAgentMode"]');
    uaSelect?.addEventListener('change', () => syncCustomUA(root));
    syncCustomUA(root);

    const input = root.querySelector('#compat-site-input');
    const addSite = () => {
      if (!input) return;
      const value = U.normalizeHost(input.value);
      if (!value) return;
      const sites = [...(ctx.draft.advanced.compatSites || [])];
      if (sites.includes(value)) {
        ctx.toast(t('Este site já está na lista.'), 'error');
        return;
      }
      sites.push(value);
      ctx.set('advanced.compatSites', sites);
      ctx.refresh();
      ctx.toast(t('Site adicionado ao Modo de Exibição de Compatibilidade.'));
    };

    root.querySelector('#compat-site-add')?.addEventListener('click', addSite);
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addSite();
      }
    });

    root.querySelectorAll('[data-remove-compat]').forEach((button) => {
      button.addEventListener('click', () => {
        const sites = [...(ctx.draft.advanced.compatSites || [])];
        sites.splice(Number(button.dataset.removeCompat), 1);
        ctx.set('advanced.compatSites', sites);
        ctx.refresh();
      });
    });
  }

  P.content = {
    get title() {
      return t('Conteúdo');
    },
    get subtitle() {
      return t('Feeds, AutoCompletar, certificados e conteúdo confiável.');
    },
    render: renderContent,
    mount: mountContent,
  };

  P.connections = {
    get title() {
      return t('Conexões');
    },
    get subtitle() {
      return t('Proxy, configuração automática e diagnóstico da rede do Windows.');
    },
    render: renderConnections,
    mount: mountConnections,
  };

  P.programs = {
    get title() {
      return t('Programas');
    },
    get subtitle() {
      return t('Navegador padrão, programas do Windows e complementos internos.');
    },
    render: renderPrograms,
    mount: mountPrograms,
  };

  P.advanced = {
    get title() {
      return t('Avançado');
    },
    get subtitle() {
      return t(
        'Configurações detalhadas de multimídia, compatibilidade, rede e desenvolvimento.'
      );
    },
    render: renderAdvanced,
    mount: mountAdvanced,
  };
})();

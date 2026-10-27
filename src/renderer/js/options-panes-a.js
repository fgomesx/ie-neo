'use strict';

/* ============================================================
   Opções da Internet — Geral, Segurança e Privacidade
   ============================================================ */

(function () {
  const U = window.IEOptUI;
  const P = window.IEOptionPanes;

  const SEARCH_PROVIDERS = {
    duckduckgo: { label: 'DuckDuckGo (padrão)', url: 'https://duckduckgo.com/?q={searchTerms}' },
    bing: { label: 'Bing', url: 'https://www.bing.com/search?q={searchTerms}' },
    google: { label: 'Google', url: 'https://www.google.com/search?q={searchTerms}' },
    yahoo: { label: 'Yahoo', url: 'https://search.yahoo.com/search?p={searchTerms}' },
    custom: { label: 'Personalizado', url: '' },
  };

  const COOKIE_LEVELS = [
    {
      id: 'block-all',
      short: 'Bloquear tudo',
      label: 'Bloquear todos os cookies',
      description:
        'Nenhum site pode gravar cookies. Login e preferências podem deixar de funcionar, mas o rastreamento entre sessões é praticamente eliminado.',
    },
    {
      id: 'high',
      short: 'Alto',
      label: 'Alto',
      description:
        'Cookies de terceiros são bloqueados e os cookies primários só são aceitos quando necessários. Recomendado para uso mais restrito.',
    },
    {
      id: 'medium-high',
      short: 'Médio alto',
      label: 'Médio alto',
      description:
        'Cookies primários são aceitos; cookies de terceiros são bloqueados. Equilíbrio recomendado entre privacidade e compatibilidade.',
    },
    {
      id: 'medium',
      short: 'Médio',
      label: 'Médio',
      description:
        'Aceita cookies primários e de terceiros com restrições de sessão. Compatível com a maioria dos sites modernos.',
    },
    {
      id: 'low',
      short: 'Baixo',
      label: 'Baixo',
      description:
        'Aceita a maioria dos cookies, inclusive de terceiros. Útil em sites que dependem de vários domínios para funcionar.',
    },
    {
      id: 'accept-all',
      short: 'Aceitar tudo',
      label: 'Aceitar todos os cookies',
      description:
        'Todos os cookies são aceitos sem filtro. Maior compatibilidade e menor privacidade — use apenas em sites de confiança.',
    },
  ];

  const PERMISSIONS = [
    ['geolocation', 'Localização', 'Compartilhar sua localização aproximada com o site.'],
    ['camera', 'Câmera', 'Usar a câmera em videochamadas e capturas.'],
    ['microphone', 'Microfone', 'Capturar áudio pelo microfone.'],
    ['notifications', 'Notificações', 'Exibir notificações da área de trabalho enviadas pelo site.'],
  ];

  /* ------------------------------------------------------------------ */
  /* Geral                                                              */
  /* ------------------------------------------------------------------ */

  function renderGeneral(ctx) {
    const { draft, defaults, meta } = ctx.state;
    const providerOptions = Object.entries(SEARCH_PROVIDERS).map(([value, item]) => ({
      value,
      label: t(item.label),
    }));

    const home = U.card(
      t('Página inicial'),
      U.field(
        t('Endereço da página inicial'),
        `<div class="opt-input-row">${U.input('general.homePage', {
          grow: true,
          placeholder: 'ie://newtab',
        })}<button class="opt-small-btn" id="general-home-current">${t('Página atual')}</button><button class="opt-small-btn" id="general-home-default">${t('Padrão')}</button></div>`,
        t(
          'Endereços http/https também são gravados em <b>HKCU\\Software\\Microsoft\\Internet Explorer\\Main — Start Page</b>. Páginas internas, como <b>ie://newtab</b>, mantêm o valor do Windows.'
        )
      ) +
        `<div class="opt-field-label" style="margin-top:2px">${t('Ao iniciar o IE Neo')}</div>
        <div class="opt-radio-list">
          ${U.radio('general.startup', 'home', t('Abrir a página inicial'), t('Carrega o endereço configurado acima.'))}
          ${U.radio('general.startup', 'newtab', t('Abrir a página de nova guia'), t('A experiência do IE Neo com pesquisa, atalhos e conteúdo do projeto.'))}
          ${U.radio('general.startup', 'restore', t('Reabrir a última sessão'), t('Restaura as guias da última vez em que o navegador foi fechado.'))}
        </div>
        <div style="margin-top:10px">${U.check(
          'general.reopenLastSession',
          t('Continuar de onde parei'),
          t('Mantém a sessão salva mesmo quando a opção acima é diferente.')
        )}</div>`,
      t(
        'Defina o que aparece ao abrir o navegador e qual endereço é usado pelo botão Página Inicial.'
      )
    );

    const search = U.card(
      t('Pesquisa'),
      U.field(
        t('Provedor de pesquisa'),
        U.select('general.searchProvider', providerOptions, { wide: true }),
        t('O provedor define o modelo de URL usado pela barra de endereços.')
      ) +
        U.field(
          t('URL de pesquisa'),
          U.input('general.searchUrl', { grow: true, spellcheck: false }),
          t(
            'Use <b>{searchTerms}</b> no lugar do termo pesquisado. Este endereço também alimenta o valor <b>Search Page</b> do Windows.'
          )
        ) +
        U.notice(
          t(
            'A barra de endereços envia a pesquisa ao provedor escolhido. O IE Neo não usa um serviço de sugestões externo.'
          ),
          '',
          'i-search'
        ),
      t('Escolha como a barra de endereços pesquisa quando você digita um termo.')
    );

    const downloads = U.card(
      t('Downloads'),
      U.field(
        t('Pasta de downloads'),
        `<div class="opt-input-row">${U.input('general.downloadDir', {
          grow: true,
          placeholder: t('Padrão do Windows (Downloads)'),
        })}<button class="opt-small-btn" id="general-download-dir">${t('Escolher…')}</button></div>`,
        t('Deixe em branco para usar a pasta Downloads do Windows.')
      ) +
        U.check(
          'general.askDownloadLocation',
          t('Perguntar onde salvar cada download'),
          t('Mostra a caixa de diálogo Salvar como em vez de baixar automaticamente.')
        ),
      t('Controle onde os arquivos baixados são gravados.')
    );

    const history = U.card(
      t('Histórico e navegação'),
      U.field(
        t('Manter histórico por'),
        `<div class="opt-input-row" style="max-width:210px">${U.input('general.historyDays', {
          type: 'number',
          min: 1,
          max: 365,
        })}<span style="font-size:11.6px;color:#6c8192">${t('dias')}</span></div>`,
        t(
          'Entradas mais antigas são descartadas automaticamente. O limite absoluto do banco local é de 5.000 itens.'
        )
      ) +
        U.check(
          'general.clearHistoryOnExit',
          t('Excluir o histórico de navegação ao sair'),
          t('Cookies e dados de sites InPrivate já são descartados automaticamente.')
        ) +
        U.inlineLinks([
          {
            id: 'general-clear-data',
            label: t('Excluir histórico, cookies e cache…'),
            action: 'clear-data',
          },
        ]),
      t('O histórico fica somente neste computador, no arquivo de configuração do IE Neo.')
    );

    const appearance = U.card(
      t('Aparência'),
      U.field(
        t('Tema'),
        `<div style="max-width:220px">${U.select(
          'general.theme',
          [
            { value: 'light', label: t('Claro') },
            { value: 'dark', label: t('Escuro') },
            { value: 'system', label: t('Sistema (automático)') },
          ],
          { wide: true }
        )}</div>`,
        t('Sistema acompanha automaticamente o modo claro ou escuro do Windows.')
      ) +
        U.field(
          t('Idioma da interface'),
          `<div style="max-width:220px">${U.select(
            'general.language',
            [
              { value: 'en-US', label: 'English (United States)' },
              { value: 'pt-BR', label: 'Português (Brasil)' },
            ],
            { id: 'opt-language', wide: true }
          )}</div>`,
          t(
            'O idioma é aplicado ao navegador e a esta janela ao clicar em Aplicar ou OK. Não depende do idioma do Windows.'
          )
        ) +
        U.check(
          'general.showFavoritesBar',
          t('Mostrar a barra de Favoritos'),
          t(
            'Exibe os favoritos da pasta Barra de Favoritos logo abaixo da barra de endereços.'
          )
        ) +
        U.field(
          t('Zoom padrão das páginas'),
          `<div style="max-width:150px">${U.select(
            'general.defaultZoom',
            [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200].map((zoom) => ({
              value: zoom,
              label: `${zoom}%`,
            })),
            { wide: true }
          )}</div>`,
          t('Cada guia pode ser ampliada individualmente com Ctrl + roda do mouse.')
        ),
      t('Preferências visuais do navegador, das Opções e da página de nova guia.')
    );

    const backup = U.card(
      t('Configurações do navegador'),
      U.inlineLinks([
        {
          id: 'general-export',
          label: t('Exportar configurações…'),
          action: 'export',
        },
        {
          id: 'general-import',
          label: t('Importar configurações…'),
          action: 'import',
        },
      ]) +
        U.winState([
          [t('Arquivo local'), meta.configFile],
          [t('Versão'), `${meta.version} · Chromium ${meta.chromium}`],
        ]),
      t(
        'Exporta as sete seções das Opções da Internet em um arquivo JSON, sem favoritos nem histórico.'
      )
    );

    return home + search + downloads + history + appearance + backup;
  }

  function mountGeneral(root, ctx) {
    const setHome = (value) => {
      ctx.set('general.homePage', value);
      const field = root.querySelector('[data-path="general.homePage"]');
      if (field) field.value = value;
    };

    root.querySelector('#general-home-current')?.addEventListener('click', async () => {
      const tab = await ctx.ipc.currentTab();
      if (!tab?.url || /^(ie|about|devtools):/i.test(tab.url)) {
        ctx.toast(
          t('A guia atual não tem um endereço que possa ser usado como página inicial.'),
          'error'
        );
        return;
      }
      setHome(tab.url);
      ctx.toast(t('Página atual definida como página inicial.'));
    });

    root.querySelector('#general-home-default')?.addEventListener('click', () => {
      setHome(ctx.state.defaults.general.homePage);
    });

    root.querySelector('#general-download-dir')?.addEventListener('click', async () => {
      const dir = await ctx.ipc.chooseDownloadDir();
      if (!dir) return;
      ctx.set('general.downloadDir', dir);
      const field = root.querySelector('[data-path="general.downloadDir"]');
      if (field) field.value = dir;
    });

    root.querySelector('#general-export')?.addEventListener('click', async () => {
      const result = await ctx.ipc.exportConfig();
      if (result) ctx.toast(t('Configurações exportadas com sucesso.'));
    });

    root.querySelector('#general-import')?.addEventListener('click', async () => {
      const result = await ctx.ipc.importConfig();
      if (!result) return;
      if (!result.ok) {
        ctx.toast(t('Falha ao importar: {error}', { error: result.error }), 'error');
        return;
      }
      await ctx.reload();
      ctx.toast(t('Configurações importadas e aplicadas.'));
    });

    root.querySelector('#general-clear-data')?.addEventListener('click', () => ctx.clearData());

    const provider = root.querySelector('[data-path="general.searchProvider"]');
    const searchUrl = root.querySelector('[data-path="general.searchUrl"]');
    provider?.addEventListener('change', () => {
      const preset = SEARCH_PROVIDERS[provider.value];
      if (preset && preset.url) {
        ctx.set('general.searchUrl', preset.url);
        if (searchUrl) searchUrl.value = preset.url;
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Segurança                                                          */
  /* ------------------------------------------------------------------ */

  function renderSecurity(ctx) {
    const { draft, state } = ctx;
    const zoneMeta = state.zoneMeta || {};
    const activeId = state.activeZone || 'internet';
    const zoneIds = ['internet', 'intranet', 'trusted', 'restricted'];
    const tiles = zoneIds
      .map((id) => {
        const meta = zoneMeta[id] || { id, label: id };
        const setting = draft.zones[id] || {};
        return U.zoneTile({ ...meta, ...setting }, id === activeId);
      })
      .join('');

    const activeMeta = zoneMeta[activeId] || {
      id: activeId,
      label: activeId,
      description: '',
    };
    const active = draft.zones[activeId] || { level: 'medium-high', protectedMode: true, sites: [] };
    const levelOrder = state.levelOrder || ['low', 'medium-low', 'medium', 'medium-high', 'high'];
    const levelIndex = Math.max(0, levelOrder.indexOf(active.level));
    const level = (state.levels && state.levels[active.level]) || {
      label: active.level,
      description: '',
      restrictions: '',
    };
    const sites = Array.isArray(active.sites) ? active.sites : [];

    const labels = levelOrder
      .map(
        (id, index) =>
          `<span data-level-index="${index}" class="${index === levelIndex ? 'on' : ''}">${U.esc(
            t(state.levels?.[id]?.label || id)
          )}</span>`
      )
      .join('');

    const chips = sites.length
      ? sites
          .map(
            (site, index) =>
              `<span class="site-chip">${U.esc(site)}<button data-remove-site="${index}" title="${U.esc(
                t('Remover {site}', { site })
              )}" aria-label="${U.esc(t('Remover site'))}">${U.icon('i-close')}</button></span>`
          )
          .join('')
      : `<div class="site-empty">${t(
          'Nenhum site adicionado nesta zona. A zona ainda inclui os sites atribuídos automaticamente.'
        )}</div>`;

    const detail = `<div class="zone-detail">
      <h4>${U.esc(t(activeMeta.label))}</h4>
      <p>${U.esc(t(activeMeta.description || ''))}</p>
      <div class="level-slider">
        <input type="range" id="zone-level" min="0" max="${levelOrder.length - 1}" step="1" value="${levelIndex}" aria-label="${U.esc(
          t('Nível de segurança da zona')
        )}" />
        <div class="level-labels">${labels}</div>
      </div>
      <div class="level-current" id="zone-level-current">
        <strong>${U.esc(t(level.label || active.level))}</strong>
        <span>${U.esc(t(level.description || ''))} ${U.esc(t(level.restrictions || ''))}</span>
      </div>
      ${U.check(
        `zones.${activeId}.protectedMode`,
        t('Ativar Modo Protegido'),
        t(
          'Executa o conteúdo da zona em um processo isolado com privilégios reduzidos, como no IE do Windows.'
        )
      )}
      <div class="zone-sites">
        <div class="zone-sites-title">${t('Sites nesta zona')} ${U.count(sites.length)}</div>
        <div class="site-chips">${chips}</div>
        <div class="opt-input-row"><input class="opt-input grow" id="zone-site-input" placeholder="${U.esc(
          t('exemplo.com ou *.exemplo.com')
        )}" spellcheck="false" /><button class="opt-small-btn" id="zone-site-add">${t(
          'Adicionar'
        )}</button></div>
        <small style="display:block;margin-top:5px;color:#7b8d9d;font-size:10.8px">${t(
          'Use o curinga * para incluir subdomínios. O endereço é normalizado para o domínio.'
        )}</small>
      </div>
    </div>`;

    const picker = U.card(
      t('Zonas de segurança'),
      `<div class="zone-picker">${tiles}</div>${detail}`,
      t(
        'As zonas do Internet Explorer continuam ativas: elas classificam cada site e controlam permissões, cookies e Modo Protegido no Chromium.'
      )
    );

    const privacy = U.card(
      t('Como as zonas são aplicadas'),
      `<div class="opt-grid-2">
        <div>${U.check(
          'advanced.httpsOnly',
          t('Exigir HTTPS nos sites'),
          t('Redireciona navegações HTTP para HTTPS fora da intranet local.')
        )}</div>
        <div>${U.check(
          'advanced.compatView',
          t('Exibir sites da intranet no Modo de Exibição de Compatibilidade'),
          t('Envia o agente de usuário do Internet Explorer 11 para os sites configurados.')
        )}</div>
      </div>` +
        U.notice(
          t(
            'Sites da zona <b>Restritos</b> sempre exibem um aviso antes de abrir e não recebem nenhuma permissão. Sites <b>Confiáveis</b> recebem permissões compatíveis sem prompts repetitivos. O nível <b>Alto</b> bloqueia permissões sensíveis.'
          ),
          '',
          'i-shield-check'
        ),
      t('Regras reais aplicadas pela pilha de rede e pelo manipulador de permissões.')
    );

    const certificates = U.card(
      t('Certificados e identidade'),
      `<p style="margin:0 0 10px;font-size:11.8px;color:#5b7284;line-height:1.55">${t(
        'O IE Neo usa o repositório de certificados do Windows e a validação TLS do Chromium. Gerencie autoridades certificadoras, certificados pessoais e sites confiáveis no painel do Windows.'
      )}</p>
      <button class="opt-small-btn" id="security-certificates">${U.icon('i-key')} ${t(
        'Abrir Gerenciador de Certificados'
      )}</button>`,
      t('Integração com certmgr.msc do Windows.')
    );

    return picker + privacy + certificates;
  }

  function mountSecurity(root, ctx) {
    root.querySelectorAll('[data-zone]').forEach((button) => {
      button.addEventListener('click', () => {
        ctx.state.activeZone = button.dataset.zone;
        ctx.refresh();
      });
    });

    const zoneId = ctx.state.activeZone || 'internet';
    const range = root.querySelector('#zone-level');
    range?.addEventListener('input', () => {
      const order = ctx.state.levelOrder || [];
      const id = order[Number(range.value)] || 'medium-high';
      const info = ctx.state.levels?.[id] || {};
      ctx.set(`zones.${zoneId}.level`, id);
      root.querySelectorAll('[data-level-index]').forEach((label) => {
        label.classList.toggle('on', Number(label.dataset.levelIndex) === Number(range.value));
      });
      const current = root.querySelector('#zone-level-current');
      if (current) {
        current.innerHTML = `<strong>${U.esc(t(info.label || id))}</strong><span>${U.esc(
          t(info.description || '')
        )} ${U.esc(t(info.restrictions || ''))}</span>`;
      }
    });

    const input = root.querySelector('#zone-site-input');
    const addSite = () => {
      if (!input) return;
      const value = U.normalizeHost(input.value);
      if (!value) return;
      const sites = [...(ctx.draft.zones[zoneId].sites || [])];
      if (sites.includes(value)) {
        ctx.toast(t('Este site já está nesta zona.'), 'error');
        return;
      }
      sites.push(value);
      ctx.set(`zones.${zoneId}.sites`, sites);
      ctx.refresh();
      ctx.toast(
        t('Site adicionado à zona {zone}.', {
          zone: t(ctx.state.zoneMeta?.[zoneId]?.label || zoneId),
        })
      );
    };

    root.querySelector('#zone-site-add')?.addEventListener('click', addSite);
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addSite();
      }
    });

    root.querySelectorAll('[data-remove-site]').forEach((button) => {
      button.addEventListener('click', () => {
        const sites = [...(ctx.draft.zones[zoneId].sites || [])];
        sites.splice(Number(button.dataset.removeSite), 1);
        ctx.set(`zones.${zoneId}.sites`, sites);
        ctx.refresh();
      });
    });

    root.querySelector('#security-certificates')?.addEventListener('click', async () => {
      const ok = await ctx.ipc.openCertificates();
      if (!ok) ctx.toast(t('Não foi possível abrir o Gerenciador de Certificados.'), 'error');
    });
  }

  /* ------------------------------------------------------------------ */
  /* Privacidade                                                        */
  /* ------------------------------------------------------------------ */

  function renderPrivacy(ctx) {
    const { draft } = ctx;
    const cookieIndex = Math.max(
      0,
      COOKIE_LEVELS.findIndex((item) => item.id === draft.privacy.cookieLevel)
    );
    const info = COOKIE_LEVELS[cookieIndex];
    const rules = Array.isArray(draft.privacy.perSite) ? draft.privacy.perSite : [];

    const cookieLabels = COOKIE_LEVELS.map(
      (item, index) =>
        `<span data-cookie-label="${index}" class="${index === cookieIndex ? 'on' : ''}">${U.esc(
          t(item.short)
        )}</span>`
    ).join('');

    const rulesSummary =
      rules.length === 1
        ? t('{count} site com regra própria.', { count: rules.length })
        : t('{count} sites com regras próprias.', { count: rules.length });

    const cookies = U.card(
      t('Cookies e dados de sites'),
      `<div class="cookie-levels">
        <input type="range" id="cookie-level" min="0" max="${COOKIE_LEVELS.length - 1}" step="1" value="${cookieIndex}" aria-label="${U.esc(
          t('Nível de cookies')
        )}" />
        <div class="cookie-label-row">${cookieLabels}</div>
      </div>
      <div class="cookie-current" id="cookie-current"><strong>${U.esc(
        t(info.label)
      )}</strong><span>${U.esc(t(info.description))}</span></div>
      <div class="opt-inline-links" style="margin-top:10px">
        <button class="opt-text-link" id="privacy-cookie-sites">${t(
          'Gerenciar sites com regras próprias'
        )}</button>
        <button class="opt-text-link" id="privacy-clear-cookies">${t(
          'Excluir cookies e dados de sites…'
        )}</button>
      </div>
      <div style="margin-top:8px;font-size:11px;color:#7b8d9d">${rulesSummary}</div>`,
      t(
        'O nível global é aplicado pelo manipulador de cookies do Chromium, inclusive cabeçalhos Set-Cookie de terceiros.'
      )
    );

    const popups = U.card(
      t('Bloqueador de pop-ups'),
      U.check(
        'privacy.popupBlocker',
        t('Bloquear pop-ups'),
        t(
          'Intercepta janelas abertas sem interação do usuário. Pop-ups legítimos podem ser liberados na barra de informações.'
        )
      ) +
        U.notice(
          t(
            'O IE Neo usa o mesmo bloqueio para janelas abertas por scripts e por links com target=_blank sem gesto do usuário. A página pode solicitar a liberação.'
          ),
          '',
          'i-shield'
        ),
      t('Controle janelas indesejadas abertas pelos sites.')
    );

    const permissionRows = PERMISSIONS.map(
      ([key, label, description]) =>
        `<div class="adv-select-row">
          <div>${t(label)}<small>${t(description)}</small></div>
          ${U.select(
            `privacy.${key}`,
            [
              { value: 'ask', label: t('Perguntar') },
              { value: 'allow', label: t('Permitir') },
              { value: 'deny', label: t('Bloquear') },
            ]
          )}
        </div>`
    ).join('');

    const permissions = U.card(
      t('Permissões de sites'),
      permissionRows +
        U.notice(
          t(
            'Sites na zona Restritos são sempre bloqueados. Em sites Confiáveis, a escolha “Perguntar” é tratada como permitida. O Modo Protegido é aplicado a todas as zonas por padrão.'
          ),
          '',
          'i-shield-check'
        ),
      t('Decisões padrão usadas quando um site pede acesso a recursos sensíveis.')
    );

    const tracking = U.card(
      t('Rastreamento e InPrivate'),
      U.check(
        'privacy.sendDNT',
        t('Enviar o sinal Não Rastrear (DNT) e Global Privacy Control (GPC)'),
        t(
          'Adiciona os cabeçalhos DNT: 1 e Sec-GPC: 1 a todas as requisições. A decisão de respeitar o sinal é do site.'
        )
      ) +
        U.notice(
          t(
            'Janelas InPrivate usam uma partição de sessão separada: cookies, cache e histórico local são descartados ao fechar. O sinal DNT continua sendo enviado. O Filtro InPrivate legado foi substituído pela proteção nativa de terceiros do Chromium.'
          ),
          '',
          'i-inprivate'
        ),
      t('Controles de privacidade aplicados às requisições e às sessões.')
    );

    const cleanup = U.card(
      t('Limpeza de dados'),
      `<p style="margin:0 0 10px;font-size:11.8px;line-height:1.55;color:#5b7284">${t(
        'Exclua histórico, downloads, cookies, cache e dados de sites de todas as sessões — inclusive a sessão InPrivate em uso.'
      )}</p>
      <button class="opt-small-btn" id="privacy-clear-data">${U.icon('i-trash')} ${t(
        'Escolher o que excluir…'
      )}</button>`,
      t('A limpeza é imediata e não pode ser desfeita.')
    );

    return cookies + popups + permissions + tracking + cleanup;
  }

  function mountPrivacy(root, ctx) {
    const range = root.querySelector('#cookie-level');
    range?.addEventListener('input', () => {
      const info = COOKIE_LEVELS[Number(range.value)] || COOKIE_LEVELS[2];
      ctx.set('privacy.cookieLevel', info.id);
      root.querySelectorAll('[data-cookie-label]').forEach((label) => {
        label.classList.toggle('on', Number(label.dataset.cookieLabel) === Number(range.value));
      });
      const current = root.querySelector('#cookie-current');
      if (current) {
        current.innerHTML = `<strong>${U.esc(t(info.label))}</strong><span>${U.esc(
          t(info.description)
        )}</span>`;
      }
    });

    root.querySelector('#privacy-cookie-sites')?.addEventListener('click', () => ctx.cookieSites());
    root.querySelector('#privacy-clear-data')?.addEventListener('click', () => ctx.clearData());
    root.querySelector('#privacy-clear-cookies')?.addEventListener('click', () =>
      ctx.clearData({ cookies: true, siteData: true, cache: true })
    );
  }

  P.general = {
    get title() {
      return t('Geral');
    },
    get subtitle() {
      return t('Página inicial, pesquisa, downloads, histórico e aparência do IE Neo.');
    },
    render: renderGeneral,
    mount: mountGeneral,
  };

  P.security = {
    get title() {
      return t('Segurança');
    },
    get subtitle() {
      return t(
        'As quatro zonas do Internet Explorer classificam sites e controlam permissões reais do Chromium.'
      );
    },
    render: renderSecurity,
    mount: mountSecurity,
  };

  P.privacy = {
    get title() {
      return t('Privacidade');
    },
    get subtitle() {
      return t(
        'Cookies, bloqueador de pop-ups, permissões de sites e sinais de rastreamento.'
      );
    },
    render: renderPrivacy,
    mount: mountPrivacy,
  };
})();

'use strict';

/** Catálogo en-US da janela de Opções da Internet. */
(function (root, factory) {
  const messages = factory();
  if (root.IEI18n) root.IEI18n.register(messages);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    /* Janela e navegação */
    Minimizar: 'Minimize',
    Maximizar: 'Maximize',
    'Seções das Opções da Internet': 'Internet Options sections',
    'Integração real': 'Real integration',
    'Página inicial e proxy também são gravados no Registro do Windows.':
      'The home page and proxy are also written to the Windows registry.',
    'Abrir inetcpl.cpl': 'Open inetcpl.cpl',
    'Restaurar esta seção': 'Restore this section',
    'Restaurar seção': 'Restore section',
    'As configurações são aplicadas ao navegador e ao Windows.':
      'Settings apply to the browser and to Windows.',
    'Restaurar padrões': 'Restore defaults',

    /* Utilitários compartilhados */
    reiniciar: 'restart',
    '(vazio)': '(empty)',
    'versão {version}': 'version {version}',

    /* Rodapé e status */
    'Aplicando configurações ao navegador e ao Windows…':
      'Applying settings to the browser and to Windows…',
    'Alterações não aplicadas · use Aplicar para gravar no navegador e no Windows.':
      'Unapplied changes · use Apply to save them to the browser and to Windows.',
    'Configurações sincronizadas com o navegador e o Windows.':
      'Settings are in sync with the browser and Windows.',

    /* Modais e toasts do controlador */
    'Não foi possível renderizar esta seção: {error}':
      'Could not render this section: {error}',
    'Não há alterações para aplicar.': 'There are no changes to apply.',
    'Configurações aplicadas ao navegador e ao Registro do Windows.':
      'Settings applied to the browser and to the Windows registry.',
    'Não foi possível aplicar: {error}': 'Could not apply: {error}',
    'Restaurar todas as configurações?': 'Restore all settings?',
    'As sete seções voltam aos valores originais do IE Neo, incluindo página inicial, zonas, cookies, proxy e avançado. Favoritos, histórico e downloads são preservados.':
      'All seven sections return to the original IE Neo values, including home page, zones, cookies, proxy, and advanced. Favorites, history, and downloads are preserved.',
    'Restaurar tudo': 'Restore all',
    'Configurações padrão restauradas.': 'Default settings restored.',
    'Falha ao restaurar: {error}': 'Could not restore: {error}',
    'Restaurar a seção {section}?': 'Restore the {section} section?',
    'Somente esta seção volta aos valores padrão. As demais seções e os seus dados pessoais são preservados.':
      'Only this section returns to its default values. All other sections and your personal data are preserved.',
    'Seção {section} restaurada.': '{section} section restored.',
    Confirmar: 'Confirm',
    'Esta ação será aplicada quando você confirmar.':
      'This action takes effect when you confirm.',
    'Reiniciar para concluir': 'Restart to finish',
    'As configurações já foram gravadas.': 'The settings have already been saved.',
    'Estas opções só entram em vigor depois de reiniciar o IE Neo:':
      'These options take effect only after you restart IE Neo:',
    'Você pode continuar usando o navegador e reiniciar mais tarde. O aviso voltará na próxima vez que aplicar estas opções.':
      'You can keep using the browser and restart later. The notice will return the next time you apply these options.',
    'Reiniciar depois': 'Restart later',
    'Reiniciar agora': 'Restart now',
    'Excluir dados de navegação': 'Delete browsing data',
    'Escolha o que deseja remover. A ação não pode ser desfeita.':
      'Choose what to remove. This action cannot be undone.',
    'Histórico de navegação': 'Browsing history',
    'Todas as entradas salvas neste computador.':
      'All entries saved on this computer.',
    'Lista de downloads': 'Download list',
    'Remove o registro dos arquivos baixados; os arquivos em disco não são apagados.':
      'Removes the record of downloaded files; files on disk are not deleted.',
    Cookies: 'Cookies',
    'Encerra sessões abertas em todos os sites.':
      'Signs out of open sessions on all sites.',
    Cache: 'Cache',
    'Arquivos temporários, imagens e scripts.': 'Temporary files, images, and scripts.',
    'Dados de sites': 'Site data',
    'Armazenamento local, IndexedDB, service workers e cache de aplicativos.':
      'Local storage, IndexedDB, service workers, and app cache.',
    'A sessão InPrivate em uso também é limpa. Favoritos e configurações não são afetados.':
      'The InPrivate session in use is also cleared. Favorites and settings are not affected.',
    'Excluir agora': 'Delete now',
    'Selecione ao menos um tipo de dado.': 'Select at least one type of data.',
    'Excluindo…': 'Deleting…',
    'Limpeza concluída: {items}.': 'Cleanup complete: {items}.',
    'Nenhum dado correspondente foi encontrado.': 'No matching data was found.',
    'Falha ao limpar: {error}': 'Could not clear: {error}',
    histórico: 'history',
    'dados de sites': 'site data',

    /* Regras de cookies por site */
    'Adicionar site': 'Add site',
    'exemplo.com ou *.exemplo.com': 'example.com or *.example.com',
    'Regras por site substituem o nível global de cookies. Use * para incluir subdomínios.':
      'Per-site rules replace the global cookie level. Use * to include subdomains.',
    'Regras de cookies por site': 'Per-site cookie rules',
    'Permita, bloqueie ou limite cookies de domínios específicos.':
      'Allow, block, or limit cookies for specific domains.',
    'Salvar regras': 'Save rules',
    'Regras de cookies atualizadas. Use Aplicar para ativar.':
      'Cookie rules updated. Use Apply to activate them.',
    'Ação para {domain}': 'Action for {domain}',
    'Só nesta sessão': 'This session only',
    'Remover {domain}': 'Remove {domain}',
    'Nenhuma regra por site. O nível global é usado para todos os sites.':
      'No per-site rules. The global level is used for all sites.',
    'Este site já tem uma regra.': 'This site already has a rule.',

    /* Sair da janela */
    'Descartar alterações?': 'Discard changes?',
    'Existem configurações ainda não aplicadas.':
      'There are settings that have not been applied yet.',
    'Você pode aplicar antes de sair ou descartar tudo o que foi alterado nesta janela.':
      'You can apply before leaving or discard everything changed in this window.',
    'Continuar editando': 'Keep editing',
    'Descartar e sair': 'Discard and exit',
    'Aplicar e sair': 'Apply and exit',
    'Painel de Controle do Windows aberto em Opções da Internet.':
      'Windows Control Panel opened at Internet Options.',
    'Não foi possível abrir o inetcpl.cpl.': 'Could not open inetcpl.cpl.',
    'Falha ao carregar os módulos das Opções da Internet.':
      'Failed to load the Internet Options modules.',
    'Não foi possível carregar as configurações.': 'Could not load settings.',
    'Falha ao conversar com o navegador: {error}':
      'Failed to communicate with the browser: {error}',
    'Falha ao carregar as configurações.': 'Failed to load settings.',

    /* Reinício */
    'Aceleração de hardware': 'Hardware acceleration',
    'DNS sobre HTTPS': 'DNS over HTTPS',
    'TLS 1.0/1.1 legado': 'Legacy TLS 1.0/1.1',

    /* Geral */
    'DuckDuckGo (padrão)': 'DuckDuckGo (default)',
    Bing: 'Bing',
    'Endereço da página inicial': 'Home page address',
    'Página atual': 'Current page',
    'Endereços http/https também são gravados em <b>HKCU\\Software\\Microsoft\\Internet Explorer\\Main — Start Page</b>. Páginas internas, como <b>ie://newtab</b>, mantêm o valor do Windows.':
      'http/https addresses are also written to <b>HKCU\\Software\\Microsoft\\Internet Explorer\\Main — Start Page</b>. Internal pages such as <b>ie://newtab</b> keep the Windows value.',
    'Ao iniciar o IE Neo': 'When IE Neo starts',
    'Abrir a página inicial': 'Open the home page',
    'Carrega o endereço configurado acima.': 'Loads the address configured above.',
    'Abrir a página de nova guia': 'Open the new tab page',
    'A experiência do IE Neo com pesquisa, atalhos e conteúdo do projeto.':
      'The IE Neo experience with search, shortcuts, and project content.',
    'Reabrir a última sessão': 'Reopen the last session',
    'Restaura as guias da última vez em que o navegador foi fechado.':
      'Restores the tabs from the last time the browser was closed.',
    'Continuar de onde parei': 'Continue where I left off',
    'Mantém a sessão salva mesmo quando a opção acima é diferente.':
      'Keeps the session saved even when the option above is different.',
    'Defina o que aparece ao abrir o navegador e qual endereço é usado pelo botão Página Inicial.':
      'Choose what appears when the browser opens and which address the Home button uses.',
    Pesquisa: 'Search',
    'Provedor de pesquisa': 'Search provider',
    'O provedor define o modelo de URL usado pela barra de endereços.':
      'The provider defines the URL template used by the address bar.',
    'URL de pesquisa': 'Search URL',
    'Use <b>{searchTerms}</b> no lugar do termo pesquisado. Este endereço também alimenta o valor <b>Search Page</b> do Windows.':
      'Use <b>{searchTerms}</b> in place of the search term. This address also feeds the Windows <b>Search Page</b> value.',
    'A barra de endereços envia a pesquisa ao provedor escolhido. O IE Neo não usa um serviço de sugestões externo.':
      'The address bar sends the search to the chosen provider. IE Neo does not use an external suggestion service.',
    'Escolha como a barra de endereços pesquisa quando você digita um termo.':
      'Choose how the address bar searches when you type a term.',
    'Pasta de downloads': 'Downloads folder',
    'Padrão do Windows (Downloads)': 'Windows default (Downloads)',
    'Escolher…': 'Choose…',
    'Deixe em branco para usar a pasta Downloads do Windows.':
      'Leave blank to use the Windows Downloads folder.',
    'Perguntar onde salvar cada download': 'Ask where to save each download',
    'Mostra a caixa de diálogo Salvar como em vez de baixar automaticamente.':
      'Shows the Save as dialog instead of downloading automatically.',
    'Controle onde os arquivos baixados são gravados.':
      'Control where downloaded files are saved.',
    'Histórico e navegação': 'History and browsing',
    'Manter histórico por': 'Keep history for',
    'Entradas mais antigas são descartadas automaticamente. O limite absoluto do banco local é de 5.000 itens.':
      'Older entries are discarded automatically. The local database is capped at 5,000 items.',
    'Excluir o histórico de navegação ao sair':
      'Delete browsing history when I exit',
    'Cookies e dados de sites InPrivate já são descartados automaticamente.':
      'Cookies and site data from InPrivate are already discarded automatically.',
    'Excluir histórico, cookies e cache…': 'Delete history, cookies, and cache…',
    'O histórico fica somente neste computador, no arquivo de configuração do IE Neo.':
      'History stays only on this computer, in the IE Neo configuration file.',
    Aparência: 'Appearance',
    Tema: 'Theme',
    Claro: 'Light',
    Escuro: 'Dark',
    'Sistema (automático)': 'System (automatic)',
    'Sistema acompanha automaticamente o modo claro ou escuro do Windows.':
      'System follows the Windows light or dark mode automatically.',
    'Idioma da interface': 'Interface language',
    'O idioma é aplicado ao navegador e a esta janela ao clicar em Aplicar ou OK. Não depende do idioma do Windows.':
      'The language is applied to the browser and to this window when you click Apply or OK. It does not depend on the Windows language.',
    'Mostrar a barra de Favoritos': 'Show the Favorites bar',
    'Exibe os favoritos da pasta Barra de Favoritos logo abaixo da barra de endereços.':
      'Shows favorites from the Favorites bar folder just below the address bar.',
    'Zoom padrão das páginas': 'Default page zoom',
    'Cada guia pode ser ampliada individualmente com Ctrl + roda do mouse.':
      'Each tab can be zoomed individually with Ctrl + mouse wheel.',
    'Preferências visuais do navegador, das Opções e da página de nova guia.':
      'Visual preferences for the browser, Internet Options, and the new tab page.',
    'Configurações do navegador': 'Browser settings',
    'Exportar configurações…': 'Export settings…',
    'Importar configurações…': 'Import settings…',
    'Arquivo local': 'Local file',
    Versão: 'Version',
    'Exporta as sete seções das Opções da Internet em um arquivo JSON, sem favoritos nem histórico.':
      'Exports all seven Internet Options sections to a JSON file, without favorites or history.',
    'A guia atual não tem um endereço que possa ser usado como página inicial.':
      'The current tab does not have an address that can be used as the home page.',
    'Página atual definida como página inicial.':
      'Current page set as the home page.',
    'Configurações exportadas com sucesso.': 'Settings exported successfully.',
    'Falha ao importar: {error}': 'Could not import: {error}',
    'Configurações importadas e aplicadas.': 'Settings imported and applied.',

    /* Zonas e segurança */
    'Remover {site}': 'Remove {site}',
    'Remover site': 'Remove site',
    'Nenhum site adicionado nesta zona. A zona ainda inclui os sites atribuídos automaticamente.':
      'No sites added to this zone. The zone still includes sites assigned automatically.',
    'Nível de segurança da zona': 'Zone security level',
    'Ativar Modo Protegido': 'Enable Protected Mode',
    'Executa o conteúdo da zona em um processo isolado com privilégios reduzidos, como no IE do Windows.':
      'Runs zone content in an isolated process with reduced privileges, as in Windows Internet Explorer.',
    'Sites nesta zona': 'Sites in this zone',
    'Use o curinga * para incluir subdomínios. O endereço é normalizado para o domínio.':
      'Use the * wildcard to include subdomains. The address is normalized to the domain.',
    'Zonas de segurança': 'Security zones',
    'As zonas do Internet Explorer continuam ativas: elas classificam cada site e controlam permissões, cookies e Modo Protegido no Chromium.':
      'Internet Explorer zones remain active: they classify each site and control permissions, cookies, and Protected Mode in Chromium.',
    'Como as zonas são aplicadas': 'How zones are applied',
    'Exigir HTTPS nos sites': 'Require HTTPS on sites',
    'Redireciona navegações HTTP para HTTPS fora da intranet local.':
      'Redirects HTTP navigations to HTTPS outside the local intranet.',
    'Exibir sites da intranet no Modo de Exibição de Compatibilidade':
      'Display intranet sites in Compatibility View',
    'Envia o agente de usuário do Internet Explorer 11 para os sites configurados.':
      'Sends the Internet Explorer 11 user agent to configured sites.',
    'Sites da zona <b>Restritos</b> sempre exibem um aviso antes de abrir e não recebem nenhuma permissão. Sites <b>Confiáveis</b> recebem permissões compatíveis sem prompts repetitivos. O nível <b>Alto</b> bloqueia permissões sensíveis.':
      'Sites in the <b>Restricted</b> zone always show a warning before opening and receive no permissions. <b>Trusted</b> sites receive compatible permissions without repeated prompts. The <b>High</b> level blocks sensitive permissions.',
    'Regras reais aplicadas pela pilha de rede e pelo manipulador de permissões.':
      'Real rules applied by the network stack and the permission handler.',
    'Certificados e identidade': 'Certificates and identity',
    'O IE Neo usa o repositório de certificados do Windows e a validação TLS do Chromium. Gerencie autoridades certificadoras, certificados pessoais e sites confiáveis no painel do Windows.':
      'IE Neo uses the Windows certificate store and Chromium TLS validation. Manage certificate authorities, personal certificates, and trusted sites in the Windows panel.',
    'Abrir Gerenciador de Certificados': 'Open Certificate Manager',
    'Integração com certmgr.msc do Windows.': 'Integration with Windows certmgr.msc.',
    'Este site já está nesta zona.': 'This site is already in this zone.',
    'Site adicionado à zona {zone}.': 'Site added to the {zone} zone.',
    'Não foi possível abrir o Gerenciador de Certificados.':
      'Could not open Certificate Manager.',

    /* Descrições das zonas (zones.js) */
    'A zona padrão para tudo que não está em outra zona. Nível recomendado: Médio alto.':
      'The default zone for everything not in another zone. Recommended level: Medium-high.',
    'Sites da rede local e da empresa. Endereços sem ponto, hosts .local e faixas de IP privadas entram aqui automaticamente.':
      'Sites on the local and corporate network. Dotless addresses, .local hosts, and private IP ranges are added here automatically.',
    'Sites em que você confia. Permissões sensíveis são concedidas com menos avisos e o Modo Protegido pode ser desativado.':
      'Sites you trust. Sensitive permissions are granted with fewer prompts, and Protected Mode can be turned off.',
    'Sites bloqueados. O IE Neo exibe um aviso antes de abrir qualquer página desta zona e nega todas as permissões.':
      'Blocked sites. IE Neo shows a warning before opening any page in this zone and denies all permissions.',

    /* Descrições dos níveis (zones.js) */
    'A maioria do conteúdo é executada sem avisos. Não recomendado para uso diário.':
      'Most content runs without prompts. Not recommended for daily use.',
    'Permite ActiveX, scripts, cookies de terceiros e downloads automáticos.':
      'Allows ActiveX, scripts, third-party cookies, and automatic downloads.',
    'Adequado para redes locais confiáveis.': 'Suitable for trusted local networks.',
    'Executa conteúdo ativo com poucos avisos; permite a maioria dos cookies.':
      'Runs active content with few prompts; allows most cookies.',
    'Equilíbrio entre compatibilidade e segurança. Recomendado para intranets.':
      'A balance between compatibility and security. Recommended for intranets.',
    'Pede confirmação antes de conteúdo ativo; bloqueia cookies de terceiros sem política.':
      'Asks for confirmation before active content; blocks third-party cookies without a policy.',
    'Nível recomendado para a Internet.': 'Recommended level for the Internet.',
    'Bloqueia cookies de terceiros, pede confirmação para permissões e sinaliza conteúdo misto.':
      'Blocks third-party cookies, asks for confirmation on permissions, and flags mixed content.',
    'Máxima restrição. Sites podem perder funcionalidades.':
      'Maximum restriction. Sites may lose functionality.',
    'Bloqueia cookies de terceiros e boa parte do conteúdo ativo; exige HTTPS.':
      'Blocks third-party cookies and much active content; requires HTTPS.',

    /* Níveis de cookies */
    'Bloquear tudo': 'Block all',
    'Bloquear todos os cookies': 'Block all cookies',
    'Nenhum site pode gravar cookies. Login e preferências podem deixar de funcionar, mas o rastreamento entre sessões é praticamente eliminado.':
      'No site can store cookies. Sign-in and preferences may stop working, but cross-session tracking is practically eliminated.',
    'Cookies de terceiros são bloqueados e os cookies primários só são aceitos quando necessários. Recomendado para uso mais restrito.':
      'Third-party cookies are blocked and first-party cookies are accepted only when necessary. Recommended for stricter use.',
    'Cookies primários são aceitos; cookies de terceiros são bloqueados. Equilíbrio recomendado entre privacidade e compatibilidade.':
      'First-party cookies are accepted; third-party cookies are blocked. The recommended balance between privacy and compatibility.',
    'Aceita cookies primários e de terceiros com restrições de sessão. Compatível com a maioria dos sites modernos.':
      'Accepts first-party and third-party cookies with session restrictions. Compatible with most modern sites.',
    'Aceita a maioria dos cookies, inclusive de terceiros. Útil em sites que dependem de vários domínios para funcionar.':
      'Accepts most cookies, including third-party ones. Useful on sites that depend on several domains to work.',
    'Aceitar tudo': 'Accept all',
    'Aceitar todos os cookies': 'Accept all cookies',
    'Todos os cookies são aceitos sem filtro. Maior compatibilidade e menor privacidade — use apenas em sites de confiança.':
      'All cookies are accepted without filtering. Greater compatibility and less privacy — use only on trusted sites.',

    /* Permissões */
    'Compartilhar sua localização aproximada com o site.':
      'Share your approximate location with the site.',
    'Usar a câmera em videochamadas e capturas.':
      'Use the camera in video calls and captures.',
    'Capturar áudio pelo microfone.': 'Capture audio through the microphone.',
    'Exibir notificações da área de trabalho enviadas pelo site.':
      'Show desktop notifications sent by the site.',

    /* Privacidade */
    '{count} site com regra própria.': '{count} site with its own rule.',
    '{count} sites com regras próprias.': '{count} sites with their own rules.',
    'Cookies e dados de sites': 'Cookies and site data',
    'Nível de cookies': 'Cookie level',
    'Gerenciar sites com regras próprias': 'Manage sites with their own rules',
    'Excluir cookies e dados de sites…': 'Delete cookies and site data…',
    'O nível global é aplicado pelo manipulador de cookies do Chromium, inclusive cabeçalhos Set-Cookie de terceiros.':
      'The global level is applied by the Chromium cookie handler, including third-party Set-Cookie headers.',
    'Bloqueador de pop-ups': 'Pop-up blocker',
    'Bloquear pop-ups': 'Block pop-ups',
    'Intercepta janelas abertas sem interação do usuário. Pop-ups legítimos podem ser liberados na barra de informações.':
      'Intercepts windows opened without user interaction. Legitimate pop-ups can be allowed from the information bar.',
    'O IE Neo usa o mesmo bloqueio para janelas abertas por scripts e por links com target=_blank sem gesto do usuário. A página pode solicitar a liberação.':
      'IE Neo uses the same blocking for windows opened by scripts and by target=_blank links without a user gesture. The page can request to be allowed.',
    'Controle janelas indesejadas abertas pelos sites.':
      'Control unwanted windows opened by sites.',
    'Permissões de sites': 'Site permissions',
    'Sites na zona Restritos são sempre bloqueados. Em sites Confiáveis, a escolha “Perguntar” é tratada como permitida. O Modo Protegido é aplicado a todas as zonas por padrão.':
      'Sites in the Restricted zone are always blocked. On Trusted sites, the “Ask” choice is treated as allowed. Protected Mode is applied to all zones by default.',
    'Decisões padrão usadas quando um site pede acesso a recursos sensíveis.':
      'Default decisions used when a site requests access to sensitive resources.',
    'Rastreamento e InPrivate': 'Tracking and InPrivate',
    'Enviar o sinal Não Rastrear (DNT) e Global Privacy Control (GPC)':
      'Send the Do Not Track (DNT) and Global Privacy Control (GPC) signals',
    'Adiciona os cabeçalhos DNT: 1 e Sec-GPC: 1 a todas as requisições. A decisão de respeitar o sinal é do site.':
      'Adds the DNT: 1 and Sec-GPC: 1 headers to every request. Whether to honor the signal is up to the site.',
    'Janelas InPrivate usam uma partição de sessão separada: cookies, cache e histórico local são descartados ao fechar. O sinal DNT continua sendo enviado. O Filtro InPrivate legado foi substituído pela proteção nativa de terceiros do Chromium.':
      'InPrivate windows use a separate session partition: cookies, cache, and local history are discarded when they close. The DNT signal is still sent. The legacy InPrivate Filtering has been replaced by Chromium native third-party protection.',
    'Controles de privacidade aplicados às requisições e às sessões.':
      'Privacy controls applied to requests and sessions.',
    'Limpeza de dados': 'Data cleanup',
    'Exclua histórico, downloads, cookies, cache e dados de sites de todas as sessões — inclusive a sessão InPrivate em uso.':
      'Delete history, downloads, cookies, cache, and site data from all sessions — including the InPrivate session in use.',
    'Escolher o que excluir…': 'Choose what to delete…',
    'A limpeza é imediata e não pode ser desfeita.':
      'Cleanup is immediate and cannot be undone.',

    /* Títulos das seções */
    'Página inicial, pesquisa, downloads, histórico e aparência do IE Neo.':
      'Home page, search, downloads, history, and appearance of IE Neo.',
    'As quatro zonas do Internet Explorer classificam sites e controlam permissões reais do Chromium.':
      'The four Internet Explorer zones classify sites and control real Chromium permissions.',
    'Cookies, bloqueador de pop-ups, permissões de sites e sinais de rastreamento.':
      'Cookies, pop-up blocker, site permissions, and tracking signals.',
    'Feeds, AutoCompletar, certificados e conteúdo confiável.':
      'Feeds, AutoComplete, certificates, and trusted content.',
    'Proxy, configuração automática e diagnóstico da rede do Windows.':
      'Proxy, automatic configuration, and Windows network diagnostics.',
    'Navegador padrão, programas do Windows e complementos internos.':
      'Default browser, Windows programs, and built-in add-ons.',
    'Configurações detalhadas de multimídia, compatibilidade, rede e desenvolvimento.':
      'Detailed multimedia, compatibility, network, and development settings.',

    /* Conteúdo */
    'Feeds e conteúdo': 'Feeds and content',
    'Ativar descoberta de feeds RSS/Atom': 'Enable RSS/Atom feed discovery',
    'O botão de feeds na barra de ferramentas detecta feeds anunciados pela página e abre o leitor integrado (Alt+J).':
      'The feeds button on the toolbar detects feeds announced by the page and opens the built-in reader (Alt+J).',
    'O leitor usa a mesma sessão de rede do navegador e respeita cookies, proxy, HTTPS e as zonas de segurança. Feeds protegidos por autenticação aparecem somente quando a sessão já está autenticada.':
      'The reader uses the same browser network session and respects cookies, proxy, HTTPS, and security zones. Feeds protected by authentication appear only when the session is already authenticated.',
    'Detecte e leia feeds sem instalar extensões.':
      'Detect and read feeds without installing extensions.',
    AutoCompletar: 'AutoComplete',
    'Sugerir favoritos na barra de endereços': 'Suggest favorites in the address bar',
    'Mostra correspondências da sua pasta de Favoritos enquanto você digita.':
      'Shows matches from your Favorites folder as you type.',
    'Sugerir endereços do histórico': 'Suggest addresses from history',
    'Usa o histórico local para completar endereços já visitados.':
      'Uses local history to complete addresses you have already visited.',
    'Sugerir a pesquisa digitada': 'Suggest the typed search',
    'Exibe a opção Pesquisar por “termo” no topo da lista de sugestões.':
      'Shows the Search for “term” option at the top of the suggestion list.',
    'As sugestões são calculadas localmente; nada é enviado a um serviço externo.':
      'Suggestions are computed locally; nothing is sent to an external service.',
    'Certificados e conteúdo confiável': 'Certificates and trusted content',
    'O navegador valida TLS com o repositório do Windows. Use o Gerenciador de Certificados para importar certificados pessoais, remover raízes não confiáveis ou conferir certificados de cliente.':
      'The browser validates TLS with the Windows certificate store. Use Certificate Manager to import personal certificates, remove untrusted roots, or check client certificates.',
    'A classificação de conteúdo PICS do Internet Explorer clássico não é aplicada pelo Chromium. Controles parentais do Windows continuam válidos no nível do sistema.':
      'Classic Internet Explorer PICS content ratings are not enforced by Chromium. Windows parental controls remain valid at the system level.',
    'Confiança, certificados e conteúdo avaliado.':
      'Trust, certificates, and rated content.',

    /* Conexões */
    'Configuração atual do Windows': 'Current Windows configuration',
    'Página de pesquisa': 'Search page',
    'Página padrão': 'Default page',
    'Proxy ativado': 'Proxy enabled',
    'Servidor proxy': 'Proxy server',
    Exceções: 'Exceptions',
    'Script automático': 'Automatic script',
    'Estes valores vêm de <b>HKCU\\Software\\Microsoft\\Internet Explorer\\Main</b> e <b>HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings</b>. Ao aplicar, o IE Neo grava página inicial, página de pesquisa e proxy nessas chaves.':
      'These values come from <b>HKCU\\Software\\Microsoft\\Internet Explorer\\Main</b> and <b>HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings</b>. When you apply, IE Neo writes the home page, search page, and proxy to those keys.',
    'Leitura real do Registro do usuário, sem privilégios administrativos.':
      'A real read of the user registry, without administrative privileges.',
    'Configuração automática': 'Automatic configuration',
    'Detectar configurações automaticamente': 'Detect settings automatically',
    'Pede ao Windows que localize um script de configuração (WPAD) quando nenhum proxy fixo ou PAC estiver definido.':
      'Asks Windows to locate a configuration script (WPAD) when no fixed proxy or PAC is defined.',
    'O Chromium aplica a configuração em todas as sessões, inclusive InPrivate. Alterações de proxy entram em vigor imediatamente após Aplicar.':
      'Chromium applies the configuration to all sessions, including InPrivate. Proxy changes take effect immediately after Apply.',
    'Deixe o Windows descobrir a rede da empresa ou da residência.':
      'Let Windows discover the corporate or home network.',
    'Usar um servidor proxy para conexões': 'Use a proxy server for connections',
    'Ativa o proxy fixo abaixo. Se houver um script automático, ele tem prioridade sobre o proxy fixo.':
      'Enables the fixed proxy below. If there is an automatic script, it takes precedence over the fixed proxy.',
    Endereço: 'Address',
    'http=proxy.empresa.com:8080;https=proxy.empresa.com:8080':
      'http=proxy.company.com:8080;https=proxy.company.com:8080',
    'Aceita o formato do Windows: <b>http=host:porta;https=host:porta</b> ou um único <b>host:porta</b>.':
      'Accepts the Windows format: <b>http=host:port;https=host:port</b> or a single <b>host:port</b>.',
    'Não usar proxy para': 'Do not use proxy for',
    'Lista separada por ponto e vírgula. O valor é gravado em <b>ProxyOverride</b>.':
      'Semicolon-separated list. The value is written to <b>ProxyOverride</b>.',
    'Script de configuração automática (PAC)': 'Automatic configuration script (PAC)',
    'Também gravado em <b>AutoConfigURL</b>. Deixe em branco para remover o script.':
      'Also written to <b>AutoConfigURL</b>. Leave blank to remove the script.',
    'Configuração equivalente à aba Conexões do inetcpl.cpl.':
      'Configuration equivalent to the Connections tab in inetcpl.cpl.',
    'Teste de conexão e diagnóstico': 'Connection test and diagnostics',
    'Endereço para testar': 'Address to test',
    'Testar conexão': 'Test connection',
    Diagnóstico: 'Diagnostics',
    'O teste usa a sessão de rede normal e a configuração de proxy já aplicada.':
      'The test uses the normal network session and the proxy configuration already applied.',
    'Verifique DNS, porta TCP, adaptador e proxy antes de concluir que um site está fora do ar.':
      'Check DNS, TCP port, adapter, and proxy before concluding that a site is down.',
    'Ferramentas do Windows': 'Windows tools',
    'Configurações de rede': 'Network settings',
    'Proxy do Windows': 'Windows proxy',
    'Conexões discadas': 'Dial-up connections',
    'Editor do Registro': 'Registry Editor',
    'O IE Neo não altera as zonas de segurança do Windows por segurança. As zonas internas do navegador são gravadas somente no arquivo de configuração local.':
      'For safety, IE Neo does not change Windows security zones. The browser internal zones are written only to the local configuration file.',
    'Atalhos para os painéis clássicos e modernos do Windows.':
      'Shortcuts to classic and modern Windows panels.',
    'Porta {port}': 'Port {port}',
    'Adaptador de rede': 'Network adapter',
    'Configuração de proxy': 'Proxy configuration',
    'Testando conexão…': 'Testing connection…',
    'Conexão bem-sucedida': 'Connection successful',
    'HTTP {status} em {elapsed} ms.': 'HTTP {status} in {elapsed} ms.',
    'Falha na conexão': 'Connection failed',
    'Executando diagnóstico…': 'Running diagnostics…',
    'Erro no diagnóstico': 'Diagnostics error',

    /* Programas */
    'Navegador padrão': 'Default browser',
    'O IE Neo está registrado como manipulador de <b>http</b> e <b>https</b> para o seu usuário.':
      'IE Neo is registered as the handler for <b>http</b> and <b>https</b> for your user.',
    'O IE Neo ainda não é o navegador padrão. O Windows 11 exige que a escolha seja confirmada nas Configurações de aplicativos padrão.':
      'IE Neo is not the default browser yet. Windows 11 requires the choice to be confirmed in Default apps settings.',
    'Definir como navegador padrão': 'Set as default browser',
    'Abrir aplicativos padrão': 'Open default apps',
    'O Windows moderno não permite que um aplicativo se torne padrão silenciosamente. O IE Neo registra os protocolos e abre a página correta das Configurações para a confirmação final.':
      'Modern Windows does not let an app become the default silently. IE Neo registers the protocols and opens the correct Settings page for final confirmation.',
    'Integração com os protocolos HTTP e HTTPS do Windows.':
      'Integration with the Windows HTTP and HTTPS protocols.',
    'Programas do Windows': 'Windows programs',
    'Editor HTML': 'HTML editor',
    'Programa usado para editar o código-fonte de uma página. O valor é apenas informativo neste build.':
      'Program used to edit a page source. The value is informational only in this build.',
    'Cliente de e-mail': 'Email client',
    'Padrão do Windows': 'Windows default',
    'Cliente sugerido em links mailto: quando nenhum aplicativo padrão estiver definido.':
      'Client suggested for mailto: links when no default app is set.',
    'Os aplicativos associados a arquivos e protocolos são gerenciados pelo Windows. Use “Abrir aplicativos padrão” para alterar associações.':
      'Apps associated with files and protocols are managed by Windows. Use “Open default apps” to change associations.',
    'Preferências herdadas das Opções da Internet clássicas.':
      'Preferences inherited from classic Internet Options.',
    'Componente interno obrigatório': 'Required built-in component',
    'Ativar ou desativar': 'Enable or disable',
    'Complementos e componentes': 'Add-ons and components',
    'Nenhum complemento disponível.': 'No add-ons available.',
    'Componentes marcados como obrigatórios fazem parte do motor Chromium e não podem ser desativados. Os demais complementos internos alteram configurações reais de privacidade, feeds ou compatibilidade.':
      'Components marked as required are part of the Chromium engine and cannot be disabled. The other built-in add-ons change real privacy, feed, or compatibility settings.',
    'Componentes carregados pelo IE Neo.': 'Components loaded by IE Neo.',
    'O IE Neo está registrado como navegador padrão.':
      'IE Neo is registered as the default browser.',
    'Confirme o IE Neo nas Configurações do Windows.':
      'Confirm IE Neo in Windows Settings.',
    'Não foi possível alterar este complemento.':
      'Could not change this add-on.',
    'Visualizador de PDF do Chromium': 'Chromium PDF viewer',
    'Abre arquivos PDF diretamente no navegador.':
      'Opens PDF files directly in the browser.',
    'Módulo de descriptografia de conteúdo Widevine':
      'Widevine content decryption module',
    'Necessário para reprodução de conteúdo protegido (DRM).':
      'Required to play protected content (DRM).',
    'Descoberta de Feeds': 'Feed Discovery',
    'Detecta feeds RSS/Atom nas páginas e alimenta o leitor de feeds.':
      'Detects RSS/Atom feeds on pages and feeds the feed reader.',
    'Assistente de Compatibilidade': 'Compatibility Assistant',
    'Emula o mecanismo Trident para sites que exigem o Internet Explorer clássico.':
      'Emulates the Trident engine for sites that require classic Internet Explorer.',

    /* Avançado */
    Multimídia: 'Multimedia',
    Navegação: 'Navigation',
    Compatibilidade: 'Compatibility',
    'Privacidade e segurança': 'Privacy and security',
    'Rede e desempenho': 'Network and performance',
    Desenvolvimento: 'Development',
    'Mostrar imagens': 'Show pictures',
    'Desativa o carregamento de imagens para economizar dados.':
      'Turns off image loading to save data.',
    'Reproduzir animações em páginas da Web': 'Play animations in webpages',
    'Desativa animações e transições CSS nas páginas.':
      'Turns off CSS animations and transitions on pages.',
    'Reproduzir sons em páginas da Web': 'Play sounds in webpages',
    'Silencia o áudio de todas as guias.': 'Mutes audio in all tabs.',
    'Ativar JavaScript': 'Enable JavaScript',
    'Aplicado a novas guias. Desativar quebra a maioria dos sites modernos.':
      'Applied to new tabs. Disabling it breaks most modern sites.',
    'Mostrar barra de status': 'Show status bar',
    'Exibe a zona, o Modo Protegido e o estado do carregamento.':
      'Shows the zone, Protected Mode, and loading status.',
    'Mostrar barra de informações': 'Show information bar',
    'Exibe avisos não bloqueantes, como pop-ups bloqueados e sessões InPrivate.':
      'Shows non-blocking notices, such as blocked pop-ups and InPrivate sessions.',
    'Mostrar sugestões na barra de endereços': 'Show suggestions in the address bar',
    'Combina favoritos, histórico e a pesquisa digitada.':
      'Combines favorites, history, and the typed search.',
    'Notificar quando um download terminar': 'Notify when a download finishes',
    'Mostra uma notificação do sistema ao concluir.':
      'Shows a system notification when it completes.',
    'Exibir todos os sites no Modo de Exibição de Compatibilidade':
      'Display all sites in Compatibility View',
    'Envia o agente de usuário do Internet Explorer 11 e desativa recursos modernos para máxima compatibilidade.':
      'Sends the Internet Explorer 11 user agent and turns off modern features for maximum compatibility.',
    'Cadeia de agente de usuário': 'User agent string',
    'Identidade enviada aos sites. O modo IE Neo anuncia Chromium com a assinatura IE Neo.':
      'Identity sent to sites. IE Neo mode advertises Chromium with the IE Neo signature.',
    'IE Neo (padrão)': 'IE Neo (default)',
    Personalizada: 'Custom',
    'Agente de usuário personalizado': 'Custom user agent',
    'Usado somente quando a opção Personalizada está selecionada.':
      'Used only when Custom is selected.',
    'Exigir HTTPS em todos os sites': 'Require HTTPS on all sites',
    'Redireciona HTTP para HTTPS, exceto na intranet local.':
      'Redirects HTTP to HTTPS, except on the local intranet.',
    'Verificar ortografia ao digitar': 'Check spelling as I type',
    'Usa os dicionários pt-BR e en-US do Chromium.':
      'Uses the Chromium pt-BR and en-US dictionaries.',
    'Usar aceleração de hardware quando disponível':
      'Use hardware acceleration when available',
    'Desative apenas se houver falhas gráficas.':
      'Disable only if you see graphics glitches.',
    'Ativar HTTP/3 (QUIC)': 'Enable HTTP/3 (QUIC)',
    'Usa QUIC em sites que oferecem suporte.': 'Uses QUIC on sites that support it.',
    'DNS sobre HTTPS (DoH)': 'DNS over HTTPS (DoH)',
    'Resolve nomes por um provedor criptografado. A opção Automático usa a configuração do sistema.':
      'Resolves names through an encrypted provider. The Automatic option uses the system configuration.',
    'Automático (sistema)': 'Automatic (system)',
    'Permitir TLS 1.0 e 1.1 (inseguro)': 'Allow TLS 1.0 and 1.1 (insecure)',
    'Compatibilidade com servidores antigos. Não recomendado.':
      'Compatibility with old servers. Not recommended.',
    'Habilitar Ferramentas do Desenvolvedor': 'Enable Developer Tools',
    'Permite abrir DevTools com F12 e inspecionar elementos.':
      'Lets you open DevTools with F12 and inspect elements.',
    'Sites de compatibilidade': 'Compatibility sites',
    'Estes sites recebem o agente do Internet Explorer 11 e o modo de compatibilidade, mesmo que a opção global esteja desativada.':
      'These sites receive the Internet Explorer 11 user agent and compatibility mode, even when the global option is off.',
    'Exceções por site para sites legados que exigem o motor Trident.':
      'Per-site exceptions for legacy sites that require the Trident engine.',
    'Nenhum site na lista. O Modo de Exibição de Compatibilidade global continua disponível.':
      'No sites in the list. Global Compatibility View is still available.',
    'Localizar uma configuração': 'Find a setting',
    'Este site já está na lista.': 'This site is already in the list.',
    'Site adicionado ao Modo de Exibição de Compatibilidade.':
      'Site added to Compatibility View.',
  };
});

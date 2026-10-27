'use strict';

/** Catálogo en-US da página de nova guia. */
(function (root, factory) {
  const messages = factory();
  if (root.IEI18n) root.IEI18n.register(messages);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return {
    /* Cabeçalho e navegação (os demais itens vêm de i18n-en-common.js) */
    'Bem-vindo': 'Welcome',

    /* Boas-vindas da primeira execução */
    'Bem-vindo ao IE Neo': 'Welcome to IE Neo',
    'Criado por FGOMESX.': 'Created by FGOMESX.',
    'Página do projeto': 'Project page',

    /* Hero e pesquisa */
    'A Web, do seu jeito. Pesquise, descubra e continue de onde parou.':
      'The web, your way. Search, discover, and pick up where you left off.',
    'Pesquisar na Web com o DuckDuckGo': 'Search the web with DuckDuckGo',
    'Pesquisar na Web': 'Search the web',
    Pressione: 'Press',
    'para pesquisar': 'to search',
    'para digitar um endereço': 'to type an address',

    /* Atalhos e retomada */
    Atalhos: 'Shortcuts',
    'Gerenciar favoritos': 'Manage favorites',
    'Continuar de onde parou': 'Pick up where you left off',
    'Ver histórico': 'View history',

    /* Projeto */
    'Sobre o projeto': 'About project',
    'Repositório no GitHub': 'Repository on GitHub',
    'Código aberto': 'Open source',
    'Conheça o IE Neo': 'Meet IE Neo',
    'Interface clássica, motor Chromium e integração com o Windows. Acompanhe o projeto, o código e as novidades no GitHub.':
      'Classic interface, Chromium engine, and Windows integration. Follow the project, the code, and the latest news on GitHub.',
    'Visite o repositório do desenvolvedor': "Visit the developer's repository",
    'FGOMESX no GitHub': 'FGOMESX on GitHub',
    'Sobre o IE Neo': 'About IE Neo',
    'Versão, créditos e informações': 'Version, credits, and information',
    'Personalize o navegador': 'Make it yours',
    'Clique para alternar': 'Click to switch',
    'Alternar tema': 'Switch theme',
    Claro: 'Light',
    Escuro: 'Dark',
    'Interface clássica, motor Chromium e integração com as Opções da Internet do Windows.':
      'Classic interface, Chromium engine, and integration with Windows Internet Options.',
    'Abrir janela Sobre': 'Open About window',

    /* Cartões laterais */
    'Modo Protegido ativado': 'Protected Mode on',
    'Zonas de segurança, bloqueio de pop-ups e HTTPS ativo por padrão. Ajuste tudo em Opções da Internet.':
      'Security zones, pop-up blocking, and HTTPS on by default. Adjust everything in Internet Options.',
    'Revisar segurança': 'Review security',
    'Você sabia?': 'Did you know?',
    'O IE Neo mantém as zonas de segurança do Windows e agora usa o Chromium para renderizar as páginas.':
      'IE Neo keeps Windows security zones and now uses Chromium to render pages.',
    'Conhecer as opções': 'Explore options',

    /* Rodapé */
    'IE Neo · Projeto conceitual de FGOMESX, não afiliado à Microsoft':
      'IE Neo · Concept project by FGOMESX, not affiliated with Microsoft',
    'Código aberto no GitHub': 'Open source on GitHub',

    /* Saudação dinâmica */
    'Bom dia': 'Good morning',
    'Boa tarde': 'Good afternoon',
    'Boa noite': 'Good evening',
  };
});

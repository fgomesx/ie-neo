'use strict';

/**
 * Catálogo en-US do processo principal do IE Neo.
 * As chaves são o texto em português usado em main.js, zones.js e diálogos.
 */
module.exports = {
  Editar: 'Edit',
  Desfazer: 'Undo',
  Refazer: 'Redo',
  Recortar: 'Cut',
  Copiar: 'Copy',
  Colar: 'Paste',
  'Selecionar tudo': 'Select all',
  'Opções da Internet': 'Internet Options',
  'Escolher pasta de downloads': 'Choose downloads folder',
  'Exportar configurações': 'Export settings',
  'Importar configurações': 'Import settings',
  'Configurações do IE Neo': 'IE Neo settings',
  'Download concluído': 'Download complete',
  'Falha no download': 'Download failed',
  'Nova guia': 'New tab',
  'Página inicial': 'Home page',

  /* Protocolo interno ie:// */
  'Recurso não encontrado': 'Resource not found',
  'Requisição inválida': 'Invalid request',
  'Acesso negado': 'Access denied',
  'Página interna desconhecida': 'Unknown internal page',

  /* Diagnóstico de conexão */
  'Adaptador de rede': 'Network adapter',
  'O Windows reporta uma conexão ativa.': 'Windows reports an active connection.',
  'Nenhuma conexão de rede ativa.': 'No active network connection.',
  'Tempo esgotado': 'Timed out',
  'Resolvido para {addresses} ({ms} ms).': 'Resolved to {addresses} ({ms} ms).',
  'Não foi possível resolver o nome: {error}.': 'Could not resolve the name: {error}.',
  'Porta {port}': 'Port {port}',
  'Conexão TCP estabelecida na porta {port}.': 'TCP connection established on port {port}.',
  'Tempo esgotado ao conectar na porta {port}.': 'Timed out connecting to port {port}.',
  'Configuração de proxy': 'Proxy configuration',
  'Script de configuração automática: {pac}': 'Automatic configuration script: {pac}',
  'Servidor proxy: {server}': 'Proxy server: {server}',
  '(não definido)': '(not set)',
  'Detecção automática de configurações ativada, sem proxy fixo.':
    'Automatic configuration detection is enabled, with no fixed proxy.',
  'Conexão direta, sem proxy.': 'Direct connection, no proxy.',
  '{zone} — Modo Protegido {state}.': '{zone} — Protected Mode {state}.',
  ativado: 'on',
  desativado: 'off',

  /* Limpeza de dados de navegação */
  histórico: 'history',
  'dados de sites': 'site data',

  /* Complementos (options:addons) */
  'Visualizador de PDF do Chromium': 'Chromium PDF Viewer',
  'Abre arquivos PDF diretamente no navegador.': 'Opens PDF files directly in the browser.',
  'Módulo de descriptografia de conteúdo Widevine': 'Widevine Content Decryption Module',
  'Necessário para reprodução de conteúdo protegido (DRM).':
    'Required for playback of protected content (DRM).',
  'Descoberta de Feeds': 'Feed Discovery',
  'Detecta feeds RSS/Atom nas páginas e alimenta o leitor de feeds.':
    'Detects RSS/Atom feeds on pages and feeds the feed reader.',
  'Assistente de Compatibilidade': 'Compatibility Assistant',
  'Emula o mecanismo Trident para sites que exigem o Internet Explorer clássico.':
    'Emulates the Trident engine for sites that require classic Internet Explorer.',
};

/**
 * Normaliza convites copiados diretamente do WhatsApp.
 * Parâmetros de compartilhamento (?mode=...) e fragmentos não fazem parte
 * do token do grupo e não devem impedir o cadastro.
 */
export function normalizeGroupInviteLink(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('O link de convite não é uma URL válida. Copie-o pelo WhatsApp.');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'chat.whatsapp.com' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    throw new Error('Use o link do grupo, começando por https://chat.whatsapp.com/.');
  }

  const match = /^\/([A-Za-z0-9]+)\/?$/.exec(url.pathname);
  if (!match) {
    throw new Error('Não encontrei o código de convite no link. Copie o link completo pelo WhatsApp.');
  }

  return 'https://chat.whatsapp.com/' + match[1];
}

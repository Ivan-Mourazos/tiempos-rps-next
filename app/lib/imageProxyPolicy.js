import path from 'node:path';

const MIME_BY_EXTENSION = new Map([
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

const DEFAULT_REMOTE_ORIGINS = 'http://192.168.0.128';
const DEFAULT_REMOTE_PREFIXES = '/SAT/';
const DEFAULT_NETWORK_BASE = '\\\\192.168.0.128\\Sisgeko';
const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

export class ImageSourceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ImageSourceError';
    this.status = status;
  }
}

function parseList(value, fallback) {
  return String(value || fallback)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ImageSourceError('Configuración de origen de imagen non válida', 500);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ImageSourceError('Configuración de origen de imagen non válida', 500);
  }

  return url.origin.toLowerCase();
}

function normalizePrefix(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

function parseMaxBytes(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_BYTES;
  return Math.min(Math.max(parsed, 1024), 50 * 1024 * 1024);
}

export function createImagePolicy(env = process.env) {
  return {
    allowedOrigins: new Set(
      parseList(env.IMAGE_REMOTE_ORIGINS, DEFAULT_REMOTE_ORIGINS).map(normalizeOrigin)
    ),
    allowedPathPrefixes: parseList(
      env.IMAGE_REMOTE_PATH_PREFIXES,
      DEFAULT_REMOTE_PREFIXES
    ).map(normalizePrefix),
    networkBase: path.win32.resolve(env.IMAGE_NETWORK_BASE || DEFAULT_NETWORK_BASE),
    maxBytes: parseMaxBytes(env.IMAGE_MAX_BYTES),
  };
}

export function getImageContentType(filePath) {
  const extension = path.win32.extname(filePath).toLowerCase();
  const contentType = MIME_BY_EXTENSION.get(extension);
  if (!contentType) {
    throw new ImageSourceError('Formato de imaxe non permitido', 415);
  }
  return contentType;
}

function resolveRemoteSource(rawPath, policy) {
  let url;
  try {
    url = new URL(rawPath);
  } catch {
    throw new ImageSourceError('URL de imaxe non válida');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    !policy.allowedOrigins.has(url.origin.toLowerCase())
  ) {
    throw new ImageSourceError('Orixe de imaxe non permitido', 403);
  }

  let decodedPathname = url.pathname;
  try {
    for (let pass = 0; pass < 2; pass += 1) {
      const decoded = decodeURIComponent(decodedPathname);
      if (decoded === decodedPathname) break;
      decodedPathname = decoded;
    }
  } catch {
    throw new ImageSourceError('Ruta remota de imaxe non válida');
  }

  const pathSegments = decodedPathname.split('/');
  if (
    decodedPathname.includes('\\') ||
    pathSegments.some(segment => segment === '.' || segment === '..')
  ) {
    throw new ImageSourceError('Ruta remota de imaxe non permitida', 403);
  }

  const pathname = decodedPathname.toLowerCase();
  const pathAllowed = policy.allowedPathPrefixes.some(prefix =>
    pathname.startsWith(prefix.toLowerCase())
  );
  if (!pathAllowed) {
    throw new ImageSourceError('Ruta remota de imaxe non permitida', 403);
  }

  return {
    kind: 'remote',
    url,
    contentType: getImageContentType(decodedPathname),
  };
}

function resolveLocalSource(rawPath, policy) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawPath) && !/^[a-z]:[\\/]/i.test(rawPath)) {
    throw new ImageSourceError('Protocolo non permitido', 403);
  }

  const normalizedPath = rawPath.replaceAll('/', '\\');
  const fullPath = path.win32.resolve(policy.networkBase, normalizedPath);
  const relativePath = path.win32.relative(policy.networkBase, fullPath);

  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.win32.sep}`) ||
    path.win32.isAbsolute(relativePath)
  ) {
    throw new ImageSourceError('Ruta local de imaxe non permitida', 403);
  }

  return {
    kind: 'local',
    path: fullPath,
    contentType: getImageContentType(fullPath),
  };
}

export function resolveImageSource(rawPath, policy = createImagePolicy()) {
  const value = String(rawPath || '').trim();
  if (!value || value.length > 2048 || value.includes('\0')) {
    throw new ImageSourceError('Ruta de imaxe non válida');
  }

  if (/^https?:\/\//i.test(value)) {
    return resolveRemoteSource(value, policy);
  }

  return resolveLocalSource(value, policy);
}

export function validateRemoteContentType(received, expected) {
  const normalized = String(received || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
    .replace('image/jpg', 'image/jpeg');

  if (normalized !== expected) {
    throw new ImageSourceError('Contido remoto non é unha imaxe válida', 415);
  }

  return expected;
}

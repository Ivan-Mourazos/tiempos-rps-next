import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createImagePolicy,
  ImageSourceError,
  resolveImageSource,
  validateRemoteContentType,
} from '../app/lib/imageProxyPolicy.js';

const policy = createImagePolicy({
  IMAGE_REMOTE_ORIGINS: 'http://192.168.0.128',
  IMAGE_REMOTE_PATH_PREFIXES: '/SAT/',
  IMAGE_NETWORK_BASE: '\\\\192.168.0.128\\Sisgeko',
  IMAGE_MAX_BYTES: '1048576',
});

test('acepta foto remota dentro de origen y prefijo permitidos', () => {
  const source = resolveImageSource('http://192.168.0.128/SAT/2026/foto_1.jpg', policy);
  assert.equal(source.kind, 'remote');
  assert.equal(source.contentType, 'image/jpeg');
  assert.equal(source.url.origin, 'http://192.168.0.128');
});

test('rechaza SSRF, prefijos ajenos y formatos activos', () => {
  const invalidSources = [
    'http://127.0.0.1/SAT/foto.jpg',
    'http://192.168.0.128/OTRO/foto.jpg',
    'http://192.168.0.128/SAT/foto.svg',
    'http://192.168.0.128/SAT/%252e%252e/segredo.jpg',
    'file:///C:/Windows/win.ini',
  ];

  for (const source of invalidSources) {
    assert.throws(() => resolveImageSource(source, policy), ImageSourceError);
  }
});

test('confina rutas locales al recurso compartido', () => {
  const source = resolveImageSource('2026\\07\\foto_1.png', policy);
  assert.equal(source.kind, 'local');
  assert.equal(source.path, '\\\\192.168.0.128\\Sisgeko\\2026\\07\\foto_1.png');
  assert.equal(source.contentType, 'image/png');

  assert.throws(
    () => resolveImageSource('..\\..\\Windows\\win.ini', policy),
    ImageSourceError
  );
  assert.throws(
    () => resolveImageSource('C:\\Windows\\foto.jpg', policy),
    ImageSourceError
  );
});

test('valida tipo MIME remoto contra extensión', () => {
  assert.equal(validateRemoteContentType('image/jpeg; charset=binary', 'image/jpeg'), 'image/jpeg');
  assert.throws(
    () => validateRemoteContentType('text/html', 'image/jpeg'),
    ImageSourceError
  );
});

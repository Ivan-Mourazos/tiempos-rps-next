import fs from 'node:fs/promises';
import { NextResponse } from 'next/server';
import {
  createImagePolicy,
  ImageSourceError,
  resolveImageSource,
  validateRemoteContentType,
} from '../../lib/imageProxyPolicy';

const policy = createImagePolicy();

const IMAGE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, max-age=3600, no-transform',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
};

async function readLimitedResponse(response, maxBytes) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ImageSourceError('Imaxe demasiado grande', 413);
  }

  if (!response.body) {
    throw new ImageSourceError('Resposta de imaxe baleira', 502);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ImageSourceError('Imaxe demasiado grande', 413);
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

async function loadRemoteImage(source) {
  const response = await fetch(source.url, {
    headers: { Accept: source.contentType },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new ImageSourceError('Imaxe remota non dispoñible', 404);
  }

  validateRemoteContentType(response.headers.get('content-type'), source.contentType);
  return readLimitedResponse(response, policy.maxBytes);
}

async function loadLocalImage(source) {
  const stats = await fs.stat(source.path);
  if (!stats.isFile()) {
    throw new ImageSourceError('Imaxe non atopada', 404);
  }
  if (stats.size > policy.maxBytes) {
    throw new ImageSourceError('Imaxe demasiado grande', 413);
  }

  const buffer = await fs.readFile(source.path);
  if (buffer.byteLength > policy.maxBytes) {
    throw new ImageSourceError('Imaxe demasiado grande', 413);
  }
  return buffer;
}

function errorResponse(error) {
  const status = error instanceof ImageSourceError ? error.status : 404;
  const message = error instanceof ImageSourceError ? error.message : 'Imaxe non atopada';
  return new NextResponse(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(request) {
  const rawPath = request.nextUrl.searchParams.get('path');

  try {
    const source = resolveImageSource(rawPath, policy);
    const buffer = source.kind === 'remote'
      ? await loadRemoteImage(source)
      : await loadLocalImage(source);

    return new NextResponse(buffer, {
      headers: {
        ...IMAGE_RESPONSE_HEADERS,
        'Content-Type': source.contentType,
      },
    });
  } catch (error) {
    if (!(error instanceof ImageSourceError)) {
      console.error('Erro cargando imaxe:', error?.code || error?.name || 'UNKNOWN');
    }
    return errorResponse(error);
  }
}

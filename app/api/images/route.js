import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return new NextResponse('Missing path', { status: 400 });
  }

  // Base de red confirmada
  const networkBase = '\\\\192.168.0.128\\Sisgeko';
  
  let cleanPath = rawPath;
  if (rawPath.startsWith('http')) {
    try {
      const url = new URL(rawPath);
      cleanPath = url.pathname; 
    } catch (e) {}
  }

  // Normalizamos el path para Windows
  let safePath = cleanPath.replace(/\//g, '\\');
  if (safePath.startsWith('\\')) {
    safePath = safePath.substring(1);
  }

  const fullPath = path.join(networkBase, safePath);
  
  console.log(`[Proxy] Solicitando: ${rawPath} -> Final: ${fullPath}`);

  try {
    const fileBuffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'image/jpeg';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error(`[Proxy Error] ENOENT: ${fullPath}`);
    return new NextResponse('Image not found', { status: 404 });
  }
}

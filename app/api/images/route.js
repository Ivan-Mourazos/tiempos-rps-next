import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return new NextResponse('Missing path', { status: 400 });
  }

  if (rawPath.startsWith('http')) {
    try {
      // Proxy fetching HTTP image
      const response = await fetch(rawPath);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (e) {
      console.error(`[Proxy Fetch Error] ${rawPath}:`, e.message);
      return new NextResponse('Image fetch failed', { status: 404 });
    }
  }

  // Fallback a Base de red confirmada para rutas relativas
  const networkBase = '\\\\192.168.0.128\\Sisgeko';
  
  // Normalizamos el path para Windows
  let safePath = rawPath.replace(/\//g, '\\');
  if (safePath.startsWith('\\')) safePath = safePath.substring(1);

  const fullPath = path.join(networkBase, safePath);
  
  // Serving local network image

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

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function generateFallbackSvg(title: string, category: string): string {
  const initials = (title || 'SKU')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const catColor = 
    category === 'beauty' ? '#FFD4E5' :
    category === 'fragrances' ? '#E3D7FF' :
    category === 'furniture' ? '#FFE8C2' :
    category === 'groceries' ? '#D4F7E6' : '#EFECE3';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="${catColor}" stroke="#000000" stroke-width="2"/>
    <text x="50%" y="54%" font-family="monospace, sans-serif" font-weight="800" font-size="22" fill="#0A0A0A" dominant-baseline="middle" text-anchor="middle">
      ${initials}
    </text>
  </svg>`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const title = searchParams.get('title') || 'SKU';
    const category = searchParams.get('category') || 'general';

    if (!url) {
      const svg = generateFallbackSvg(title, category);
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || 'image/webp';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch {
      // Fall through to SVG fallback on any fetch or timeout failure
    }

    const svg = generateFallbackSvg(title, category);
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err: any) {
    const svg = generateFallbackSvg('SK', 'gen');
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  }
}

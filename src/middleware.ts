import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROJECT_ID = 'moyeora-app'
const MAINTENANCE_API = `https://devops-dashboard-pi.vercel.app/api/maintenance/${PROJECT_ID}`

export async function middleware(request: NextRequest) {
  // 점검 페이지, API, 정적 파일은 체크 제외
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/maintenance') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  try {
    const response = await fetch(MAINTENANCE_API, {
      next: { revalidate: 60 }, // 1분 캐시
    })

    if (response.ok) {
      const data = await response.json()
      if (data.maintenance) {
        // 점검 모드 활성화 → 점검 페이지로 리다이렉트
        return NextResponse.redirect(new URL('/maintenance', request.url))
      }
    }
  } catch (error) {
    // API 오류 시 정상 진행 (점검 모드 무시)
    console.error('Maintenance check failed:', error)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}

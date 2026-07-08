import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('driver-tms-token')?.value
  const { pathname } = request.nextUrl

  // 公开路由
  if (pathname === '/login' || pathname.startsWith('/api/auth/') || pathname.startsWith('/api/init') || pathname.startsWith('/share/') || pathname.startsWith('/print/')) {
    return NextResponse.next()
  }

  // API路由需要检查token
  if (pathname.startsWith('/api/')) {
    // Public API: ?public=1 or share/print referer
    if (pathname.startsWith('/api/batches/') && (request.nextUrl.searchParams.get('public') === '1' || request.headers.get('referer')?.includes('/share/') || request.headers.get('referer')?.includes('/print/'))) {
      return NextResponse.next()
    }
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 页面路由未登录跳转登录
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|uploads).*)'],
}

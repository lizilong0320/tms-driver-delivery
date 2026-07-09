import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'

export async function GET() {
  try { await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) {
      return NextResponse.json(null)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, phone: true, name: true, role: true },
    })

    if (!user) {
      return NextResponse.json(null)
    }

    const result: Record<string, unknown> = { ...user }

    // 如果是司机，附加司机信息
    if (user.role === 'driver') {
      const driver = await prisma.driver.findUnique({ where: { userId: user.id } })
      if (driver) {
        result.driver = driver
      }
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(null)
  }
}

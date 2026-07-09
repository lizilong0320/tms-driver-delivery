import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try { await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const warehouses = await prisma.warehouse.findMany({ orderBy: { id: 'desc' } })
    return NextResponse.json(warehouses)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try { await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const data = await request.json()
    const warehouse = await prisma.warehouse.create({ data })
    return NextResponse.json(warehouse)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

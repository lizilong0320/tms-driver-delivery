import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try { await ensureLoaded();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const waybill = await prisma.waybill.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        warehouse: true,
        shipper: true,
        batch: { include: { driver: { include: { user: true } } } },
        signRecords: true,
        exceptionRecords: true,
      },
    })

    if (!waybill) return NextResponse.json({ error: '运单不存在' }, { status: 404 })
    return NextResponse.json(waybill)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try { await ensureLoaded();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const data = await request.json()
    const waybill = await prisma.waybill.update({
      where: { id: parseInt(params.id) },
      data,
    })

    return NextResponse.json(waybill)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try { await ensureLoaded();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    await prisma.waybill.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

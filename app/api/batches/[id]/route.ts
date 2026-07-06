import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const batch = await prisma.batch.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        driver: { include: { user: true } },
        waybills: {
          include: { warehouse: true, shipper: true, signRecords: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!batch) return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    return NextResponse.json(batch)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const data = await request.json()
    // 支持更新配送顺序
    if (data.waybillOrders) {
      for (const item of data.waybillOrders) {
        await prisma.waybill.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      }
    }

    const batch = await prisma.batch.update({
      where: { id: parseInt(params.id) },
      data: { ...data, waybillOrders: undefined },
    })

    return NextResponse.json(batch)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

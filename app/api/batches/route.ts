import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateBatchNo } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const driverId = searchParams.get('driverId')
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    const where: any = {}
    if (driverId) where.driverId = parseInt(driverId)
    if (status !== null && status !== '') where.status = parseInt(status)
    if (date) where.deliveryDate = date

    const [total, batches] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.findMany({
        where,
        include: {
          driver: { include: { user: true } },
          _count: { select: { waybills: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({ total, page, pageSize, list: batches })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { driverId, waybillIds, deliveryDate } = await request.json()

    if (!driverId || !waybillIds?.length || !deliveryDate) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // 创建批次
    const batch = await prisma.batch.create({
      data: {
        batchNo: generateBatchNo(),
        driverId,
        deliveryDate,
        totalCount: waybillIds.length,
      },
    })

    // 将运单分配给该批次
    await prisma.waybill.updateMany({
      where: { id: { in: waybillIds }, status: 0 },
      data: { batchId: batch.id, status: 1 },
    })

    const updated = await prisma.batch.findUnique({
      where: { id: batch.id },
      include: {
        driver: { include: { user: true } },
        waybills: {
          include: { warehouse: true, shipper: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

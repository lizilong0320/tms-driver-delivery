import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateWaybillNo } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status')
    const keyword = searchParams.get('keyword')
    const shipperId = searchParams.get('shipperId')
    const tempLayer = searchParams.get('temperatureLayer')

    const where: any = {}
    if (status !== null && status !== '') where.status = parseInt(status)
    if (shipperId) where.shipperId = parseInt(shipperId)
    if (tempLayer) where.temperatureLayer = tempLayer
    if (keyword) {
      where.OR = [
        { waybillNo: { contains: keyword } },
        { receiverName: { contains: keyword } },
        { receiverPhone: { contains: keyword } },
      ]
    }

    const [total, waybills] = await Promise.all([
      prisma.waybill.count({ where }),
      prisma.waybill.findMany({
        where,
        include: {
          warehouse: true,
          shipper: true,
          batch: { include: { driver: { include: { user: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({ total, page, pageSize, list: waybills })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const data = await request.json()
    const waybillNo = (data.waybillNo && String(data.waybillNo).trim()) || generateWaybillNo()

    const waybill = await prisma.waybill.create({
      data: { ...data, waybillNo, status: data.status ?? 0 },
      include: { warehouse: true, shipper: true },
    })

    return NextResponse.json(waybill)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

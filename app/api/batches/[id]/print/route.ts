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
          orderBy: { sortOrder: 'asc' },
          include: { warehouse: true, shipper: true },
        },
      },
    })

    if (!batch) return NextResponse.json({ error: '批次不存在' }, { status: 404 })

    // 统计各温层
    const tempCount: Record<string, number> = {}
    let totalWeight = 0
    let totalPackages = 0
    batch.waybills.forEach((wb) => {
      tempCount[wb.temperatureLayer] = (tempCount[wb.temperatureLayer] || 0) + 1
      totalWeight += wb.weight
      totalPackages += wb.packageCount
    })

    return NextResponse.json({
      batch,
      tempCount,
      totalWeight: Math.round(totalWeight * 10) / 10,
      totalPackages,
    })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

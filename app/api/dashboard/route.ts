import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 统计看板数据
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalToday, finishedToday, inProgress, exceptionToday] = await Promise.all([
      prisma.waybill.count({ where: { createdAt: { gte: today } } }),
      prisma.waybill.count({ where: { status: 3, updatedAt: { gte: today } } }),
      prisma.waybill.count({ where: { status: 2 } }),
      prisma.waybill.count({ where: { status: 4 } }),
    ])

    // 近7日趋势
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const recentWaybills = await prisma.waybill.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { status: true, createdAt: true },
    })

    const dayMap: Record<string, { total: number; finished: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      dayMap[key] = { total: 0, finished: 0 }
    }

    recentWaybills.forEach((wb) => {
      const d = new Date(wb.createdAt)
      const key = `${d.getMonth() + 1}/${d.getDate()}`
      if (dayMap[key]) {
        dayMap[key].total++
        if (wb.status === 3) dayMap[key].finished++
      }
    })

    const trend = Object.entries(dayMap).map(([date, data]) => ({
      date,
      total: data.total,
      finished: data.finished,
    }))

    // 司机排行榜
    const drivers = await prisma.driver.findMany({
      include: {
        user: { select: { name: true } },
        batches: {
          where: { updatedAt: { gte: today } },
          select: { finishedCount: true },
        },
      },
      where: { status: 1 },
    })

    const driverRank = drivers
      .map((d) => ({
        name: d.user.name,
        plateNo: d.plateNo,
        count: d.batches.reduce((sum, b) => sum + b.finishedCount, 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 温层统计
    const tempStats = await prisma.waybill.groupBy({
      by: ['temperatureLayer'],
      _count: true,
    })

    return NextResponse.json({
      totalToday,
      finishedToday,
      inProgress,
      exceptionToday,
      trend,
      driverRank,
      tempStats,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

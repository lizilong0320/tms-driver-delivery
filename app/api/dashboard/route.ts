import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 统计今日数据
    const [total, completed, active, exception] = await Promise.all([
      prisma.waybill.count(),
      prisma.waybill.count({ where: { status: 3 } }),
      prisma.waybill.count({ where: { status: 2 } }),
      prisma.waybill.count({ where: { status: 4 } }),
    ])

    // 司机排行
    const drivers = await prisma.driver.findMany();
    const tms_db = (globalThis as any).__tms_db || { users: [] };
    const driverRank = drivers
      .filter((d: any) => tms_db.users.find((u: any) => u.id === d.userId)?.role === 'driver')
      .map((d: any) => {
        const user = tms_db.users.find((u: any) => u.id === d.userId);
        const batches = d.batches || [];
        const wbs = batches.flatMap((b: any) => b.waybills || []);
        const count = wbs.filter((w: any) => w.status === 3).length;
        return { name: user?.name || '司机', plateNo: d.plateNo || '', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 温层统计
    const allWbs = await prisma.waybill.findMany();
    const tempMap: Record<string, number> = {};
    allWbs.forEach((w: any) => {
      tempMap[w.temperatureLayer] = (tempMap[w.temperatureLayer] || 0) + 1;
    });
    const tempStats = Object.entries(tempMap).map(([temperatureLayer, _count]) => ({ temperatureLayer, _count }));

    // 7天趋势
    const trend: { date: string; total: number; finished: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      trend.push({ date: key, total: 0, finished: 0 });
    }

    return NextResponse.json({
      totalToday: total,
      finishedToday: completed,
      inProgress: active,
      exceptionToday: exception,
      trend,
      driverRank,
      tempStats,
    });
  } catch (e) {
    console.error('Dashboard error:', e);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

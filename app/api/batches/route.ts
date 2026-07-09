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

    // For driver role, find their driver ID first
    let queryDriverId = driverId ? parseInt(driverId) : undefined
    if (!queryDriverId && session.role === 'driver') {
      const d = await prisma.driver.findUnique({ where: { userId: session.id } })
      if (d) queryDriverId = d.id
    }
    if (queryDriverId) where.driverId = queryDriverId

    const batches = await prisma.batch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Add waybill count and driver name/phone to each batch
    const tms_db = (globalThis as any).__tms_db || { drivers: [], waybills: [], users: [] };
    const enriched = batches.map((b: any) => {
      const driver = tms_db.drivers.find((d: any) => d.id === b.driverId);
      const driverUser = driver ? tms_db.users.find((u: any) => u.id === driver.userId) : null;
      return {
        ...b,
        waybillCount: tms_db.waybills.filter((w: any) => w.batchId === b.id).length,
        driver: driver ? { ...driver, name: driverUser?.name || '', phone: driverUser?.phone || '' } : null,
        driverName: driverUser?.name || '未分配',
        driverPhone: driverUser?.phone || '',
        plateNo: driver?.plateNo || '',
      };
    })

    return NextResponse.json({ total: batches.length, page, pageSize, list: enriched })
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

    // Find driver info
    const driver = await prisma.driver.findUnique({ where: { id: driverId } })
    if (!driver) return NextResponse.json({ error: '司机不存在' }, { status: 404 })
    const tms_db = (globalThis as any).__tms_db || { users: [], waybills: [] };
    const driverUser = tms_db.users.find((u: any) => u.id === driver.userId)

    // Create batch with driver info
    const batch = await prisma.batch.create({
      data: {
        batchNo: generateBatchNo(),
        driverId,
        driverName: driverUser?.name || '未知',
        driverPhone: driverUser?.phone || '',
        plateNo: driver.plateNo || '',
        deliveryDate: new Date(deliveryDate),
        totalOrders: waybillIds.length,
        status: 0,
      },
    })

    // Assign waybills to batch
    await prisma.waybill.updateMany({
      where: { id: { in: waybillIds }, status: 0 },
      data: { batchId: batch.id, status: 1 },
    })

    // Update batch stats
    const wbs = tms_db.waybills.filter((w: any) => w.batchId === batch.id)
    const tw = wbs.reduce((s: number, w: any) => s + w.weight, 0)
    const tp = wbs.reduce((s: number, w: any) => s + w.packageCount, 0)
    await prisma.batch.update({
      where: { id: batch.id },
      data: { totalOrders: wbs.length, totalWeight: tw, totalPackages: tp },
    })

    const updated = await prisma.batch.findUnique({ where: { id: batch.id } })
    return NextResponse.json(updated)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
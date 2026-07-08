import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = parseInt(status)

    const drivers = await prisma.driver.findMany({
      where,
      orderBy: { id: 'desc' },
    })

    // Flatten: add name/phone from user relation
    const flat = drivers.map((d: any) => ({
      ...d,
      name: d.user?.name || '未知',
      phone: d.user?.phone || '',
    }))

    return NextResponse.json(flat)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const data = await request.json()
    const pwd = await bcrypt.hash(data.password || '123456', 10)

    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        password: pwd,
        role: 'driver',
      },
    })

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        plateNo: data.plateNo,
        vehicleType: data.vehicleType,
        idCard: data.idCard,
      },
      include: { user: { select: { id: true, phone: true, name: true } } },
    })

    return NextResponse.json(driver)
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: '手机号已存在' }, { status: 400 })
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

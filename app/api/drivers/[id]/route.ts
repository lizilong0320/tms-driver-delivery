import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma, ensureLoaded } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try { await ensureLoaded();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const driver = await prisma.driver.findUnique({
      where: { id: parseInt(params.id) },
      include: { user: { select: { id: true, phone: true, name: true, status: true } } },
    })

    if (!driver) return NextResponse.json({ error: '司机不存在' }, { status: 404 })
    return NextResponse.json(driver)
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
    const driver = await prisma.driver.findUnique({ where: { id: parseInt(params.id) } })

    if (!driver) return NextResponse.json({ error: '司机不存在' }, { status: 404 })

    // 更新用户信息
    const updateUser: any = {}
    if (data.name) updateUser.name = data.name
    if (data.phone) updateUser.phone = data.phone
    if (data.password) updateUser.password = await bcrypt.hash(data.password, 10)
    if (data.userStatus !== undefined) updateUser.status = data.userStatus

    await prisma.user.update({ where: { id: driver.userId }, data: updateUser })

    // 更新司机信息
    const updateDriver: any = {}
    if (data.plateNo !== undefined) updateDriver.plateNo = data.plateNo
    if (data.vehicleType !== undefined) updateDriver.vehicleType = data.vehicleType
    if (data.idCard !== undefined) updateDriver.idCard = data.idCard
    if (data.status !== undefined) updateDriver.status = data.status

    const updated = await prisma.driver.update({
      where: { id: parseInt(params.id) },
      data: updateDriver,
      include: { user: { select: { id: true, phone: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

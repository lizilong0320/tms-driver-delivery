import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // 检查是否已有管理员
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (admin) {
      return NextResponse.json({ initialized: true, message: '系统已初始化' })
    }

    // 创建管理员
    const pwd = await bcrypt.hash('123456', 10)
    await prisma.user.create({
      data: { phone: '13800000000', name: '系统管理员', password: pwd, role: 'admin' },
    })

    // 创建示例仓库
    await prisma.warehouse.upsert({
      where: { name: '上海冷链仓' },
      update: {},
      create: { name: '上海冷链仓', address: '上海市青浦区华新镇华志路168号', city: '上海' },
    })

    // 创建示例货主
    await prisma.shipper.upsert({
      where: { name: '盒马鲜生' },
      update: {},
      create: { name: '盒马鲜生', contact: '张经理', phone: '13900000001' },
    })

    return NextResponse.json({ initialized: true, message: '初始化完成', adminAccount: '13800000000 / 123456' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '初始化失败' }, { status: 500 })
  }
}

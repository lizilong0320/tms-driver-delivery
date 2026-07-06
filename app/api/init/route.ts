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

    const pwd = await bcrypt.hash('123456', 10)

    // 创建管理员
    await prisma.user.create({
      data: { phone: '13800000000', name: '系统管理员', password: pwd, role: 'admin' },
    })

    // 创建示例仓库
    const wh1 = await prisma.warehouse.upsert({
      where: { name: '上海冷链仓' },
      update: {},
      create: { name: '上海冷链仓', address: '上海市青浦区华新镇华志路168号', city: '上海' },
    })

    await prisma.warehouse.upsert({
      where: { name: '杭州冷链仓' },
      update: {},
      create: { name: '杭州冷链仓', address: '杭州市余杭区仓前街道文一西路1000号', city: '杭州' },
    })

    // 创建示例货主
    const shipper1 = await prisma.shipper.upsert({
      where: { name: '盒马鲜生' },
      update: {},
      create: { name: '盒马鲜生', contact: '张经理', phone: '13900000001', address: '上海市浦东新区' },
    })

    await prisma.shipper.upsert({
      where: { name: '每日优鲜' },
      update: {},
      create: { name: '每日优鲜', contact: '李经理', phone: '13900000002', address: '上海市闵行区' },
    })

    // 创建司机账号
    const drivers = [
      { phone: '13900010001', name: '王师傅', plateNo: '沪A12345', vehicleType: '4.2米冷藏车' },
      { phone: '13900010002', name: '刘师傅', plateNo: '沪B67890', vehicleType: '3.8米冷藏车' },
    ]

    const driverIds: number[] = []
    for (const d of drivers) {
      const user = await prisma.user.upsert({
        where: { phone: d.phone },
        update: {},
        create: { phone: d.phone, name: d.name, password: pwd, role: 'driver' },
      })
      const driver = await prisma.driver.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, plateNo: d.plateNo, vehicleType: d.vehicleType },
      })
      driverIds.push(driver.id)
    }

    // 创建示例运单
    const sampleWaybills = [
      { receiverName: '赵先生', receiverPhone: '13800000001', receiverAddress: '上海市浦东新区张江高科技园区碧波路690号', temperatureLayer: '冷藏', weight: 5.2, itemType: '生鲜水果', packageCount: 2 },
      { receiverName: '钱女士', receiverPhone: '13800000002', receiverAddress: '上海市徐汇区漕溪北路396号汇智大厦', temperatureLayer: '常温', weight: 3.0, itemType: '乳制品', packageCount: 1 },
      { receiverName: '孙先生', receiverPhone: '13800000003', receiverAddress: '上海市杨浦区五角场街道淞沪路77号万达广场', temperatureLayer: '冷冻', weight: 8.5, itemType: '冷冻海鲜', packageCount: 3 },
      { receiverName: '李女士', receiverPhone: '13800000004', receiverAddress: '上海市静安区南京西路1266号恒隆广场', temperatureLayer: '冷藏', weight: 2.8, itemType: '乳制品', packageCount: 1 },
      { receiverName: '周先生', receiverPhone: '13800000005', receiverAddress: '上海市闵行区虹桥镇吴中路1819号万象城', temperatureLayer: '常温', weight: 12.0, itemType: '粮油副食', packageCount: 4 },
      { receiverName: '吴女士', receiverPhone: '13800000006', receiverAddress: '上海市黄浦区人民广场西藏中路268号来福士', temperatureLayer: '冷藏', weight: 6.5, itemType: '生鲜蔬菜', packageCount: 2 },
      { receiverName: '郑先生', receiverPhone: '13800000007', receiverAddress: '上海市长宁区天山路762号虹桥天都', temperatureLayer: '冷冻', weight: 15.0, itemType: '冷冻肉类', packageCount: 5 },
      { receiverName: '王女士', receiverPhone: '13800000008', receiverAddress: '上海市普陀区大渡河路168号近铁城市广场', temperatureLayer: '常温', weight: 4.2, itemType: '零食饮料', packageCount: 2 },
    ]

    const existingCount = await prisma.waybill.count()
    if (existingCount === 0) {
      for (let i = 0; i < sampleWaybills.length; i++) {
        const wb = sampleWaybills[i]
        await prisma.waybill.create({
          data: {
            waybillNo: `ZT20240706${String(i + 1).padStart(4, '0')}`,
            warehouseId: wh1.id,
            shipperId: shipper1.id,
            ...wb,
            receiverLng: 121.47 + Math.random() * 0.1,
            receiverLat: 31.23 + Math.random() * 0.1,
          },
        })
      }
    }

    return NextResponse.json({
      initialized: true,
      message: '初始化完成',
      adminAccount: '13800000000 / 123456',
      driverAccounts: ['13900010001 / 123456', '13900010002 / 123456'],
      sampleData: `${sampleWaybills.length}条示例运单`,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '初始化失败' }, { status: 500 })
  }
}

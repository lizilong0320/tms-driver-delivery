import { NextResponse } from 'next/server'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  try { await ensureLoaded(); await refreshFromDB();
    const pwd = await bcrypt.hash('123456', 10)
    const results: string[] = []

    // 创建司机1
    const u1 = await prisma.user.upsert({
      where: { phone: '13900010001' },
      update: {},
      create: { phone: '13900010001', name: '王师傅', password: pwd, role: 'driver' },
    })
    const d1 = await prisma.driver.upsert({
      where: { userId: u1.id },
      update: {},
      create: { userId: u1.id, plateNo: '沪A12345', vehicleType: '4.2米冷藏车' },
    })
    results.push(`司机1: ${u1.name} (${u1.phone})`)

    // 创建司机2
    const u2 = await prisma.user.upsert({
      where: { phone: '13900010002' },
      update: {},
      create: { phone: '13900010002', name: '刘师傅', password: pwd, role: 'driver' },
    })
    const d2 = await prisma.driver.upsert({
      where: { userId: u2.id },
      update: {},
      create: { userId: u2.id, plateNo: '沪B67890', vehicleType: '3.8米冷藏车' },
    })
    results.push(`司机2: ${u2.name} (${u2.phone})`)

    // 创建示例运单
    const warehouse = await prisma.warehouse.findFirst()
    const shipper = await prisma.shipper.findFirst()

    if (warehouse && shipper) {
      const existingCount = await prisma.waybill.count()
      if (existingCount === 0) {
        const waybills = [
          { waybillNo: 'ZT202407060001', receiverName: '赵先生', receiverPhone: '13800000001', receiverAddress: '上海市浦东新区张江高科技园区碧波路690号', temperatureLayer: '冷藏', weight: 5.2, itemType: '生鲜水果', packageCount: 2 },
          { waybillNo: 'ZT202407060002', receiverName: '钱女士', receiverPhone: '13800000002', receiverAddress: '上海市徐汇区漕溪北路396号汇智大厦', temperatureLayer: '常温', weight: 3.0, itemType: '乳制品', packageCount: 1 },
          { waybillNo: 'ZT202407060003', receiverName: '孙先生', receiverPhone: '13800000003', receiverAddress: '上海市杨浦区五角场街道淞沪路77号万达广场', temperatureLayer: '冷冻', weight: 8.5, itemType: '冷冻海鲜', packageCount: 3 },
          { waybillNo: 'ZT202407060004', receiverName: '李女士', receiverPhone: '13800000004', receiverAddress: '上海市静安区南京西路1266号恒隆广场', temperatureLayer: '冷藏', weight: 2.8, itemType: '乳制品', packageCount: 1 },
          { waybillNo: 'ZT202407060005', receiverName: '周先生', receiverPhone: '13800000005', receiverAddress: '上海市闵行区虹桥镇吴中路1819号万象城', temperatureLayer: '常温', weight: 12.0, itemType: '粮油副食', packageCount: 4 },
          { waybillNo: 'ZT202407060006', receiverName: '吴女士', receiverPhone: '13800000006', receiverAddress: '上海市黄浦区人民广场西藏中路268号来福士', temperatureLayer: '冷藏', weight: 6.5, itemType: '生鲜蔬菜', packageCount: 2 },
          { waybillNo: 'ZT202407060007', receiverName: '郑先生', receiverPhone: '13800000007', receiverAddress: '上海市长宁区天山路762号虹桥天都', temperatureLayer: '冷冻', weight: 15.0, itemType: '冷冻肉类', packageCount: 5 },
          { waybillNo: 'ZT202407060008', receiverName: '王女士', receiverPhone: '13800000008', receiverAddress: '上海市普陀区大渡河路168号近铁城市广场', temperatureLayer: '常温', weight: 4.2, itemType: '零食饮料', packageCount: 2 },
        ]
        for (const wb of waybills) {
          await prisma.waybill.create({
            data: {
              ...wb,
              warehouseId: warehouse.id,
              shipperId: shipper.id,
              receiverLng: 121.47 + Math.random() * 0.1,
              receiverLat: 31.23 + Math.random() * 0.1,
            },
          })
        }
        results.push(`创建了 ${waybills.length} 条示例运单`)
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '执行失败' }, { status: 500 })
  }
}

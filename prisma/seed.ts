const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 创建管理员
  const adminPwd = await bcrypt.hash('123456', 10)
  const admin = await prisma.user.upsert({
    where: { phone: '13800000000' },
    update: {},
    create: {
      phone: '13800000000',
      name: '系统管理员',
      password: adminPwd,
      role: 'admin',
    },
  })
  console.log('Admin created:', admin.name)

  // 创建示例仓库
  const warehouses = [
    { name: '上海冷链仓', address: '上海市青浦区华新镇华志路168号', city: '上海' },
    { name: '杭州冷链仓', address: '杭州市余杭区仓前街道文一西路1000号', city: '杭州' },
  ]
  for (const w of warehouses) {
    await prisma.warehouse.upsert({
      where: { name: w.name },
      update: {},
      create: w,
    })
  }
  console.log('Warehouses created')

  // 创建示例货主
  const shippers = [
    { name: '盒马鲜生', contact: '张经理', phone: '13900000001', address: '上海市浦东新区' },
    { name: '每日优鲜', contact: '李经理', phone: '13900000002', address: '上海市闵行区' },
  ]
  for (const s of shippers) {
    await prisma.shipper.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    })
  }
  console.log('Shippers created')

  // 创建示例司机
  const driverPwd = await bcrypt.hash('123456', 10)
  const drivers = [
    { phone: '13900010001', name: '王师傅', plateNo: '沪A12345', vehicleType: '4.2米冷藏车' },
    { phone: '13900010002', name: '刘师傅', plateNo: '沪B67890', vehicleType: '3.8米冷藏车' },
  ]
  for (const d of drivers) {
    const user = await prisma.user.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        phone: d.phone,
        name: d.name,
        password: driverPwd,
        role: 'driver',
      },
    })
    await prisma.driver.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        plateNo: d.plateNo,
        vehicleType: d.vehicleType,
      },
    })
  }
  console.log('Drivers created')

  // 创建示例运单
  const warehouse1 = await prisma.warehouse.findFirst({ where: { name: '上海冷链仓' } })
  const shipper1 = await prisma.shipper.findFirst({ where: { name: '盒马鲜生' } })

  if (warehouse1 && shipper1) {
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

    for (const wb of sampleWaybills) {
      const waybillNo = `ZT20240706${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      await prisma.waybill.create({
        data: {
          waybillNo,
          warehouseId: warehouse1.id,
          shipperId: shipper1.id,
          ...wb,
          receiverLng: 121.47 + Math.random() * 0.1,
          receiverLat: 31.23 + Math.random() * 0.1,
        },
      })
    }
  }
  console.log('Sample waybills created')
  console.log('Seed completed!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

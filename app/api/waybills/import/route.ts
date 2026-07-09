import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateWaybillNo } from '@/lib/utils'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try { await ensureLoaded();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: '请上传文件' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet) as any[]

    const warehouse = await prisma.warehouse.findFirst()
    if (!warehouse) return NextResponse.json({ error: '请先创建仓库' }, { status: 400 })

    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try { await ensureLoaded();
        const shipper = row['货主']
          ? await prisma.shipper.upsert({
              where: { name: row['货主'] },
              update: {},
              create: { name: row['货主'] },
            })
          : await prisma.shipper.findFirst()

        const waybillNo = generateWaybillNo()
        await prisma.waybill.create({
          data: {
            waybillNo,
            warehouseId: warehouse.id,
            shipperId: shipper?.id || 1,
            receiverName: row['收件人'] || '',
            receiverPhone: String(row['收件电话'] || ''),
            receiverAddress: row['收件地址'] || '',
            temperatureLayer: row['温层'] || '常温',
            weight: parseFloat(row['重量(kg)']) || 0,
            itemType: row['物品类型'] || '',
            packageCount: parseInt(row['件数']) || 1,
            remark: row['备注'] || '',
          },
        })
        imported++
      } catch (e) {
        errors.push(`第${i + 2}行导入失败: ${e}`)
      }
    }

    return NextResponse.json({ imported, errors })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '导入失败' }, { status: 500 })
  }
}

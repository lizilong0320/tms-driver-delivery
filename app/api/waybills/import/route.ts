import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateWaybillNo } from '@/lib/utils'
import * as XLSX from 'xlsx'

const VALID_TEMP_LAYERS = ['常温', '冷藏', '冷冻']

interface ParsedRow {
  index: number
  waybillNo: string
  warehouseName: string
  shipperName: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  temperatureLayer: string
  itemType: string
  weight: number
  packageCount: number
  remark: string
  errors: string[]
}

export async function POST(request: NextRequest) {
  try {
    await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const confirm = formData.get('confirm') === 'true'

    if (!file) return NextResponse.json({ error: '请上传文件' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet) as any[]

    if (!rows.length) return NextResponse.json({ error: '文件为空或格式不正确' }, { status: 400 })

    // Parse rows
    const parsed: ParsedRow[] = rows.map((row: any, i: number) => {
      const receiverPhone = String(row['收件人电话'] || row['收件电话'] || '').trim()
      const temperatureLayer = String(row['温层'] || '常温').trim()
      const weight = parseFloat(row['重量(kg)'] || row['重量'] || '0')
      const packageCount = parseInt(row['件数'] || '1')

      const errors: string[] = []
      if (!row['收件人']?.toString().trim()) errors.push('收件人不能为空')
      if (!receiverPhone) errors.push('收件人电话不能为空')
      if (!row['送货地址']?.toString().trim()) errors.push('送货地址不能为空')
      if (isNaN(weight) || weight < 0) errors.push('重量格式不正确')
      if (isNaN(packageCount) || packageCount < 1) errors.push('件数格式不正确')
      if (temperatureLayer && !VALID_TEMP_LAYERS.includes(temperatureLayer)) {
        errors.push(`温层"${temperatureLayer}"不在可选范围内(${VALID_TEMP_LAYERS.join('/')})`)
      }

      return {
        index: i,
        waybillNo: String(row['运单号'] || '').trim(),
        warehouseName: String(row['仓库'] || '').trim(),
        shipperName: String(row['货主'] || '').trim(),
        receiverName: String(row['收件人'] || '').trim(),
        receiverPhone,
        receiverAddress: String(row['送货地址'] || '').trim(),
        temperatureLayer,
        itemType: String(row['物品类型'] || '').trim(),
        weight: isNaN(weight) ? 0 : weight,
        packageCount: isNaN(packageCount) ? 0 : packageCount,
        remark: String(row['备注'] || '').trim(),
        errors,
      }
    })

    const allErrors = parsed
      .filter((r) => r.errors.length > 0)
      .map((r) => ({ row: r.index + 2, messages: r.errors }))

    // Step 1: Preview mode — return parsed data without writing
    if (!confirm) {
      return NextResponse.json({
        step: 'preview',
        total: rows.length,
        errorCount: allErrors.length,
        rows: parsed.map((r) => ({
          index: r.index,
          waybillNo: r.waybillNo,
          receiverName: r.receiverName,
          receiverPhone: r.receiverPhone,
          receiverAddress: r.receiverAddress,
          temperatureLayer: r.temperatureLayer,
          weight: r.weight,
          packageCount: r.packageCount,
          itemType: r.itemType,
          hasError: r.errors.length > 0,
        })),
        errors: allErrors,
      })
    }

    // Step 2: Confirm — actually import valid rows
    const selectedIndexes = formData.get('selected')
    let selectedSet: Set<number> | null = null
    if (selectedIndexes && typeof selectedIndexes === 'string') {
      try {
        selectedSet = new Set(JSON.parse(selectedIndexes))
      } catch { /* ignore parse errors */ }
    }

    // Filter to valid rows (and optionally selected)
    const toImport = parsed.filter((r) => {
      if (r.errors.length > 0) return false
      if (selectedSet && !selectedSet.has(r.index)) return false
      return true
    })

    if (!toImport.length) {
      return NextResponse.json({ error: '没有可导入的有效数据' }, { status: 400 })
    }

    // Resolve warehouse — use first warehouse if name not matched
    const warehouses = await prisma.warehouse.findMany()
    const defaultWarehouse = warehouses[0]
    if (!defaultWarehouse) return NextResponse.json({ error: '请先创建仓库' }, { status: 400 })

    let imported = 0
    const importErrors: string[] = []

    for (const row of toImport) {
      try {
        await ensureLoaded(); await refreshFromDB();

        // Resolve warehouse by name
        const wh = row.warehouseName
          ? warehouses.find((w: any) => w.name === row.warehouseName)
          : null
        const warehouseId = wh?.id || defaultWarehouse.id

        // Resolve or create shipper by name
        let shipperId = 1
        if (row.shipperName) {
          const existing = await prisma.shipper.findUnique({ where: { name: row.shipperName } })
          if (existing) {
            shipperId = existing.id
          } else {
            const created = await prisma.shipper.create({ data: { name: row.shipperName } })
            shipperId = created.id
          }
        }

        const waybillNo = row.waybillNo || generateWaybillNo()

        await prisma.waybill.create({
          data: {
            waybillNo,
            warehouseId,
            shipperId,
            receiverName: row.receiverName,
            receiverPhone: row.receiverPhone,
            receiverAddress: row.receiverAddress,
            temperatureLayer: row.temperatureLayer || '常温',
            weight: row.weight,
            itemType: row.itemType,
            packageCount: row.packageCount,
            remark: row.remark,
            status: 0,
          },
        })
        imported++
      } catch (e: any) {
        importErrors.push(`第${row.index + 2}行导入失败: ${e?.message || e}`)
      }
    }

    return NextResponse.json({
      step: 'done',
      imported,
      total: toImport.length,
      errors: importErrors,
    })
  } catch (e: any) {
    console.error('import error:', e)
    return NextResponse.json({ error: e?.message || '导入失败' }, { status: 500 })
  }
}

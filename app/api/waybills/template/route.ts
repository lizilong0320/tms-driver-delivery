import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const headers = [
      '运单号', '仓库', '货主', '收件人', '收件人电话',
      '送货地址', '温层', '物品类型', '重量(kg)', '件数', '备注',
    ]

    // Add a sample row to demo the format
    const sampleRow = [
      'ZT202607080001', '长沙雨花仓', '蒙牛乳业', '张三商超', '13900139001',
      '雨花区韶山南路1号', '冷藏', '乳制品', '50', '10', '示例备注',
    ]

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 20 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '运单导入模板')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent('运单导入模板')}.xlsx"`,
      },
    })
  } catch (e) {
    console.error('template error:', e)
    return NextResponse.json({ error: '生成模板失败' }, { status: 500 })
  }
}

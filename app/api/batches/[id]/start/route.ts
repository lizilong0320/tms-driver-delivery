import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const batchId = parseInt(params.id)
    if (isNaN(batchId)) return NextResponse.json({ error: '无效的批次ID' }, { status: 400 })

    // Check batch exists and is in valid state
    const batch = await prisma.batch.findUnique({ where: { id: batchId } })
    if (!batch) return NextResponse.json({ error: '批次不存在' }, { status: 404 })
    if (batch.status !== 0) return NextResponse.json({ error: '批次状态不允许开始配送' }, { status: 400 })

    await prisma.batch.update({
      where: { id: batchId },
      data: { status: 1 },
    })

    await prisma.waybill.updateMany({
      where: { batchId },
      data: { status: 2 },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('start batch error:', e)
    return NextResponse.json({ error: e?.message || '服务器错误' }, { status: 500 })
  }
}

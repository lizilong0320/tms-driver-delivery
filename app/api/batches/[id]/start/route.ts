import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try { await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const batchId = parseInt(params.id)
    await prisma.batch.update({
      where: { id: batchId },
      data: { status: 1 },
    })

    await prisma.waybill.updateMany({
      where: { batchId },
      data: { status: 2 },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

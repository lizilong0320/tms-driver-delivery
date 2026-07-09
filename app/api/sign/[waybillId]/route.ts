import { NextRequest, NextResponse } from 'next/server'
import { prisma, ensureLoaded, refreshFromDB } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { waybillId: string } }
) {
  try { await ensureLoaded(); await refreshFromDB();
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const waybillId = parseInt(params.waybillId)
    const data = await request.json()

    // 创建签收记录
    const signRecord = await prisma.signRecord.create({
      data: {
        waybillId,
        type: data.type,
        proxyName: data.proxyName,
        proxyRelation: data.proxyRelation,
        signature: data.signature,
        photos: data.photos ? JSON.stringify(data.photos) : null,
      },
    })

    // 更新运单状态为已签收
    const waybill = await prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 3 },
    })

    // 更新批次的完成数
    if (waybill.batchId) {
      const batch = await prisma.batch.findUnique({ where: { id: waybill.batchId } })
      if (batch) {
        const finishedCount = await prisma.waybill.count({
          where: { batchId: batch.id, status: 3 },
        })
        await prisma.batch.update({
          where: { id: batch.id },
          data: { finishedCount },
        })
      }
    }

    return NextResponse.json(signRecord)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

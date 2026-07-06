import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { waybillId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const waybillId = parseInt(params.waybillId)
    const data = await request.json()

    const record = await prisma.exceptionRecord.create({
      data: {
        waybillId,
        type: data.type,
        description: data.description,
        photos: data.photos ? JSON.stringify(data.photos) : null,
      },
    })

    // 更新运单状态为异常
    await prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 4 },
    })

    return NextResponse.json(record)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma, ensureLoaded } from '@/lib/prisma'
import { createToken, setSession } from '@/lib/auth'

export async function POST(request: Request) {
  try { await ensureLoaded();
    const { phone, password } = await request.json()

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 })
    }

    if (user.status === 0) {
      return NextResponse.json({ error: '账号已被禁用' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 })
    }

    const token = await createToken({ id: user.id, role: user.role })
    await setSession(token)

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
    })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

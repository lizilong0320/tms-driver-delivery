'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DriverUser {
  id: number; name: string; phone: string; role: string
  driver?: { id: number; plateNo?: string; vehicleType?: string }
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<DriverUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(u => {
      if (!u || u.role !== 'driver') router.push('/login')
      else setUser(u)
    })
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b h-14 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#07C160]" />
          <span className="font-bold text-gray-900">中通冷链配送</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{user.name}</span>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 pb-6">
        {children}
      </main>

      {/* 底部导航 */}
      <footer className="bg-white border-t h-16 flex items-center justify-center sticky bottom-0">
        <span className="text-xs text-gray-400">中通冷链 · 末端城配派送系统 v1.0</span>
      </footer>
    </div>
  )
}

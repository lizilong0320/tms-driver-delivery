'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(user => {
        if (!user) {
          router.push('/login')
        } else if (user.role === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/tasks')
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">正在跳转...</p>
    </div>
  )
}

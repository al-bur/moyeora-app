'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Calendar, Wrench } from 'lucide-react'

export default function MaintenancePage() {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12 space-y-6">
          {/* 아이콘 */}
          <div className="flex justify-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center animate-pulse">
              <Wrench className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* 메시지 */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              잠시 약속을 미뤄주세요!
            </h1>
            <p className="text-gray-600">
              더 나은 모임을 위해 시스템 점검 중이에요{dots}
            </p>
          </div>

          {/* 로딩 */}
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>

          {/* 안내 */}
          <p className="text-sm text-gray-500">
            곧 돌아올게요! 조금만 기다려주세요 🙏
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PartyPopper, Link2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')

  const handleJoin = () => {
    if (joinCode.trim()) {
      router.push(`/room/${joinCode.trim()}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-50 to-white">
      <div className="w-full max-w-sm space-y-8">
        {/* 로고 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">모여라</h1>
          <p className="text-gray-500">친구 약속, 1분이면 끝!</p>
        </div>

        {/* 메인 액션 */}
        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            onClick={() => router.push('/new')}
          >
            + 약속 만들기
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">또는</span>
            </div>
          </div>

          {/* 링크로 참여 */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Link2 className="w-4 h-4" />
                <span>약속방 코드로 참여</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="코드 입력"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  className="flex-1"
                />
                <Button variant="secondary" onClick={handleJoin}>
                  참여
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 푸터 */}
        <p className="text-center text-xs text-gray-400">
          날짜 투표 · 중간 위치 · 총무 선정<br />
          한 곳에서 끝!
        </p>
      </div>
    </div>
  )
}

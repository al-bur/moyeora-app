'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RouletteProps {
  participants: string[]
  onComplete: (winner: string) => void
}

export function Roulette({ participants, onComplete }: RouletteProps) {
  const [spinning, setSpinning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [winner, setWinner] = useState<string | null>(null)

  useEffect(() => {
    if (spinning) {
      const winnerIndex = Math.floor(Math.random() * participants.length)
      let count = 0
      const totalSpins = 20 + winnerIndex // 최소 20번 + 당첨자 위치

      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % participants.length)
        count++

        if (count >= totalSpins) {
          clearInterval(interval)
          setSpinning(false)
          setWinner(participants[winnerIndex])
          onComplete(participants[winnerIndex])
        }
      }, 100 - (count * 2)) // 점점 느려짐

      return () => clearInterval(interval)
    }
  }, [spinning, participants, onComplete])

  const startSpin = () => {
    if (participants.length < 2) return
    setWinner(null)
    setSpinning(true)
  }

  return (
    <div className="flex flex-col items-center py-6 space-y-6">
      {/* 룰렛 표시 영역 */}
      <div className="relative w-48 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={spinning ? currentIndex : (winner || 'start')}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`text-2xl font-bold text-center px-4 ${
                winner ? 'text-primary' : 'text-gray-700'
              }`}
            >
              {winner || (spinning ? participants[currentIndex] : '?')}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 포인터 */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-indigo-600" />
      </div>

      {/* 버튼 */}
      {!winner && (
        <button
          onClick={startSpin}
          disabled={spinning || participants.length < 2}
          className={`
            px-8 py-3 rounded-full font-semibold text-white
            transition-all transform
            ${spinning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95'
            }
          `}
        >
          {spinning ? '돌리는 중...' : '돌리기!'}
        </button>
      )}

      {/* 당첨자 발표 */}
      {winner && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <p className="text-gray-500">🎉 축하합니다!</p>
          <p className="text-xl font-bold text-primary mt-1">
            오늘의 총무는 {winner}님!
          </p>
        </motion.div>
      )}

      {/* 참여자 목록 */}
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {participants.map((p, i) => (
          <span
            key={i}
            className={`
              px-3 py-1 rounded-full text-sm
              ${spinning && currentIndex === i
                ? 'bg-primary text-white'
                : winner === p
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600'
              }
            `}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

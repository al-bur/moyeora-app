'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CalendarDays, X, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, addDays, startOfWeek, eachDayOfInterval, nextSaturday, nextSunday, isWeekend, addWeeks } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'

export default function NewRoomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isDragging, setIsDragging] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 날짜 토글 (탭으로 개별 선택/해제)
  const toggleDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const exists = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)

    if (exists) {
      setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr))
    } else {
      setSelectedDates([...selectedDates, date])
    }
  }

  // 범위 선택 핸들러 (드래그용)
  const handleRangeSelect = (
    range: DateRange | undefined,
    triggerDate: Date,
  ) => {
    if (!range) {
      setDateRange(undefined)
      setIsDragging(false)
      return
    }

    setDateRange(range)

    // 첫 번째 클릭 (드래그 시작)
    if (range.from && (!range.to || format(range.from, 'yyyy-MM-dd') === format(range.to, 'yyyy-MM-dd'))) {
      setIsDragging(true)
      return
    }

    // 두 번째 클릭 (드래그 완료) - 범위 추가
    if (range.from && range.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd')
      const toStr = format(range.to, 'yyyy-MM-dd')

      if (fromStr !== toStr) {
        const start = range.from < range.to ? range.from : range.to
        const end = range.from < range.to ? range.to : range.from
        const daysInRange = eachDayOfInterval({ start, end })
        const newDates = daysInRange.filter(d => d >= today)

        const existingDateStrs = new Set(selectedDates.map(d => format(d, 'yyyy-MM-dd')))
        const uniqueNewDates = newDates.filter(d => !existingDateStrs.has(format(d, 'yyyy-MM-dd')))

        if (uniqueNewDates.length > 0) {
          setSelectedDates(prev => [...prev, ...uniqueNewDates])
        }

        // 범위 초기화
        setTimeout(() => {
          setDateRange(undefined)
          setIsDragging(false)
        }, 200)
      }
    }
  }

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(selectedDates.filter(d =>
      format(d, 'yyyy-MM-dd') !== format(dateToRemove, 'yyyy-MM-dd')
    ))
  }

  // 빠른 선택 기능들 (확장)
  const quickSelectThisWeek = () => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 6)
    const days = eachDayOfInterval({ start: today, end: weekEnd })
    addQuickDates(days)
  }

  const quickSelectThisWeekend = () => {
    const sat = nextSaturday(today)
    const sun = nextSunday(today)
    const weekendDates = [sat, sun].filter(d => d >= today)
    addQuickDates(weekendDates)
  }

  const quickSelectNextWeek = () => {
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
    const nextWeekEnd = addDays(nextWeekStart, 6)
    const weekDays = eachDayOfInterval({ start: nextWeekStart, end: nextWeekEnd })
    addQuickDates(weekDays)
  }

  const quickSelectNextWeekdays = () => {
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
    const nextWeekEnd = addDays(nextWeekStart, 4) // 월~금
    const weekDays = eachDayOfInterval({ start: nextWeekStart, end: nextWeekEnd })
    addQuickDates(weekDays)
  }

  const quickSelectNextWeekend = () => {
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
    const sat = addDays(nextWeekStart, 5) // 토요일
    const sun = addDays(nextWeekStart, 6) // 일요일
    addQuickDates([sat, sun])
  }

  const quickSelectTwoWeeks = () => {
    const twoWeeksEnd = addWeeks(today, 2)
    const days = eachDayOfInterval({ start: today, end: twoWeeksEnd })
    addQuickDates(days)
  }

  const addQuickDates = (dates: Date[]) => {
    const existingDateStrs = new Set(selectedDates.map(d => format(d, 'yyyy-MM-dd')))
    const uniqueNewDates = dates.filter(d => !existingDateStrs.has(format(d, 'yyyy-MM-dd')))
    setSelectedDates([...selectedDates, ...uniqueNewDates])
  }

  const clearAllDates = () => {
    setSelectedDates([])
    setDateRange(undefined)
    setIsDragging(false)
  }

  const handleCreate = async () => {
    if (!name.trim() || selectedDates.length === 0) return

    setLoading(true)
    try {
      const candidateDates = selectedDates
        .map(d => format(d, 'yyyy-MM-dd'))
        .sort()

      const { data, error } = await supabase
        .from('moyeora_rooms')
        .insert({
          name: name.trim(),
          candidate_dates: candidateDates,
        })
        .select()
        .single()

      if (error) throw error

      localStorage.setItem(`moyeora_host_${data.id}`, data.host_token)
      router.push(`/room/${data.id}`)
    } catch (error) {
      console.error('Error creating room:', error)
      alert('약속방 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold">약속 만들기</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-5">
        {/* 약속 이름 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">약속 이름</label>
          <Input
            placeholder="예: 금요일 저녁 번개"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {/* 날짜 선택 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              후보 날짜 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 빠른 선택 버튼들 - 강화된 UI */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">빠른 선택</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectThisWeekend}
                  className="h-10 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  이번 주말
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectNextWeekdays}
                  className="h-10 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  다음주 평일
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectNextWeekend}
                  className="h-10 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  다음주 주말
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectThisWeek}
                  className="h-10 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  이번주 전체
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectNextWeek}
                  className="h-10 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  다음주 전체
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectTwoWeeks}
                  className="h-10 text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                >
                  2주간
                </Button>
              </div>
            </div>

            {/* 선택된 날짜들 */}
            {selectedDates.length > 0 && (
              <div className="space-y-2 p-3 bg-indigo-50/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-900">
                    선택된 날짜 ({selectedDates.length}개)
                  </span>
                  <button
                    onClick={clearAllDates}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date) => (
                      <button
                        key={format(date, 'yyyy-MM-dd')}
                        onClick={() => removeDate(date)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 rounded-full text-sm text-indigo-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors group"
                      >
                        {format(date, 'M/d (EEE)', { locale: ko })}
                        <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* 단일 캘린더 (탭 토글 + 드래그 범위) */}
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range, triggerDate) => {
                if (triggerDate) {
                  // 드래그 중이 아닐 때 탭은 토글로 동작
                  if (!isDragging && !range?.to) {
                    toggleDate(triggerDate)
                    return
                  }
                  handleRangeSelect(range, triggerDate)
                }
              }}
              modifiers={{
                alreadySelected: selectedDates,
              }}
              modifiersClassNames={{
                alreadySelected: 'bg-primary text-primary-foreground rounded-md',
              }}
              disabled={{ before: today }}
              className="rounded-lg border mx-auto"
            />

            {/* 힌트 텍스트 */}
            <p className="text-xs text-gray-500 text-center">
              {isDragging
                ? '종료일을 선택하세요'
                : '탭하면 선택, 두 번 탭하면 범위 선택'}
            </p>
          </CardContent>
        </Card>

        {/* 생성 버튼 */}
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          disabled={!name.trim() || selectedDates.length === 0 || loading}
          onClick={handleCreate}
        >
          {loading ? '생성 중...' : '약속방 만들기'}
        </Button>
      </main>
    </div>
  )
}

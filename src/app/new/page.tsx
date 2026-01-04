'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CalendarDays, X, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, nextSaturday, nextSunday, isWeekend } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'

export default function NewRoomPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 단일 날짜 선택
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const exists = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr)

    if (exists) {
      setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr))
    } else {
      setSelectedDates([...selectedDates, date])
    }
  }

  // 범위 선택 (react-day-picker v9 시그니처)
  const handleRangeSelect = (
    range: DateRange | undefined,
    _triggerDate: Date,
  ) => {
    console.log('Range selected:', range) // 디버깅용

    if (!range) {
      setDateRange(undefined)
      return
    }

    setDateRange(range)

    // from과 to가 모두 있고, 서로 다른 날짜일 때만 추가
    if (range.from && range.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd')
      const toStr = format(range.to, 'yyyy-MM-dd')

      // 같은 날짜면 아직 범위 선택 중 (첫 번째 클릭)
      if (fromStr === toStr) {
        return
      }

      // 범위 내 모든 날짜 가져오기
      const start = range.from < range.to ? range.from : range.to
      const end = range.from < range.to ? range.to : range.from
      const daysInRange = eachDayOfInterval({ start, end })
      const newDates = daysInRange.filter(d => d >= today)

      // 기존 선택에 추가 (중복 제거)
      const existingDateStrs = new Set(selectedDates.map(d => format(d, 'yyyy-MM-dd')))
      const uniqueNewDates = newDates.filter(d => !existingDateStrs.has(format(d, 'yyyy-MM-dd')))

      if (uniqueNewDates.length > 0) {
        setSelectedDates(prev => [...prev, ...uniqueNewDates])
      }

      // 약간의 딜레이 후 범위 초기화 (시각적 피드백을 위해)
      setTimeout(() => setDateRange(undefined), 300)
    }
  }

  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(selectedDates.filter(d =>
      format(d, 'yyyy-MM-dd') !== format(dateToRemove, 'yyyy-MM-dd')
    ))
  }

  // 빠른 선택 기능들
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

  const quickSelectWeekdaysNextWeek = () => {
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7)
    const nextWeekEnd = addDays(nextWeekStart, 4) // 월~금
    const weekDays = eachDayOfInterval({ start: nextWeekStart, end: nextWeekEnd })
    addQuickDates(weekDays)
  }

  const addQuickDates = (dates: Date[]) => {
    const existingDateStrs = new Set(selectedDates.map(d => format(d, 'yyyy-MM-dd')))
    const uniqueNewDates = dates.filter(d => !existingDateStrs.has(format(d, 'yyyy-MM-dd')))
    setSelectedDates([...selectedDates, ...uniqueNewDates])
  }

  const clearAllDates = () => {
    setSelectedDates([])
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

      // 호스트 토큰을 localStorage에 저장
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

      <main className="max-w-lg mx-auto p-4 space-y-6">
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              후보 날짜 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 빠른 선택 버튼들 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="w-4 h-4" />
                <span>빠른 선택</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectThisWeekend}
                  className="text-xs"
                >
                  이번 주말
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectWeekdaysNextWeek}
                  className="text-xs"
                >
                  다음주 평일
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={quickSelectNextWeek}
                  className="text-xs"
                >
                  다음주 전체
                </Button>
              </div>
            </div>

            {/* 선택 모드 토글 */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setSelectionMode('single')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  selectionMode === 'single'
                    ? 'bg-white shadow text-primary'
                    : 'text-gray-600'
                }`}
              >
                하나씩 선택
              </button>
              <button
                onClick={() => setSelectionMode('range')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  selectionMode === 'range'
                    ? 'bg-white shadow text-primary'
                    : 'text-gray-600'
                }`}
              >
                범위로 선택
              </button>
            </div>

            {/* 선택된 날짜들 */}
            {selectedDates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    선택된 날짜 ({selectedDates.length}개)
                  </span>
                  <button
                    onClick={clearAllDates}
                    className="text-xs text-red-500 hover:underline"
                  >
                    전체 삭제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDates
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date) => (
                      <Badge
                        key={format(date, 'yyyy-MM-dd')}
                        variant="secondary"
                        className="px-3 py-1.5 text-sm gap-1"
                      >
                        {format(date, 'M/d (EEE)', { locale: ko })}
                        <button onClick={() => removeDate(date)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {/* 캘린더 - 단일 선택 모드 */}
            {selectionMode === 'single' && (
              <Calendar
                mode="single"
                selected={undefined}
                onSelect={(date: Date | undefined) => handleDateSelect(date)}
                modifiers={{
                  alreadySelected: selectedDates,
                }}
                modifiersClassNames={{
                  alreadySelected: 'bg-primary text-primary-foreground',
                }}
                disabled={{ before: today }}
                className="rounded-md border mx-auto"
              />
            )}

            {/* 캘린더 - 범위 선택 모드 */}
            {selectionMode === 'range' && (
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range, triggerDate) => {
                  if (triggerDate) {
                    handleRangeSelect(range, triggerDate)
                  }
                }}
                modifiers={{
                  alreadySelected: selectedDates,
                }}
                modifiersClassNames={{
                  alreadySelected: 'bg-primary/50 text-primary-foreground',
                }}
                disabled={{ before: today }}
                className="rounded-md border mx-auto"
              />
            )}

            <p className="text-xs text-gray-500 text-center">
              {selectionMode === 'single'
                ? '탭해서 날짜를 선택하세요 (여러 개 선택 가능)'
                : '시작일과 종료일을 선택하면 범위가 추가됩니다'}
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

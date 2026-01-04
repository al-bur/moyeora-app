'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CalendarDays,
  MapPin,
  Users,
  Share2,
  Check,
  Loader2,
  Navigation,
  Pencil,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatDate, countVotes, calculateMidpoint } from '@/lib/utils'
import type { Room, Participant } from '@/types/database'
import { QRCodeSVG } from 'qrcode.react'
import { Roulette } from '@/components/roulette'

export default function RoomPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [showRoulette, setShowRoulette] = useState(false)
  const [copied, setCopied] = useState(false)
  const [locationMode, setLocationMode] = useState<'gps' | 'manual' | null>(null)
  const [manualLocation, setManualLocation] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [isEditingRouletteTitle, setIsEditingRouletteTitle] = useState(false)
  const [rouletteTitle, setRouletteTitle] = useState('')

  const isHost = typeof window !== 'undefined' &&
    localStorage.getItem(`moyeora_host_${roomId}`) === room?.host_token

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      const [roomRes, participantsRes] = await Promise.all([
        supabase.from('moyeora_rooms').select('*').eq('id', roomId).single(),
        supabase.from('moyeora_participants').select('*').eq('room_id', roomId),
      ])

      if (roomRes.data) setRoom(roomRes.data)
      if (participantsRes.data) setParticipants(participantsRes.data)

      // 저장된 닉네임 확인
      const savedNickname = localStorage.getItem(`moyeora_nickname_${roomId}`)
      if (savedNickname && participantsRes.data) {
        const p = participantsRes.data.find((p) => p.nickname === savedNickname)
        if (p) {
          setCurrentParticipant(p)
          setNickname(savedNickname)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    loadData()

    // Realtime 구독
    const roomChannel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moyeora_participants', filter: `room_id=eq.${roomId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moyeora_rooms', filter: `id=eq.${roomId}` },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roomChannel)
    }
  }, [roomId, loadData])

  // 닉네임 등록
  const handleJoin = async () => {
    if (!nickname.trim()) return

    try {
      const { data, error } = await supabase
        .from('moyeora_participants')
        .insert({
          room_id: roomId,
          nickname: nickname.trim(),
          voted_dates: [],
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          // 이미 존재하는 닉네임
          const existing = participants.find((p) => p.nickname === nickname.trim())
          if (existing) {
            setCurrentParticipant(existing)
            localStorage.setItem(`moyeora_nickname_${roomId}`, nickname.trim())
          }
        } else {
          throw error
        }
      } else if (data) {
        setCurrentParticipant(data)
        localStorage.setItem(`moyeora_nickname_${roomId}`, nickname.trim())
      }
    } catch (error) {
      console.error('Error joining room:', error)
    }
  }

  // 날짜 투표
  const handleVote = async (date: string) => {
    if (!currentParticipant) return

    const votedDates = currentParticipant.voted_dates.includes(date)
      ? currentParticipant.voted_dates.filter((d) => d !== date)
      : [...currentParticipant.voted_dates, date]

    try {
      await supabase
        .from('moyeora_participants')
        .update({ voted_dates: votedDates })
        .eq('id', currentParticipant.id)

      setCurrentParticipant({ ...currentParticipant, voted_dates: votedDates })
    } catch (error) {
      console.error('Error voting:', error)
    }
  }

  // GPS 위치 등록
  const handleGPSLocation = async () => {
    if (!currentParticipant) return

    if (!navigator.geolocation) {
      alert('위치 서비스를 지원하지 않는 브라우저입니다.')
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          await supabase
            .from('moyeora_participants')
            .update({
              location_lat: latitude,
              location_lng: longitude,
              location_name: '현재 위치',
            })
            .eq('id', currentParticipant.id)

          loadData()
          setLocationMode(null)
        } catch (error) {
          console.error('Error setting location:', error)
        } finally {
          setLocationLoading(false)
        }
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('위치를 가져올 수 없습니다.')
        setLocationLoading(false)
      }
    )
  }

  // 직접 입력 위치 등록 (Nominatim 지오코딩 사용)
  const handleManualLocation = async () => {
    if (!currentParticipant || !manualLocation.trim()) return

    setLocationLoading(true)
    try {
      // Nominatim API로 주소를 좌표로 변환
      const query = encodeURIComponent(manualLocation.trim() + ' 대한민국')
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        { headers: { 'Accept-Language': 'ko' } }
      )
      const results = await response.json()

      if (results.length > 0) {
        const { lat, lon, display_name } = results[0]
        await supabase
          .from('moyeora_participants')
          .update({
            location_lat: parseFloat(lat),
            location_lng: parseFloat(lon),
            location_name: manualLocation.trim(),
          })
          .eq('id', currentParticipant.id)
      } else {
        // 좌표를 찾지 못해도 이름만 저장 (중간지점 계산에서 제외됨)
        await supabase
          .from('moyeora_participants')
          .update({
            location_name: manualLocation.trim(),
          })
          .eq('id', currentParticipant.id)
        alert('정확한 좌표를 찾지 못했습니다. 중간지점 계산에서 제외될 수 있어요.')
      }

      loadData()
      setLocationMode(null)
      setManualLocation('')
    } catch (error) {
      console.error('Error setting manual location:', error)
      alert('위치 등록에 실패했습니다.')
    } finally {
      setLocationLoading(false)
    }
  }

  // 위치 삭제
  const handleClearLocation = async () => {
    if (!currentParticipant) return

    try {
      await supabase
        .from('moyeora_participants')
        .update({
          location_lat: null,
          location_lng: null,
          location_name: null,
        })
        .eq('id', currentParticipant.id)

      loadData()
    } catch (error) {
      console.error('Error clearing location:', error)
    }
  }

  // 룰렛 제목 수정
  const handleUpdateRouletteTitle = async () => {
    if (!rouletteTitle.trim()) {
      setRouletteTitle(room?.roulette_title || '누가 쏴?')
      setIsEditingRouletteTitle(false)
      return
    }

    try {
      await supabase
        .from('moyeora_rooms')
        .update({ roulette_title: rouletteTitle.trim() })
        .eq('id', roomId)

      loadData()
      setIsEditingRouletteTitle(false)
    } catch (error) {
      console.error('Error updating roulette title:', error)
    }
  }

  // 공유
  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: `모여라 - ${room?.name}`,
          text: '약속에 참여해주세요!',
          url,
        })
      } catch {
        // 공유 취소
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 총무 선정 완료
  const handleRouletteComplete = async (winner: string) => {
    try {
      await supabase
        .from('moyeora_rooms')
        .update({ treasurer: winner })
        .eq('id', roomId)

      loadData()
      setTimeout(() => setShowRoulette(false), 2000)
    } catch (error) {
      console.error('Error setting treasurer:', error)
    }
  }

  // 중간 위치 계산
  const midpoint = calculateMidpoint(
    participants
      .filter((p) => p.location_lat && p.location_lng)
      .map((p) => ({ lat: p.location_lat!, lng: p.location_lng! }))
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-gray-500">약속방을 찾을 수 없습니다</p>
          <Button onClick={() => window.location.href = '/'}>홈으로</Button>
        </div>
      </div>
    )
  }

  // 닉네임 입력 화면
  if (!currentParticipant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-50 to-white">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{room.name}</CardTitle>
            <p className="text-sm text-gray-500">닉네임을 입력해주세요</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="h-12 text-center text-lg"
            />
            <Button
              className="w-full h-12"
              disabled={!nickname.trim()}
              onClick={handleJoin}
            >
              참여하기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-semibold truncate">{room.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="w-3 h-3" />
              {participants.length}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* 날짜 투표 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              📅 언제?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {room.candidate_dates.map((date) => {
                const votes = countVotes(participants, date)
                const isVoted = currentParticipant.voted_dates.includes(date)
                const maxVotes = Math.max(...room.candidate_dates.map((d) => countVotes(participants, d)))
                const isMax = votes === maxVotes && votes > 0

                return (
                  <button
                    key={date}
                    onClick={() => handleVote(date)}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all
                      ${isVoted
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                      ${isMax ? 'ring-2 ring-primary/30' : ''}
                    `}
                  >
                    <div className="text-sm font-medium">{formatDate(date)}</div>
                    <div className={`text-2xl font-bold mt-1 ${isMax ? 'text-primary' : 'text-gray-400'}`}>
                      {votes}
                    </div>
                    {isVoted && (
                      <div className="absolute top-1 right-1">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 위치 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              📍 어디서?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 위치 등록 완료 상태 */}
            {(currentParticipant.location_lat || currentParticipant.location_name) ? (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {currentParticipant.location_name || '위치 등록됨'}
                  </span>
                </div>
                <button
                  onClick={handleClearLocation}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : locationMode === null ? (
              /* 위치 선택 모드 버튼 */
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setLocationMode('gps')}
                >
                  <Navigation className="w-4 h-4" />
                  현재 위치
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setLocationMode('manual')}
                >
                  <Pencil className="w-4 h-4" />
                  직접 입력
                </Button>
              </div>
            ) : locationMode === 'gps' ? (
              /* GPS 위치 확인 */
              <div className="space-y-3">
                <p className="text-sm text-gray-600">현재 위치를 사용하시겠습니까?</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocationMode(null)}
                    disabled={locationLoading}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleGPSLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    확인
                  </Button>
                </div>
              </div>
            ) : (
              /* 직접 입력 */
              <div className="space-y-3">
                <Input
                  placeholder="예: 강남역, 홍대입구역, 서울역..."
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLocation()}
                  className="h-12"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setLocationMode(null)
                      setManualLocation('')
                    }}
                    disabled={locationLoading}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleManualLocation}
                    disabled={!manualLocation.trim() || locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '등록'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {midpoint && (
              <div className="p-3 bg-indigo-50 rounded-lg">
                <div className="text-sm text-gray-600">중간 지점</div>
                <div className="font-medium">
                  위도: {midpoint.lat.toFixed(4)}, 경도: {midpoint.lng.toFixed(4)}
                </div>
                <a
                  href={`https://map.kakao.com/link/map/중간지점,${midpoint.lat},${midpoint.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline mt-1 inline-block"
                >
                  카카오맵에서 보기 →
                </a>
              </div>
            )}

            <div className="text-xs text-gray-500">
              {participants.filter((p) => p.location_lat).length}/{participants.length}명 위치 등록
            </div>
          </CardContent>
        </Card>

        {/* 총무 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              💰{' '}
              {isEditingRouletteTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={rouletteTitle}
                    onChange={(e) => setRouletteTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateRouletteTitle()
                      if (e.key === 'Escape') {
                        setRouletteTitle(room?.roulette_title || '누가 쏴?')
                        setIsEditingRouletteTitle(false)
                      }
                    }}
                    onBlur={handleUpdateRouletteTitle}
                    autoFocus
                    className="h-8 text-base font-semibold"
                    placeholder="제목 입력..."
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setRouletteTitle(room?.roulette_title || '누가 쏴?')
                    setIsEditingRouletteTitle(true)
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <span>{room?.roulette_title || '누가 쏴?'}</span>
                  <Pencil className="w-3 h-3 opacity-50" />
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {room.treasurer ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-500">오늘의 총무는</div>
                <div className="text-2xl font-bold text-primary mt-1">{room.treasurer}</div>
              </div>
            ) : showRoulette ? (
              <Roulette
                participants={participants.map((p) => p.nickname)}
                onComplete={handleRouletteComplete}
              />
            ) : (
              <Button
                className="w-full"
                onClick={() => setShowRoulette(true)}
                disabled={participants.length < 2}
              >
                🎰 룰렛 돌리기
              </Button>
            )}
          </CardContent>
        </Card>

        {/* QR 코드 */}
        {showQR && (
          <Card>
            <CardContent className="py-6 flex flex-col items-center">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? window.location.href : ''}
                size={200}
              />
              <p className="text-sm text-gray-500 mt-4">QR 코드로 친구 초대</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-lg mx-auto flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowQR(!showQR)}
          >
            QR 코드
          </Button>
          <Button
            className="flex-1"
            onClick={handleShare}
          >
            {copied ? '복사됨!' : '링크 공유'}
          </Button>
        </div>
      </div>
    </div>
  )
}

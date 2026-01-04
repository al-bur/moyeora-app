import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 중간 위치 계산
export function calculateMidpoint(
  locations: { lat: number; lng: number }[]
): { lat: number; lng: number } | null {
  if (locations.length === 0) return null

  const sum = locations.reduce(
    (acc, loc) => ({
      lat: acc.lat + loc.lat,
      lng: acc.lng + loc.lng,
    }),
    { lat: 0, lng: 0 }
  )

  return {
    lat: sum.lat / locations.length,
    lng: sum.lng / locations.length,
  }
}

// 날짜 포맷
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${month}/${day} (${dayOfWeek})`
}

// 투표 수 계산
export function countVotes(
  participants: { voted_dates: string[] }[],
  date: string
): number {
  return participants.filter((p) => p.voted_dates.includes(date)).length
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      moyeora_rooms: {
        Row: {
          id: string
          name: string
          candidate_dates: string[]
          confirmed_date: string | null
          confirmed_location: string | null
          treasurer: string | null
          roulette_title: string
          host_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          candidate_dates: string[]
          confirmed_date?: string | null
          confirmed_location?: string | null
          treasurer?: string | null
          roulette_title?: string
          host_token?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          candidate_dates?: string[]
          confirmed_date?: string | null
          confirmed_location?: string | null
          treasurer?: string | null
          roulette_title?: string
          host_token?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      moyeora_participants: {
        Row: {
          id: string
          room_id: string
          nickname: string
          voted_dates: string[]
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          nickname: string
          voted_dates?: string[]
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          nickname?: string
          voted_dates?: string[]
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moyeora_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "moyeora_rooms"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Room = Database['public']['Tables']['moyeora_rooms']['Row']
export type Participant = Database['public']['Tables']['moyeora_participants']['Row']


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_performance_sync: {
        Row: {
          id: string
          created_at: string
          full_name: string
          breaks: number | null
          zoom_meetings: number | null
          rate_per_hour: number | null
          zoom_Scheduled: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          full_name: string
          breaks?: number | null
          zoom_meetings?: number | null
          rate_per_hour?: number | null
          zoom_Scheduled?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          full_name?: string
          breaks?: number | null
          zoom_meetings?: number | null
          rate_per_hour?: number | null
          zoom_Scheduled?: number | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          id: string
          created_at: string
          name: string
          username: string | null
          password: string | null
          status: string | null
          alias: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          username?: string | null
          password?: string | null
          status?: string | null
          alias?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          username?: string | null
          password?: string | null
          status?: string | null
          alias?: string | null
        }
        Relationships: []
      }
      sf_work_records: {
        Row: {
          breakMinutes: number
          created_at: string
          date: string
          employeeId: string
          id: string
          meetingMinutes: number
          ratePerHour: number
          setsAdded: number
          talkTime: string
          waitTime: string
          moes_total: number
          training: boolean
          payment_status: string
          payment_batch_id: string | null
        }
        Insert: {
          breakMinutes: number
          created_at?: string
          date: string
          employeeId: string
          id?: string
          meetingMinutes: number
          ratePerHour: number
          setsAdded: number
          talkTime: string
          waitTime: string
          moes_total: number
          training?: boolean
          payment_status?: string
          payment_batch_id?: string | null
        }
        Update: {
          breakMinutes?: number
          created_at?: string
          date?: string
          employeeId?: string
          id?: string
          meetingMinutes?: number
          ratePerHour?: number
          setsAdded?: number
          talkTime?: string
          waitTime?: string
          moes_total?: number
          training?: boolean
          payment_status?: string
          payment_batch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sf_work_records_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      games: {
        Row: {
          created_at: string
          double_out: boolean
          id: string
          players: Json
          recorded_by: string
          start_score: number
          tournament_id: string | null
          winner_name: string
        }
        Insert: {
          created_at?: string
          double_out?: boolean
          id?: string
          players: Json
          recorded_by: string
          start_score: number
          tournament_id?: string | null
          winner_name: string
        }
        Update: {
          created_at?: string
          double_out?: boolean
          id?: string
          players?: Json
          recorded_by?: string
          start_score?: number
          tournament_id?: string | null
          winner_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      helloasso_registrations: {
        Row: {
          amount_cents: number
          custom_fields: Json | null
          email: string | null
          first_name: string | null
          id: string
          item_id: number
          last_name: string | null
          paid_at: string | null
          partner_first_name: string | null
          partner_last_name: string | null
          state: string | null
          synced_at: string
          tier_name: string | null
          tournament_id: string
        }
        Insert: {
          amount_cents?: number
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          item_id: number
          last_name?: string | null
          paid_at?: string | null
          partner_first_name?: string | null
          partner_last_name?: string | null
          state?: string | null
          synced_at?: string
          tier_name?: string | null
          tournament_id: string
        }
        Update: {
          amount_cents?: number
          custom_fields?: Json | null
          email?: string | null
          first_name?: string | null
          id?: string
          item_id?: number
          last_name?: string | null
          paid_at?: string | null
          partner_first_name?: string | null
          partner_last_name?: string | null
          state?: string | null
          synced_at?: string
          tier_name?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helloasso_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          media_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          media_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          media_url?: string | null
          title?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          tournament_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          tournament_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          best_score: number
          id: string
          losses: number
          matches_played: number
          updated_at: string
          user_id: string
          wins: number
        }
        Insert: {
          best_score?: number
          id?: string
          losses?: number
          matches_played?: number
          updated_at?: string
          user_id: string
          wins?: number
        }
        Update: {
          best_score?: number
          id?: string
          losses?: number
          matches_played?: number
          updated_at?: string
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          tournament_announcements: boolean
          tournaments_seen_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          tournament_announcements?: boolean
          tournaments_seen_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          tournament_announcements?: boolean
          tournaments_seen_at?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          created_at: string
          id: string
          status: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          created_at: string
          id: string
          losses: number
          played: number
          player_name: string
          points: number
          rank: number
          season: string
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          losses?: number
          played?: number
          player_name: string
          points?: number
          rank: number
          season?: string
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          losses?: number
          played?: number
          player_name?: string
          points?: number
          rank?: number
          season?: string
          wins?: number
        }
        Relationships: []
      }
      tournament_access_codes: {
        Row: {
          active: boolean
          claimed_by: string | null
          code: string
          created_at: string
          email: string
          id: string
          participant_name: string | null
          tournament_id: string
        }
        Insert: {
          active?: boolean
          claimed_by?: string | null
          code: string
          created_at?: string
          email: string
          id?: string
          participant_name?: string | null
          tournament_id: string
        }
        Update: {
          active?: boolean
          claimed_by?: string | null
          code?: string
          created_at?: string
          email?: string
          id?: string
          participant_name?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_access_codes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_code_claims: {
        Row: {
          code: string
          created_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_code_claims_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          created_at: string
          id: string
          legs_a: number | null
          legs_b: number | null
          pool_index: number | null
          position: number
          round: number
          score_a: number | null
          score_b: number | null
          stage: string
          team_a: string | null
          team_b: string | null
          tournament_id: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          legs_a?: number | null
          legs_b?: number | null
          pool_index?: number | null
          position?: number
          round?: number
          score_a?: number | null
          score_b?: number | null
          stage: string
          team_a?: string | null
          team_b?: string | null
          tournament_id: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          legs_a?: number | null
          legs_b?: number | null
          pool_index?: number | null
          position?: number
          round?: number
          score_a?: number | null
          score_b?: number | null
          stage?: string
          team_a?: string | null
          team_b?: string | null
          tournament_id?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_team_a_fkey"
            columns: ["team_a"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_b_fkey"
            columns: ["team_b"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_fkey"
            columns: ["winner"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_settings_codes: {
        Row: {
          code: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          code: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_settings_codes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          captain_id: string | null
          created_at: string
          helloasso_item_id: number | null
          id: string
          name: string
          name_locked: boolean
          tournament_id: string
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          helloasso_item_id?: number | null
          id?: string
          name: string
          name_locked?: boolean
          tournament_id: string
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          helloasso_item_id?: number | null
          id?: string
          name?: string
          name_locked?: boolean
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          description: string | null
          double_out: boolean
          end_time: string | null
          event_date: string
          format: string
          helloasso_url: string | null
          id: string
          image_url: string | null
          location: string | null
          max_participants: number | null
          pool_count: number
          pool_double_limit: boolean
          start_score: number
          start_time: string | null
          status: string
          team_size: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          double_out?: boolean
          end_time?: string | null
          event_date: string
          format?: string
          helloasso_url?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          pool_count?: number
          pool_double_limit?: boolean
          start_score?: number
          start_time?: string | null
          status?: string
          team_size?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          double_out?: boolean
          end_time?: string | null
          event_date?: string
          format?: string
          helloasso_url?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          pool_count?: number
          pool_double_limit?: boolean
          start_score?: number
          start_time?: string | null
          status?: string
          team_size?: number
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

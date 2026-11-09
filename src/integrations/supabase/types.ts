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
          organization_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          media_url?: string | null
          organization_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          media_url?: string | null
          organization_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          organization_id: string | null
          payload: Json
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          organization_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          organization_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          status: string
          token_hash: string
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          status?: string
          token_hash: string
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_players: {
        Row: {
          category: string | null
          created_at: string
          membership_status: string | null
          notes: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          membership_status?: string | null
          notes?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          membership_status?: string | null
          notes?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_players_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          cover_path: string | null
          location: string | null
          logo_path: string | null
          organization_id: string
          organization_type: string | null
          phone: string | null
          postal_code: string | null
          primary_color: string | null
          responsible_name: string | null
          secondary_color: string | null
          social_links: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          cover_path?: string | null
          location?: string | null
          logo_path?: string | null
          organization_id: string
          organization_type?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          responsible_name?: string | null
          secondary_color?: string | null
          social_links?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          cover_path?: string | null
          location?: string | null
          logo_path?: string | null
          organization_id?: string
          organization_type?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string | null
          responsible_name?: string | null
          secondary_color?: string | null
          social_links?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          organization_id: string | null
          tournament_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          organization_id?: string | null
          tournament_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          organization_id?: string | null
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tournament_organization_fk"
            columns: ["tournament_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          avatar_path: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          legacy_organization_id: string | null
          tournament_announcements: boolean
          tournaments_seen_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          legacy_organization_id?: string | null
          tournament_announcements?: boolean
          tournaments_seen_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          legacy_organization_id?: string | null
          tournament_announcements?: boolean
          tournaments_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_legacy_organization_id_fkey"
            columns: ["legacy_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          played?: number
          player_name?: string
          points?: number
          rank?: number
          season?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      tournament_manager_assignments: {
        Row: {
          assigned_by: string
          created_at: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_manager_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_manager_assignments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_manager_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          live_legs_a: number
          live_legs_b: number
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
          live_legs_a?: number
          live_legs_b?: number
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
          live_legs_a?: number
          live_legs_b?: number
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
            foreignKeyName: "matches_team_a_same_tournament_fk"
            columns: ["tournament_id", "team_a"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["tournament_id", "id"]
          },
          {
            foreignKeyName: "matches_team_b_same_tournament_fk"
            columns: ["tournament_id", "team_b"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["tournament_id", "id"]
          },
          {
            foreignKeyName: "matches_winner_same_tournament_fk"
            columns: ["tournament_id", "winner"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["tournament_id", "id"]
          },
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
          consolation: boolean
          consolation_double_limit: boolean | null
          consolation_double_out: boolean | null
          consolation_start_score: number | null
          created_at: string
          created_by: string | null
          description: string | null
          double_out: boolean
          end_time: string | null
          event_date: string
          final_double_out: boolean | null
          final_start_score: number | null
          format: string
          helloasso_url: string | null
          id: string
          image_url: string | null
          location: string | null
          max_participants: number | null
          organization_id: string | null
          pool_count: number
          pool_double_limit: boolean
          start_score: number
          start_time: string | null
          status: string
          team_size: number
          title: string
        }
        Insert: {
          consolation?: boolean
          consolation_double_limit?: boolean | null
          consolation_double_out?: boolean | null
          consolation_start_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          double_out?: boolean
          end_time?: string | null
          event_date: string
          final_double_out?: boolean | null
          final_start_score?: number | null
          format?: string
          helloasso_url?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          organization_id?: string | null
          pool_count?: number
          pool_double_limit?: boolean
          start_score?: number
          start_time?: string | null
          status?: string
          team_size?: number
          title: string
        }
        Update: {
          consolation?: boolean
          consolation_double_limit?: boolean | null
          consolation_double_out?: boolean | null
          consolation_start_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          double_out?: boolean
          end_time?: string | null
          event_date?: string
          final_double_out?: boolean | null
          final_start_score?: number | null
          format?: string
          helloasso_url?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          max_participants?: number | null
          organization_id?: string | null
          pool_count?: number
          pool_double_limit?: boolean
          start_score?: number
          start_time?: string | null
          status?: string
          team_size?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      can_manage_organization: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      can_manage_tournament: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      change_organization_collaborator: {
        Args: { _organization_id: string; _role: string; _user_id: string }
        Returns: undefined
      }
      create_organization_invitation: {
        Args: {
          _email: string
          _organization_id: string
          _role: string
          _token_hash: string
        }
        Returns: string
      }
      create_organization_space: {
        Args: {
          _description: string
          _name: string
          _settings: Json
          _slug: string
        }
        Returns: string
      }
      get_public_organization_settings: {
        Args: { _organization_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_organization_member: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      media_organization_id: { Args: { _path: string }; Returns: string }
      organization_is_public: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      platform_counts: { Args: never; Returns: Json }
      profile_readable_by_manager: {
        Args: { _user_id: string }
        Returns: boolean
      }
      respond_organization_invitation: {
        Args: { _accept: boolean; _token_hash: string }
        Returns: string
      }
      save_organization_settings: {
        Args: {
          _description: string
          _name: string
          _organization_id: string
          _settings: Json
        }
        Returns: undefined
      }
      set_central_member_admin: {
        Args: { _admin: boolean; _user_id: string }
        Returns: undefined
      }
      set_organization_status: {
        Args: { _organization_id: string; _status: string }
        Returns: undefined
      }
      tournament_accepts_registration: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      tournament_is_public: {
        Args: { _tournament_id: string }
        Returns: boolean
      }
      transfer_organization_ownership: {
        Args: { _organization_id: string; _user_id: string }
        Returns: undefined
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_sessions: {
        Row: {
          created_at: string
          held_on: string
          id: string
          kind: string
          season_id: string
          source_key: string | null
          title: string
        }
        Insert: {
          created_at?: string
          held_on: string
          id?: string
          kind: string
          season_id: string
          source_key?: string | null
          title: string
        }
        Update: {
          created_at?: string
          held_on?: string
          id?: string
          kind?: string
          season_id?: string
          source_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_change_batches: {
        Row: {
          created_at: string
          id: string
          member_id: string | null
          reverts: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id?: string | null
          reverts?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string | null
          reverts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_change_batches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_change_batches_reverts_fkey"
            columns: ["reverts"]
            isOneToOne: true
            referencedRelation: "admin_change_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_change_log: {
        Row: {
          batch_id: string
          id: number
          new_row: Json | null
          old_row: Json | null
          op: string
          table_name: string
        }
        Insert: {
          batch_id: string
          id?: never
          new_row?: Json | null
          old_row?: Json | null
          op: string
          table_name: string
        }
        Update: {
          batch_id?: string
          id?: never
          new_row?: Json | null
          old_row?: Json | null
          op?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_change_log_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "admin_change_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      aikuthon_award_members: {
        Row: {
          award_id: string
          id: string
          member_id: string | null
          name: string
          sort_order: number
        }
        Insert: {
          award_id: string
          id?: string
          member_id?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          award_id?: string
          id?: string
          member_id?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "aikuthon_award_members_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "aikuthon_awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aikuthon_award_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      aikuthon_awards: {
        Row: {
          aikuthon_id: string
          id: string
          rank: number
          team_name: string
        }
        Insert: {
          aikuthon_id: string
          id?: string
          rank: number
          team_name?: string
        }
        Update: {
          aikuthon_id?: string
          id?: string
          rank?: number
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "aikuthon_awards_aikuthon_id_fkey"
            columns: ["aikuthon_id"]
            isOneToOne: false
            referencedRelation: "aikuthons"
            referencedColumns: ["id"]
          },
        ]
      }
      aikuthon_partners: {
        Row: {
          aikuthon_id: string
          id: string
          name: string
          role: string
          sort_order: number
        }
        Insert: {
          aikuthon_id: string
          id?: string
          name: string
          role: string
          sort_order?: number
        }
        Update: {
          aikuthon_id?: string
          id?: string
          name?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "aikuthon_partners_aikuthon_id_fkey"
            columns: ["aikuthon_id"]
            isOneToOne: false
            referencedRelation: "aikuthons"
            referencedColumns: ["id"]
          },
        ]
      }
      aikuthon_tags: {
        Row: {
          aikuthon_id: string
          sort_order: number
          tag_id: string
        }
        Insert: {
          aikuthon_id: string
          sort_order?: number
          tag_id: string
        }
        Update: {
          aikuthon_id?: string
          sort_order?: number
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aikuthon_tags_aikuthon_id_fkey"
            columns: ["aikuthon_id"]
            isOneToOne: false
            referencedRelation: "aikuthons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aikuthon_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      aikuthon_tracks: {
        Row: {
          aikuthon_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          aikuthon_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          aikuthon_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "aikuthon_tracks_aikuthon_id_fkey"
            columns: ["aikuthon_id"]
            isOneToOne: false
            referencedRelation: "aikuthons"
            referencedColumns: ["id"]
          },
        ]
      }
      aikuthons: {
        Row: {
          competition_url: string | null
          created_at: string
          date_precision: string
          edition: number | null
          ends_on: string | null
          format: string
          id: string
          kind: string
          metric: string
          mode: string
          name: string
          overnight: boolean | null
          platform: string
          season_id: string
          source_key: string | null
          starts_on: string
          task_description: string
          task_title: string
          team_size_max: number | null
          team_size_min: number | null
          updated_at: string
          venue: string
        }
        Insert: {
          competition_url?: string | null
          created_at?: string
          date_precision?: string
          edition?: number | null
          ends_on?: string | null
          format?: string
          id?: string
          kind?: string
          metric?: string
          mode?: string
          name: string
          overnight?: boolean | null
          platform?: string
          season_id: string
          source_key?: string | null
          starts_on: string
          task_description?: string
          task_title?: string
          team_size_max?: number | null
          team_size_min?: number | null
          updated_at?: string
          venue?: string
        }
        Update: {
          competition_url?: string | null
          created_at?: string
          date_precision?: string
          edition?: number | null
          ends_on?: string | null
          format?: string
          id?: string
          kind?: string
          metric?: string
          mode?: string
          name?: string
          overnight?: boolean | null
          platform?: string
          season_id?: string
          source_key?: string | null
          starts_on?: string
          task_description?: string
          task_title?: string
          team_size_max?: number | null
          team_size_min?: number | null
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "aikuthons_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          member_id: string
          reason: string
          session_id: string
          status: string
        }
        Insert: {
          member_id: string
          reason?: string
          session_id: string
          status: string
        }
        Update: {
          member_id?: string
          reason?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "activity_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          id: number
          ip: string
        }
        Insert: {
          created_at?: string
          id?: never
          ip: string
        }
        Update: {
          created_at?: string
          id?: never
          ip?: string
        }
        Relationships: []
      }
      member_accounts: {
        Row: {
          created_at: string
          member_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          member_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          member_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_positions: {
        Row: {
          created_at: string
          generation_id: string
          id: string
          member_id: string
          title: string
        }
        Insert: {
          created_at?: string
          generation_id: string
          id?: string
          member_id: string
          title: string
        }
        Update: {
          created_at?: string
          generation_id?: string
          id?: string
          member_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_positions_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_positions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          avatar_path: string | null
          bio: string
          contact_email: string | null
          created_at: string
          experience: Json
          focus: string[]
          github_url: string | null
          headline: string
          instagram_url: string | null
          interests: Json
          is_public: boolean
          linkedin_url: string | null
          member_id: string
          skills: Json
          tagline: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          avatar_path?: string | null
          bio?: string
          contact_email?: string | null
          created_at?: string
          experience?: Json
          focus?: string[]
          github_url?: string | null
          headline?: string
          instagram_url?: string | null
          interests?: Json
          is_public?: boolean
          linkedin_url?: string | null
          member_id: string
          skills?: Json
          tagline?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          avatar_path?: string | null
          bio?: string
          contact_email?: string | null
          created_at?: string
          experience?: Json
          focus?: string[]
          github_url?: string | null
          headline?: string
          instagram_url?: string | null
          interests?: Json
          is_public?: boolean
          linkedin_url?: string | null
          member_id?: string
          skills?: Json
          tagline?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_signup_requests: {
        Row: {
          attempts: number
          created_at: string
          email: string | null
          generation_name: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          email?: string | null
          generation_name: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          email?: string | null
          generation_name?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_student_ids: {
        Row: {
          created_at: string
          digest: string
          member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          digest: string
          member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          digest?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_student_ids_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          department: string
          generation_id: string
          grade: string
          grade_pinned: boolean
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string
          generation_id: string
          grade?: string
          grade_pinned?: boolean
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          generation_id?: string
          grade?: string
          grade_pinned?: boolean
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          created_at: string
          id: string
          link_label: string
          link_url: string | null
          published_on: string | null
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_label?: string
          link_url?: string | null
          published_on?: string | null
          sort_order?: number
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link_label?: string
          link_url?: string | null
          published_on?: string | null
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_event_members: {
        Row: {
          event_id: string
          member_id: string
        }
        Insert: {
          event_id: string
          member_id: string
        }
        Update: {
          event_id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_event_members_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "point_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_event_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          created_at: string
          held_on: string | null
          id: string
          quantity: number
          rule_code: string
          season_id: string
          source_key: string | null
          title: string
        }
        Insert: {
          created_at?: string
          held_on?: string | null
          id?: string
          quantity?: number
          rule_code: string
          season_id: string
          source_key?: string | null
          title: string
        }
        Update: {
          created_at?: string
          held_on?: string | null
          id?: string
          quantity?: number
          rule_code?: string
          season_id?: string
          source_key?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_rule_code_fkey"
            columns: ["rule_code"]
            isOneToOne: false
            referencedRelation: "point_rules"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "point_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      point_rules: {
        Row: {
          attendance_status: string | null
          code: string
          label: string
          points: number
          session_kind: string | null
          sort_order: number
        }
        Insert: {
          attendance_status?: string | null
          code: string
          label: string
          points: number
          session_kind?: string | null
          sort_order?: number
        }
        Update: {
          attendance_status?: string | null
          code?: string
          label?: string
          points?: number
          session_kind?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          member_id: string | null
          name: string
          project_id: string
          role: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          member_id?: string | null
          name: string
          project_id: string
          role?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string | null
          name?: string
          project_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tags: {
        Row: {
          project_id: string
          sort_order: number
          tag_id: string
        }
        Insert: {
          project_id: string
          sort_order?: number
          tag_id: string
        }
        Update: {
          project_id?: string
          sort_order?: number
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          award_rank: number | null
          created_at: string
          github_url: string | null
          id: string
          image_paths: string[]
          markdown: string
          notion_page_id: string | null
          one_line: string
          presentation_name: string | null
          presentation_path: string | null
          season_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          award_rank?: number | null
          created_at?: string
          github_url?: string | null
          id?: string
          image_paths?: string[]
          markdown?: string
          notion_page_id?: string | null
          one_line?: string
          presentation_name?: string | null
          presentation_path?: string | null
          season_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          award_rank?: number | null
          created_at?: string
          github_url?: string | null
          id?: string
          image_paths?: string[]
          markdown?: string
          notion_page_id?: string | null
          one_line?: string
          presentation_name?: string | null
          presentation_path?: string | null
          season_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          term: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          term: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          term?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      member_point_entries: {
        Row: {
          held_on: string | null
          label: string | null
          member_id: string | null
          points: number | null
          season_id: string | null
          source: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_apply_batch: {
        Args: { p_changes: Json; p_member: string }
        Returns: Json
      }
      admin_apply_changes: { Args: { p_changes: Json }; Returns: number }
      admin_key_condition: {
        Args: { p_row: Json; p_table: string }
        Returns: string
      }
      admin_revert_batch: {
        Args: { p_batch: string; p_member: string }
        Returns: Json
      }
      admin_track: { Args: { p_table: string }; Returns: undefined }
      generation_number: { Args: { p_name: string }; Returns: number }
      reorder_items: {
        Args: { p_ids: string[]; p_scope?: string; p_table: string }
        Returns: undefined
      }
      set_aikuthon_tags: {
        Args: { p_aikuthon_id: string; p_names: string[] }
        Returns: undefined
      }
      set_project_tags: {
        Args: { p_names: string[]; p_project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


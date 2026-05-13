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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance_corrections: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          reason: string
          record_id: string
          requested_by: string
          requested_change: Json
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason: string
          record_id: string
          requested_by: string
          requested_change: Json
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string
          record_id?: string
          requested_by?: string
          requested_change?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_corrections_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          actor_id: string | null
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          kind: string
          payload: Json | null
          photo_url: string | null
          record_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          kind: string
          payload?: Json | null
          photo_url?: string | null
          record_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          kind?: string
          payload?: Json | null
          photo_url?: string | null
          record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_notifications: {
        Row: {
          channel: string
          id: string
          kind: string
          payload: Json | null
          recipient_phone: string
          recipient_role: string
          record_id: string
          sent_at: string
        }
        Insert: {
          channel?: string
          id?: string
          kind: string
          payload?: Json | null
          recipient_phone: string
          recipient_role: string
          record_id: string
          sent_at?: string
        }
        Update: {
          channel?: string
          id?: string
          kind?: string
          payload?: Json | null
          recipient_phone?: string
          recipient_role?: string
          record_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          contractor_id: string
          corporation_id: string
          created_at: string
          end_gps_lat: number | null
          end_gps_lng: number | null
          end_photo_url: string | null
          end_time: string | null
          entry_approved_at: string | null
          entry_approved_by: string | null
          entry_rejection_reason: string | null
          exception_at: string | null
          exception_note: string | null
          exception_reason: string | null
          exception_reported_by: string | null
          exit_approved_at: string | null
          exit_approved_by: string | null
          exit_rejection_reason: string | null
          frozen_at: string | null
          hourly_rate: number | null
          id: string
          project_id: string
          rejection_reason: string | null
          start_gps_lat: number | null
          start_gps_lng: number | null
          start_photo_url: string | null
          start_time: string | null
          status: string
          team_id: string
          team_leader_id: string
          total_cost: number | null
          total_hours: number | null
          updated_at: string
          work_date: string
          workers_actual: number | null
          workers_expected: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          contractor_id: string
          corporation_id: string
          created_at?: string
          end_gps_lat?: number | null
          end_gps_lng?: number | null
          end_photo_url?: string | null
          end_time?: string | null
          entry_approved_at?: string | null
          entry_approved_by?: string | null
          entry_rejection_reason?: string | null
          exception_at?: string | null
          exception_note?: string | null
          exception_reason?: string | null
          exception_reported_by?: string | null
          exit_approved_at?: string | null
          exit_approved_by?: string | null
          exit_rejection_reason?: string | null
          frozen_at?: string | null
          hourly_rate?: number | null
          id?: string
          project_id: string
          rejection_reason?: string | null
          start_gps_lat?: number | null
          start_gps_lng?: number | null
          start_photo_url?: string | null
          start_time?: string | null
          status?: string
          team_id: string
          team_leader_id: string
          total_cost?: number | null
          total_hours?: number | null
          updated_at?: string
          work_date: string
          workers_actual?: number | null
          workers_expected?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          contractor_id?: string
          corporation_id?: string
          created_at?: string
          end_gps_lat?: number | null
          end_gps_lng?: number | null
          end_photo_url?: string | null
          end_time?: string | null
          entry_approved_at?: string | null
          entry_approved_by?: string | null
          entry_rejection_reason?: string | null
          exception_at?: string | null
          exception_note?: string | null
          exception_reason?: string | null
          exception_reported_by?: string | null
          exit_approved_at?: string | null
          exit_approved_by?: string | null
          exit_rejection_reason?: string | null
          frozen_at?: string | null
          hourly_rate?: number | null
          id?: string
          project_id?: string
          rejection_reason?: string | null
          start_gps_lat?: number | null
          start_gps_lng?: number | null
          start_photo_url?: string | null
          start_time?: string | null
          status?: string
          team_id?: string
          team_leader_id?: string
          total_cost?: number | null
          total_hours?: number | null
          updated_at?: string
          work_date?: string
          workers_actual?: number | null
          workers_expected?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "project_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      corporation_workforce: {
        Row: {
          corporation_id: string
          count: number
          created_at: string
          id: string
          nationality: string
          role: string
          updated_at: string
        }
        Insert: {
          corporation_id: string
          count?: number
          created_at?: string
          id?: string
          nationality: string
          role: string
          updated_at?: string
        }
        Update: {
          corporation_id?: string
          count?: number
          created_at?: string
          id?: string
          nationality?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      job_awards: {
        Row: {
          awarded_at: string
          awarded_by: string
          corporation_id: string
          id: string
          offer_id: string
          request_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by: string
          corporation_id: string
          id?: string
          offer_id: string
          request_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string
          corporation_id?: string
          id?: string
          offer_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_awards_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "job_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_awards_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_offers: {
        Row: {
          available_workers: number
          corporation_id: string
          created_at: string
          id: string
          insurance: boolean
          note: string | null
          price_per_hour: number
          request_id: string
          response_time_hours: number
          start_date: string
          status: string
          updated_at: string
          warranty_days: number
        }
        Insert: {
          available_workers: number
          corporation_id: string
          created_at?: string
          id?: string
          insurance?: boolean
          note?: string | null
          price_per_hour: number
          request_id: string
          response_time_hours?: number
          start_date: string
          status?: string
          updated_at?: string
          warranty_days?: number
        }
        Update: {
          available_workers?: number
          corporation_id?: string
          created_at?: string
          id?: string
          insurance?: boolean
          note?: string | null
          price_per_hour?: number
          request_id?: string
          response_time_hours?: number
          start_date?: string
          status?: string
          updated_at?: string
          warranty_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_ratings: {
        Row: {
          comment: string | null
          created_at: string
          direction: string
          id: string
          ratee_id: string
          rater_id: string
          request_id: string
          score: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          direction: string
          id?: string
          ratee_id: string
          rater_id: string
          request_id: string
          score: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          direction?: string
          id?: string
          ratee_id?: string
          rater_id?: string
          request_id?: string
          score?: number
        }
        Relationships: []
      }
      job_request_items: {
        Row: {
          count: number
          created_at: string
          id: string
          nationality: string
          request_id: string
          role: string
        }
        Insert: {
          count: number
          created_at?: string
          id?: string
          nationality: string
          request_id: string
          role: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          nationality?: string
          request_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_request_messages: {
        Row: {
          body: string
          corporation_id: string
          created_at: string
          id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          body: string
          corporation_id: string
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
        }
        Update: {
          body?: string
          corporation_id?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requests: {
        Row: {
          budget: string | null
          commitment_months: string
          contact_name: string
          contact_phone: string
          created_at: string
          deadline_at: string | null
          description: string | null
          duration: string
          id: string
          location: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: string | null
          commitment_months: string
          contact_name: string
          contact_phone: string
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          duration: string
          id?: string
          location: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: string | null
          commitment_months?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          deadline_at?: string | null
          description?: string | null
          duration?: string
          id?: string
          location?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          books_cert_url: string | null
          business_id: string | null
          business_name: string | null
          city: string | null
          company_name: string | null
          contractor_classification: string | null
          contractor_license_number: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          insurance_doc_url: string | null
          is_verified: boolean
          license_doc_url: string | null
          phone: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          books_cert_url?: string | null
          business_id?: string | null
          business_name?: string | null
          city?: string | null
          company_name?: string | null
          contractor_classification?: string | null
          contractor_license_number?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          insurance_doc_url?: string | null
          is_verified?: boolean
          license_doc_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          books_cert_url?: string | null
          business_id?: string | null
          business_name?: string | null
          city?: string | null
          company_name?: string | null
          contractor_classification?: string | null
          contractor_license_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          insurance_doc_url?: string | null
          is_verified?: boolean
          license_doc_url?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          created_at: string
          expected_workers: number
          hourly_rate: number | null
          id: string
          name: string
          project_id: string
          team_leader_id: string
          team_leader_name: string | null
          team_leader_phone: string | null
        }
        Insert: {
          created_at?: string
          expected_workers?: number
          hourly_rate?: number | null
          id?: string
          name: string
          project_id: string
          team_leader_id: string
          team_leader_name?: string | null
          team_leader_phone?: string | null
        }
        Update: {
          created_at?: string
          expected_workers?: number
          hourly_rate?: number | null
          id?: string
          name?: string
          project_id?: string
          team_leader_id?: string
          team_leader_name?: string | null
          team_leader_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          contractor_id: string
          corporation_id: string
          created_at: string
          expected_workers: number
          hourly_rate: number | null
          id: string
          name: string
          site_lat: number | null
          site_lng: number | null
          site_manager_name: string | null
          site_manager_phone: string | null
          site_radius_meters: number
          source_award_id: string | null
          source_request_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contractor_id: string
          corporation_id: string
          created_at?: string
          expected_workers?: number
          hourly_rate?: number | null
          id?: string
          name: string
          site_lat?: number | null
          site_lng?: number | null
          site_manager_name?: string | null
          site_manager_phone?: string | null
          site_radius_meters?: number
          source_award_id?: string | null
          source_request_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contractor_id?: string
          corporation_id?: string
          created_at?: string
          expected_workers?: number
          hourly_rate?: number | null
          id?: string
          name?: string
          site_lat?: number | null
          site_lng?: number | null
          site_manager_name?: string | null
          site_manager_phone?: string | null
          site_radius_meters?: number
          source_award_id?: string | null
          source_request_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          id: string
          key: string
        }
        Insert: {
          bucket: string
          count?: number
          id?: string
          key: string
        }
        Update: {
          bucket?: string
          count?: number
          id?: string
          key?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          id: string
          kind: string
          request_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          kind: string
          request_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          kind?: string
          request_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      sms_notifications: {
        Row: {
          body: string
          channel: string
          error: string | null
          id: string
          kind: string
          payload: Json | null
          provider: string | null
          provider_message_id: string | null
          recipient_phone: string
          recipient_role: string
          record_id: string
          sent_at: string
          status: string
        }
        Insert: {
          body: string
          channel: string
          error?: string | null
          id?: string
          kind: string
          payload?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_phone: string
          recipient_role: string
          record_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          body?: string
          channel?: string
          error?: string | null
          id?: string
          kind?: string
          payload?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_phone?: string
          recipient_role?: string
          record_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      check_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      geo_distance_meters: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "contractor"
        | "corporation"
        | "admin"
        | "team_leader"
        | "site_manager"
      verification_status: "pending" | "approved" | "rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "contractor",
        "corporation",
        "admin",
        "team_leader",
        "site_manager",
      ],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const

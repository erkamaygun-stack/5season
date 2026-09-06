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
      aidat_invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          is_prorated: boolean | null
          notes: string | null
          paid_amount: number | null
          period_month: number
          period_year: number
          school_id: string
          status: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          is_prorated?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          period_month: number
          period_year: number
          school_id: string
          status?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          is_prorated?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          period_month?: number
          period_year?: number
          school_id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aidat_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aidat_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aidat_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string | null
          changed_at: string | null
          changed_by: string | null
          from_status: string | null
          id: string
          note: string | null
          to_status: string | null
        }
        Insert: {
          application_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Update: {
          application_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_full_name: string
          birth_date: string | null
          created_at: string | null
          enrolled_student_id: string | null
          id: string
          notes: string | null
          parent_full_name: string
          parent_phone: string
          school_id: string
          source: string | null
          status: string
          trial_group_id: string | null
          trial_session_date: string | null
          updated_at: string | null
        }
        Insert: {
          applicant_full_name: string
          birth_date?: string | null
          created_at?: string | null
          enrolled_student_id?: string | null
          id?: string
          notes?: string | null
          parent_full_name: string
          parent_phone: string
          school_id: string
          source?: string | null
          status?: string
          trial_group_id?: string | null
          trial_session_date?: string | null
          updated_at?: string | null
        }
        Update: {
          applicant_full_name?: string
          birth_date?: string | null
          created_at?: string | null
          enrolled_student_id?: string | null
          id?: string
          notes?: string | null
          parent_full_name?: string
          parent_phone?: string
          school_id?: string
          source?: string | null
          status?: string
          trial_group_id?: string | null
          trial_session_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_enrolled_student_id_fkey"
            columns: ["enrolled_student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_enrolled_student_id_fkey"
            columns: ["enrolled_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_trial_group_id_fkey"
            columns: ["trial_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          dismissed_at: string | null
          id: string
          notified_at: string | null
          recorded_at: string | null
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          dismissed_at?: string | null
          id?: string
          notified_at?: string | null
          recorded_at?: string | null
          session_id: string
          status: string
          student_id: string
        }
        Update: {
          dismissed_at?: string | null
          id?: string
          notified_at?: string | null
          recorded_at?: string | null
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          acknowledged_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          end_time: string
          group_id: string
          id: string
          notes: string | null
          school_id: string
          session_date: string
          start_time: string
          status: string | null
          taken_at: string | null
          taken_by: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          end_time: string
          group_id: string
          id?: string
          notes?: string | null
          school_id: string
          session_date: string
          start_time: string
          status?: string | null
          taken_at?: string | null
          taken_by?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          end_time?: string
          group_id?: string
          id?: string
          notes?: string | null
          school_id?: string
          session_date?: string
          start_time?: string
          status?: string | null
          taken_at?: string | null
          taken_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string | null
          diff: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          school_id: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_invoices: {
        Row: {
          amount: number
          created_at: string | null
          delivered: boolean | null
          delivered_at: string | null
          description: string | null
          id: string
          paid_amount: number | null
          school_id: string
          status: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          paid_amount?: number | null
          school_id: string
          status?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          description?: string | null
          id?: string
          paid_amount?: number | null
          school_id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string | null
          id: string
          paid_to: string | null
          receipt_url: string | null
          school_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          paid_to?: string | null
          receipt_url?: string | null
          school_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          paid_to?: string | null
          receipt_url?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      group_schedule_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          group_id: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          group_id: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          group_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_schedule_slots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          age_max: number | null
          age_min: number | null
          capacity: number | null
          category: string
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          monthly_fee: number | null
          name: string
          primary_coach_id: string | null
          school_id: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          capacity?: number | null
          category?: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          name: string
          primary_coach_id?: string | null
          school_id: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          capacity?: number | null
          category?: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          name?: string
          primary_coach_id?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_primary_coach_id_fkey"
            columns: ["primary_coach_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_consents: {
        Row: {
          evidence: Json
          guardian_id: string
          id: string
          legal_basis: string
          purpose_code: string
          recorded_at: string
          recorded_by: string | null
          revoked_at: string | null
          school_id: string
          source: string
          status: string
        }
        Insert: {
          evidence?: Json
          guardian_id: string
          id?: string
          legal_basis: string
          purpose_code: string
          recorded_at?: string
          recorded_by?: string | null
          revoked_at?: string | null
          school_id: string
          source: string
          status: string
        }
        Update: {
          evidence?: Json
          guardian_id?: string
          id?: string
          legal_basis?: string
          purpose_code?: string
          recorded_at?: string
          recorded_by?: string | null
          revoked_at?: string | null
          school_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_consents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_consents_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_consents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_students: {
        Row: {
          created_at: string
          guardian_id: string
          is_primary: boolean
          relation: string
          student_id: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          is_primary?: boolean
          relation?: string
          student_id: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          is_primary?: boolean
          relation?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_students_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone_e164: string
          school_id: string
          status: string
          updated_at: string
          whatsapp_wa_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone_e164: string
          school_id: string
          status?: string
          updated_at?: string
          whatsapp_wa_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone_e164?: string
          school_id?: string
          status?: string
          updated_at?: string
          whatsapp_wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_outbox: {
        Row: {
          attempt_count: number
          channel_id: string | null
          created_at: string
          event_key: string
          guardian_id: string | null
          id: string
          last_error_code: string | null
          locked_at: string | null
          next_attempt_at: string | null
          payload: Json
          purpose_code: string
          school_id: string
          sent_at: string | null
          status: string
          suppression_reason: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel_id?: string | null
          created_at?: string
          event_key: string
          guardian_id?: string | null
          id?: string
          last_error_code?: string | null
          locked_at?: string | null
          next_attempt_at?: string | null
          payload?: Json
          purpose_code: string
          school_id: string
          sent_at?: string | null
          status?: string
          suppression_reason?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel_id?: string | null
          created_at?: string
          event_key?: string
          guardian_id?: string | null
          id?: string
          last_error_code?: string | null
          locked_at?: string | null
          next_attempt_at?: string | null
          payload?: Json
          purpose_code?: string
          school_id?: string
          sent_at?: string | null
          status?: string
          suppression_reason?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_outbox_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_outbox_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_outbox_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          parent_profile_id: string | null
          reason: string | null
          school_id: string
          session_date: string
          status: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          parent_profile_id?: string | null
          reason?: string | null
          school_id: string
          session_date: string
          status?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          parent_profile_id?: string | null
          reason?: string | null
          school_id?: string
          session_date?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_parent_profile_id_fkey"
            columns: ["parent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body_rendered: string | null
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          recipient_phone: string | null
          recipient_profile_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          school_id: string
          sent_at: string | null
          status: string | null
          template_code: string | null
        }
        Insert: {
          body_rendered?: string | null
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_phone?: string | null
          recipient_profile_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          school_id: string
          sent_at?: string | null
          status?: string | null
          template_code?: string | null
        }
        Update: {
          body_rendered?: string | null
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_phone?: string | null
          recipient_profile_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          school_id?: string
          sent_at?: string | null
          status?: string | null
          template_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          school_id: string | null
        }
        Insert: {
          body_template: string
          channel: string
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          school_id?: string | null
        }
        Update: {
          body_template?: string
          channel?: string
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student: {
        Row: {
          created_at: string | null
          is_primary: boolean | null
          parent_profile_id: string
          relation: string | null
          student_id: string
        }
        Insert: {
          created_at?: string | null
          is_primary?: boolean | null
          parent_profile_id: string
          relation?: string | null
          student_id: string
        }
        Update: {
          created_at?: string | null
          is_primary?: boolean | null
          parent_profile_id?: string
          relation?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_parent_profile_id_fkey"
            columns: ["parent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          invoice_type: string
          notes: string | null
          payment_date: string | null
          payment_method: string
          receipt_url: string | null
          received_by: string | null
          school_id: string
          status: string
          student_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          invoice_type: string
          notes?: string | null
          payment_date?: string | null
          payment_method: string
          receipt_url?: string | null
          received_by?: string | null
          school_id: string
          status?: string
          student_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          invoice_type?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          receipt_url?: string | null
          received_by?: string | null
          school_id?: string
          status?: string
          student_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          push_token: string | null
          role: string
          school_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          push_token?: string | null
          role: string
          school_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          push_token?: string | null
          role?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_submissions: {
        Row: {
          channel_id: string
          cleaned_at: string | null
          cleanup_attempts: number
          cleanup_last_error: string | null
          cleanup_locked_at: string | null
          cleanup_next_attempt_at: string | null
          content_sha256: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          guardian_id: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          match_confidence: number | null
          message_id: string
          mime_type: string | null
          payment_id: string | null
          school_id: string
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          cleaned_at?: string | null
          cleanup_attempts?: number
          cleanup_last_error?: string | null
          cleanup_locked_at?: string | null
          cleanup_next_attempt_at?: string | null
          content_sha256?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          guardian_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          match_confidence?: number | null
          message_id: string
          mime_type?: string | null
          payment_id?: string | null
          school_id: string
          size_bytes?: number | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          cleaned_at?: string | null
          cleanup_attempts?: number
          cleanup_last_error?: string | null
          cleanup_locked_at?: string | null
          cleanup_next_attempt_at?: string | null
          content_sha256?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_reason?: string | null
          guardian_id?: string | null
          id?: string
          invoice_id?: string | null
          invoice_type?: string | null
          match_confidence?: number | null
          message_id?: string
          mime_type?: string | null
          payment_id?: string | null
          school_id?: string
          size_bytes?: number | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_submissions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          collection_day: number | null
          communications_status: string
          contact_phone: string | null
          created_at: string | null
          default_aidat_amount: number | null
          default_uniform_amount: number | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          subscription_status: string | null
        }
        Insert: {
          address?: string | null
          collection_day?: number | null
          communications_status?: string
          contact_phone?: string | null
          created_at?: string | null
          default_aidat_amount?: number | null
          default_uniform_amount?: number | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
        }
        Update: {
          address?: string | null
          collection_day?: number | null
          communications_status?: string
          contact_phone?: string | null
          created_at?: string | null
          default_aidat_amount?: number | null
          default_uniform_amount?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          subscription_status?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          full_name: string
          hire_date: string | null
          id: string
          invitation_accepted_at: string | null
          invitation_email: string | null
          invitation_last_error: string | null
          invitation_sent_at: string | null
          invitation_status: string
          is_active: boolean | null
          monthly_salary: number | null
          notes: string | null
          profile_id: string | null
          school_id: string
          staff_type: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_email?: string | null
          invitation_last_error?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string
          is_active?: boolean | null
          monthly_salary?: number | null
          notes?: string | null
          profile_id?: string | null
          school_id: string
          staff_type: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_email?: string | null
          invitation_last_error?: string | null
          invitation_sent_at?: string | null
          invitation_status?: string
          is_active?: boolean | null
          monthly_salary?: number | null
          notes?: string | null
          profile_id?: string | null
          school_id?: string
          staff_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salary_payments: {
        Row: {
          amount: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          period_month: number
          period_year: number
          school_id: string
          staff_id: string
        }
        Insert: {
          amount: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_month: number
          period_year: number
          school_id: string
          staff_id: string
        }
        Update: {
          amount?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          period_month?: number
          period_year?: number
          school_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_salary_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_salary_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student_groups: {
        Row: {
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          left_at: string | null
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_groups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_basic_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_groups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          birth_date: string | null
          blood_type: string | null
          consent_doc_url: string | null
          created_at: string | null
          enrollment_date: string | null
          full_name: string
          gender: string | null
          has_received_uniform: boolean | null
          health_doc_url: string | null
          id: string
          notes: string | null
          school_id: string
          status: string | null
          uniform_received_at: string | null
        }
        Insert: {
          birth_date?: string | null
          blood_type?: string | null
          consent_doc_url?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          full_name: string
          gender?: string | null
          has_received_uniform?: boolean | null
          health_doc_url?: string | null
          id?: string
          notes?: string | null
          school_id: string
          status?: string | null
          uniform_received_at?: string | null
        }
        Update: {
          birth_date?: string | null
          blood_type?: string | null
          consent_doc_url?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          full_name?: string
          gender?: string | null
          has_received_uniform?: boolean | null
          health_doc_url?: string | null
          id?: string
          notes?: string | null
          school_id?: string
          status?: string | null
          uniform_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_channels: {
        Row: {
          created_at: string
          display_phone: string | null
          id: string
          phone_number_id: string
          provider: string
          school_id: string
          status: string
          template_config: Json
          updated_at: string
          waba_account_id: string
        }
        Insert: {
          created_at?: string
          display_phone?: string | null
          id?: string
          phone_number_id: string
          provider?: string
          school_id: string
          status?: string
          template_config?: Json
          updated_at?: string
          waba_account_id: string
        }
        Update: {
          created_at?: string
          display_phone?: string | null
          id?: string
          phone_number_id?: string
          provider?: string
          school_id?: string
          status?: string
          template_config?: Json
          updated_at?: string
          waba_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_channels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          channel_id: string
          created_at: string
          guardian_id: string | null
          human_handoff_reason: string | null
          id: string
          school_id: string
          sender_wa_id: string
          service_window_expires_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          guardian_id?: string | null
          human_handoff_reason?: string | null
          id?: string
          school_id: string
          sender_wa_id: string
          service_window_expires_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          guardian_id?: string | null
          human_handoff_reason?: string | null
          id?: string
          school_id?: string
          sender_wa_id?: string
          service_window_expires_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_inbound_jobs: {
        Row: {
          attempt_count: number
          channel_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_type: string
          last_error_code: string | null
          locked_at: string | null
          message_id: string
          next_attempt_at: string | null
          payload: Json
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type: string
          last_error_code?: string | null
          locked_at?: string | null
          message_id: string
          next_attempt_at?: string | null
          payload?: Json
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type?: string
          last_error_code?: string | null
          locked_at?: string | null
          message_id?: string
          next_attempt_at?: string | null
          payload?: Json
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_inbound_jobs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_inbound_jobs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_inbound_jobs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          channel_id: string
          conversation_id: string | null
          created_at: string
          delivery_status: string
          direction: string
          id: string
          media_id: string | null
          message_type: string
          metadata: Json
          occurred_at: string
          provider_message_id: string
          school_id: string
        }
        Insert: {
          channel_id: string
          conversation_id?: string | null
          created_at?: string
          delivery_status?: string
          direction: string
          id?: string
          media_id?: string | null
          message_type: string
          metadata?: Json
          occurred_at: string
          provider_message_id: string
          school_id: string
        }
        Update: {
          channel_id?: string
          conversation_id?: string | null
          created_at?: string
          delivery_status?: string
          direction?: string
          id?: string
          media_id?: string | null
          message_type?: string
          metadata?: Json
          occurred_at?: string
          provider_message_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_basic_view: {
        Row: {
          birth_date: string | null
          created_at: string | null
          enrollment_date: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          school_id: string | null
          status: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          school_id?: string | null
          status?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          school_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_coach_invitation: { Args: never; Returns: boolean }
      app_current_role: { Args: never; Returns: string }
      archive_staff_record: {
        Args: { p_staff_id: string }
        Returns: {
          created_at: string | null
          full_name: string
          hire_date: string | null
          id: string
          invitation_accepted_at: string | null
          invitation_email: string | null
          invitation_last_error: string | null
          invitation_sent_at: string | null
          invitation_status: string
          is_active: boolean | null
          monthly_salary: number | null
          notes: string | null
          profile_id: string | null
          school_id: string
          staff_type: string
        }
        SetofOptions: {
          from: "*"
          to: "staff"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_integration_outbox: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          channel_id: string | null
          created_at: string
          event_key: string
          guardian_id: string | null
          id: string
          last_error_code: string | null
          locked_at: string | null
          next_attempt_at: string | null
          payload: Json
          purpose_code: string
          school_id: string
          sent_at: string | null
          status: string
          suppression_reason: string | null
          template_name: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "integration_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_receipt_cleanup: {
        Args: { p_limit?: number }
        Returns: {
          channel_id: string
          cleaned_at: string | null
          cleanup_attempts: number
          cleanup_last_error: string | null
          cleanup_locked_at: string | null
          cleanup_next_attempt_at: string | null
          content_sha256: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          guardian_id: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          match_confidence: number | null
          message_id: string
          mime_type: string | null
          payment_id: string | null
          school_id: string
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string | null
          student_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "receipt_submissions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_whatsapp_inbound_jobs: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          channel_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_type: string
          last_error_code: string | null
          locked_at: string | null
          message_id: string
          next_attempt_at: string | null
          payload: Json
          school_id: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_inbound_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_integration_outbox: {
        Args: {
          p_accepted_at: string
          p_outbox_id: string
          p_provider_message_id: string
        }
        Returns: undefined
      }
      complete_receipt_cleanup: {
        Args: { p_submission_id: string }
        Returns: undefined
      }
      complete_whatsapp_inbound_job: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      create_student_with_guardian: {
        Args: {
          p_birth_date: string
          p_blood_type: string
          p_enrollment_date: string
          p_full_name: string
          p_gender: string
          p_group_id: string
          p_guardian_name: string
          p_guardian_phone_e164: string
          p_notes: string
        }
        Returns: string
      }
      current_school_id: { Args: never; Returns: string }
      enqueue_due_aidat_reminders: {
        Args: { p_today?: string }
        Returns: number
      }
      fail_integration_outbox: {
        Args: {
          p_error_code: string
          p_outbox_id: string
          p_retryable?: boolean
        }
        Returns: undefined
      }
      fail_receipt_cleanup: {
        Args: { p_error_code: string; p_submission_id: string }
        Returns: undefined
      }
      fail_whatsapp_inbound_job: {
        Args: { p_error_code: string; p_job_id: string; p_retryable?: boolean }
        Returns: undefined
      }
      finalize_whatsapp_receipt_media: {
        Args: {
          p_content_sha256: string
          p_mime_type: string
          p_size_bytes: number
          p_storage_path: string
          p_submission_id: string
        }
        Returns: Json
      }
      generate_daily_sessions: {
        Args: { target_date?: string }
        Returns: number
      }
      generate_monthly_aidat: {
        Args: { target_month: number; target_year: number }
        Returns: number
      }
      generate_sessions_for_range: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      generate_tomorrow_sessions: { Args: never; Returns: number }
      get_receipt_selection_options: {
        Args: { p_submission_id: string }
        Returns: Json
      }
      get_student_school: { Args: { p_student_id: string }; Returns: string }
      ingest_whatsapp_message: {
        Args: {
          p_interactive_reply_id?: string
          p_is_stop_request?: boolean
          p_media_id?: string
          p_message_type: string
          p_occurred_at: string
          p_phone_number_id: string
          p_provider_message_id: string
          p_sender_wa_id: string
        }
        Returns: Json
      }
      is_coach_for_group: { Args: { group_id_param: string }; Returns: boolean }
      is_sg_in_school: { Args: { p_group_id: string }; Returns: boolean }
      link_guardian_to_student: {
        Args: {
          p_full_name: string
          p_is_primary?: boolean
          p_phone_e164: string
          p_relation?: string
          p_student_id: string
        }
        Returns: string
      }
      match_receipt_submission: {
        Args: {
          p_invoice_id: string
          p_invoice_type: string
          p_submission_id: string
        }
        Returns: {
          channel_id: string
          cleaned_at: string | null
          cleanup_attempts: number
          cleanup_last_error: string | null
          cleanup_locked_at: string | null
          cleanup_next_attempt_at: string | null
          content_sha256: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          guardian_id: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          match_confidence: number | null
          message_id: string
          mime_type: string | null
          payment_id: string | null
          school_id: string
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string | null
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "receipt_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_manual_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_invoice_type: string
          p_notes: string
          p_payment_method: string
          p_student_id: string
        }
        Returns: string
      }
      record_whatsapp_delivery_status: {
        Args: {
          p_delivery_status: string
          p_error_code?: string
          p_occurred_at: string
          p_phone_number_id: string
          p_provider_message_id: string
        }
        Returns: boolean
      }
      retry_receipt_cleanup: {
        Args: { p_submission_id: string }
        Returns: {
          channel_id: string
          cleaned_at: string | null
          cleanup_attempts: number
          cleanup_last_error: string | null
          cleanup_locked_at: string | null
          cleanup_next_attempt_at: string | null
          content_sha256: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          guardian_id: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          match_confidence: number | null
          message_id: string
          mime_type: string | null
          payment_id: string | null
          school_id: string
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string | null
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "receipt_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_receipt_submission: {
        Args: {
          p_amount?: number
          p_decision: string
          p_payment_method?: string
          p_reason?: string
          p_submission_id: string
        }
        Returns: {
          channel_id: string
          cleaned_at: string | null
          cleanup_attempts: number
          cleanup_last_error: string | null
          cleanup_locked_at: string | null
          cleanup_next_attempt_at: string | null
          content_sha256: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          guardian_id: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          match_confidence: number | null
          message_id: string
          mime_type: string | null
          payment_id: string | null
          school_id: string
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string | null
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "receipt_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      select_whatsapp_receipt_invoice: {
        Args: {
          p_invoice_id: string
          p_invoice_type: string
          p_message_id: string
          p_submission_id: string
        }
        Returns: {
          channel_id: string
          cleaned_at: string | null
          cleanup_attempts: number
          cleanup_last_error: string | null
          cleanup_locked_at: string | null
          cleanup_next_attempt_at: string | null
          content_sha256: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_reason: string | null
          guardian_id: string | null
          id: string
          invoice_id: string | null
          invoice_type: string | null
          match_confidence: number | null
          message_id: string
          mime_type: string | null
          payment_id: string | null
          school_id: string
          size_bytes: number | null
          status: string
          storage_bucket: string
          storage_path: string | null
          student_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "receipt_submissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suppress_integration_outbox: {
        Args: { p_outbox_id: string; p_reason: string }
        Returns: undefined
      }
      transition_application: {
        Args: { p_application_id: string; p_note?: string; p_to_status: string }
        Returns: {
          applicant_full_name: string
          birth_date: string | null
          created_at: string | null
          enrolled_student_id: string | null
          id: string
          notes: string | null
          parent_full_name: string
          parent_phone: string
          school_id: string
          source: string | null
          status: string
          trial_group_id: string | null
          trial_session_date: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_manual_payment: {
        Args: {
          p_amount: number
          p_notes: string
          p_payment_id: string
          p_payment_method: string
        }
        Returns: undefined
      }
      update_staff_record: {
        Args: {
          p_full_name: string
          p_is_active: boolean
          p_monthly_salary: number
          p_phone_e164?: string
          p_staff_id: string
          p_staff_type: string
        }
        Returns: {
          created_at: string | null
          full_name: string
          hire_date: string | null
          id: string
          invitation_accepted_at: string | null
          invitation_email: string | null
          invitation_last_error: string | null
          invitation_sent_at: string | null
          invitation_status: string
          is_active: boolean | null
          monthly_salary: number | null
          notes: string | null
          profile_id: string | null
          school_id: string
          staff_type: string
        }
        SetofOptions: {
          from: "*"
          to: "staff"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_manual_payment: {
        Args: { p_payment_id: string; p_reason: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

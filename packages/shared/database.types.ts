export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: { [_ in never]: never }
    Views: { [_ in never]: never }
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json }
        Returns: Json
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
  public: {
    Tables: {
      schools: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          contact_phone: string | null
          address: string | null
          default_aidat_amount: number | null
          default_uniform_amount: number | null
          subscription_status: string | null
          subscription_starts_at: string | null
          subscription_ends_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string; name: string; slug: string
          logo_url?: string | null; contact_phone?: string | null; address?: string | null
          default_aidat_amount?: number | null; default_uniform_amount?: number | null
          subscription_status?: string | null
          subscription_starts_at?: string | null; subscription_ends_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['schools']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          school_id: string | null
          role: string
          full_name: string
          phone: string
          email: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string; role: string; full_name: string; phone: string
          school_id?: string | null; email?: string | null
          is_active?: boolean | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: [
          { foreignKeyName: "profiles_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] }
        ]
      }
      students: {
        Row: {
          id: string
          school_id: string
          full_name: string
          birth_date: string | null
          gender: string | null
          blood_type: string | null
          notes: string | null
          enrollment_date: string | null
          status: string | null
          health_doc_url: string | null
          consent_doc_url: string | null
          has_received_uniform: boolean | null
          uniform_received_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; full_name: string
          birth_date?: string | null; gender?: string | null; blood_type?: string | null
          notes?: string | null; enrollment_date?: string | null; status?: string | null
          health_doc_url?: string | null; consent_doc_url?: string | null
          has_received_uniform?: boolean | null; uniform_received_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['students']['Insert']>
        Relationships: [
          { foreignKeyName: "students_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] }
        ]
      }
      parent_student: {
        Row: {
          parent_profile_id: string
          student_id: string
          relation: string | null
          is_primary: boolean | null
          created_at: string | null
        }
        Insert: {
          parent_profile_id: string; student_id: string
          relation?: string | null; is_primary?: boolean | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['parent_student']['Insert']>
        Relationships: [
          { foreignKeyName: "parent_student_parent_profile_id_fkey"; columns: ["parent_profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "parent_student_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ]
      }
      staff: {
        Row: {
          id: string
          school_id: string
          profile_id: string | null
          full_name: string
          staff_type: string
          monthly_salary: number | null
          hire_date: string | null
          is_active: boolean | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; full_name: string; staff_type: string
          profile_id?: string | null; monthly_salary?: number | null
          hire_date?: string | null; is_active?: boolean | null
          notes?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['staff']['Insert']>
        Relationships: [
          { foreignKeyName: "staff_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
          { foreignKeyName: "staff_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      staff_salary_payments: {
        Row: {
          id: string; school_id: string; staff_id: string
          period_year: number; period_month: number
          amount: number; paid_at: string | null
          payment_method: string | null; notes: string | null
        }
        Insert: {
          id?: string; school_id: string; staff_id: string
          period_year: number; period_month: number; amount: number
          paid_at?: string | null; payment_method?: string | null; notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['staff_salary_payments']['Insert']>
        Relationships: [
          { foreignKeyName: "staff_salary_payments_staff_id_fkey"; columns: ["staff_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] }
        ]
      }
      groups: {
        Row: {
          id: string
          school_id: string
          name: string
          age_min: number | null
          age_max: number | null
          capacity: number | null
          primary_coach_id: string | null
          monthly_fee: number | null
          category: string
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; name: string
          age_min?: number | null; age_max?: number | null; capacity?: number | null
          primary_coach_id?: string | null; monthly_fee?: number | null
          category?: string
          is_active?: boolean | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['groups']['Insert']>
        Relationships: [
          { foreignKeyName: "groups_school_id_fkey"; columns: ["school_id"]; isOneToOne: false; referencedRelation: "schools"; referencedColumns: ["id"] },
          { foreignKeyName: "groups_primary_coach_id_fkey"; columns: ["primary_coach_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] }
        ]
      }
      group_schedule_slots: {
        Row: {
          id: string; group_id: string
          day_of_week: number; start_time: string; end_time: string
          created_at: string | null
        }
        Insert: {
          id?: string; group_id: string
          day_of_week: number; start_time: string; end_time: string
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['group_schedule_slots']['Insert']>
        Relationships: [
          { foreignKeyName: "group_schedule_slots_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "groups"; referencedColumns: ["id"] }
        ]
      }
      student_groups: {
        Row: {
          id: string; student_id: string; group_id: string
          joined_at: string | null; left_at: string | null; is_active: boolean | null
        }
        Insert: {
          id?: string; student_id: string; group_id: string
          joined_at?: string | null; left_at?: string | null; is_active?: boolean | null
        }
        Update: Partial<Database['public']['Tables']['student_groups']['Insert']>
        Relationships: [
          { foreignKeyName: "student_groups_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "student_groups_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "groups"; referencedColumns: ["id"] }
        ]
      }
      attendance_sessions: {
        Row: {
          id: string; school_id: string; group_id: string
          session_date: string; start_time: string; end_time: string
          status: string | null; cancellation_reason: string | null
          cancelled_by: string | null; cancelled_at: string | null
          taken_by: string | null; taken_at: string | null; notes: string | null
        }
        Insert: {
          id?: string; school_id: string; group_id: string
          session_date: string; start_time: string; end_time: string
          status?: string | null; cancellation_reason?: string | null
          cancelled_by?: string | null; cancelled_at?: string | null
          taken_by?: string | null; taken_at?: string | null; notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['attendance_sessions']['Insert']>
        Relationships: [
          { foreignKeyName: "attendance_sessions_group_id_fkey"; columns: ["group_id"]; isOneToOne: false; referencedRelation: "groups"; referencedColumns: ["id"] }
        ]
      }
      attendance_records: {
        Row: {
          id: string; session_id: string; student_id: string
          status: string; recorded_at: string | null
        }
        Insert: {
          id?: string; session_id: string; student_id: string
          status: string; recorded_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['attendance_records']['Insert']>
        Relationships: [
          { foreignKeyName: "attendance_records_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "attendance_sessions"; referencedColumns: ["id"] },
          { foreignKeyName: "attendance_records_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ]
      }
      leave_requests: {
        Row: {
          id: string; school_id: string; student_id: string
          parent_profile_id: string | null; session_date: string
          group_id: string | null; reason: string | null
          status: string | null; created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; student_id: string
          parent_profile_id?: string | null; session_date: string
          group_id?: string | null; reason?: string | null
          status?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>
        Relationships: [
          { foreignKeyName: "leave_requests_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ]
      }
      aidat_invoices: {
        Row: {
          id: string; school_id: string; student_id: string
          period_year: number; period_month: number
          amount: number; is_prorated: boolean | null
          due_date: string; paid_amount: number | null
          status: string | null; notes: string | null; created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; student_id: string
          period_year: number; period_month: number; amount: number
          is_prorated?: boolean | null; due_date: string
          paid_amount?: number | null; status?: string | null
          notes?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['aidat_invoices']['Insert']>
        Relationships: [
          { foreignKeyName: "aidat_invoices_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ]
      }
      equipment_invoices: {
        Row: {
          id: string; school_id: string; student_id: string
          description: string | null; amount: number
          paid_amount: number | null; status: string | null
          delivered: boolean | null; delivered_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; student_id: string
          description?: string | null; amount: number
          paid_amount?: number | null; status?: string | null
          delivered?: boolean | null; delivered_at?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['equipment_invoices']['Insert']>
        Relationships: [
          { foreignKeyName: "equipment_invoices_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] }
        ]
      }
      payments: {
        Row: {
          id: string; school_id: string; student_id: string
          invoice_type: string; invoice_id: string; amount: number
          payment_method: string; payment_date: string | null
          receipt_url: string | null; received_by: string | null
          notes: string | null; created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; student_id: string
          invoice_type: string; invoice_id: string; amount: number
          payment_method: string; payment_date?: string | null
          receipt_url?: string | null; received_by?: string | null
          notes?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: []
      }
      applications: {
        Row: {
          id: string; school_id: string; applicant_full_name: string
          birth_date: string | null; parent_full_name: string
          parent_phone: string; source: string | null; status: string
          trial_session_date: string | null; trial_group_id: string | null
          notes: string | null; enrolled_student_id: string | null
          created_at: string | null; updated_at: string | null
        }
        Insert: {
          id?: string; school_id: string; applicant_full_name: string
          parent_full_name: string; parent_phone: string; status?: string
          birth_date?: string | null; source?: string | null
          trial_session_date?: string | null; trial_group_id?: string | null
          notes?: string | null; enrolled_student_id?: string | null
          created_at?: string | null; updated_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
        Relationships: []
      }
      application_status_history: {
        Row: {
          id: string; application_id: string | null
          from_status: string | null; to_status: string | null
          note: string | null; changed_by: string | null; changed_at: string | null
        }
        Insert: {
          id?: string; application_id?: string | null
          from_status?: string | null; to_status?: string | null
          note?: string | null; changed_by?: string | null; changed_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['application_status_history']['Insert']>
        Relationships: []
      }
      expenses: {
        Row: {
          id: string; school_id: string; category: string
          description: string | null; amount: number
          expense_date: string | null; paid_to: string | null
          receipt_url: string | null; created_by: string | null; created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; category: string; amount: number
          description?: string | null; expense_date?: string | null
          paid_to?: string | null; receipt_url?: string | null
          created_by?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
        Relationships: []
      }
      notification_templates: {
        Row: {
          id: string; school_id: string | null; code: string
          channel: string; body_template: string
          is_active: boolean | null; created_at: string | null
        }
        Insert: {
          id?: string; school_id?: string | null; code: string
          channel: string; body_template: string
          is_active?: boolean | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['notification_templates']['Insert']>
        Relationships: []
      }
      notification_log: {
        Row: {
          id: string; school_id: string
          recipient_profile_id: string | null; recipient_phone: string | null
          channel: string; template_code: string | null
          body_rendered: string | null; status: string | null
          error_message: string | null; related_entity_type: string | null
          related_entity_id: string | null; sent_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string; school_id: string; channel: string
          recipient_profile_id?: string | null; recipient_phone?: string | null
          template_code?: string | null; body_rendered?: string | null
          status?: string | null; error_message?: string | null
          related_entity_type?: string | null; related_entity_id?: string | null
          sent_at?: string | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['notification_log']['Insert']>
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string; school_id: string | null
          actor_profile_id: string | null; action: string
          entity_type: string | null; entity_id: string | null
          diff: Json | null; created_at: string | null
        }
        Insert: {
          id?: string; school_id?: string | null
          actor_profile_id?: string | null; action: string
          entity_type?: string | null; entity_id?: string | null
          diff?: Json | null; created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_school_id: { Args: Record<never, never>; Returns: string }
      app_current_role: { Args: Record<never, never>; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
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
  graphql_public: { Enums: {} },
  public: { Enums: {} },
} as const

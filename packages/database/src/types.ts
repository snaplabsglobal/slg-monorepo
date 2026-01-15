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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      billing_milestones: {
        Row: {
          amount: number | null
          created_at: string | null
          due_date: string | null
          id: string
          milestone_name: string
          org_id: string
          percentage: number | null
          project_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name: string
          org_id: string
          percentage?: number | null
          project_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          org_id?: string
          percentage?: number | null
          project_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "billing_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          amount_change: number | null
          client_signature_url: string | null
          created_at: string | null
          description: string | null
          formatted_id: string | null
          id: string
          org_id: string
          project_id: string
          signed_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount_change?: number | null
          client_signature_url?: string | null
          created_at?: string | null
          description?: string | null
          formatted_id?: string | null
          id?: string
          org_id: string
          project_id: string
          signed_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount_change?: number | null
          client_signature_url?: string | null
          created_at?: string | null
          description?: string | null
          formatted_id?: string | null
          id?: string
          org_id?: string
          project_id?: string
          signed_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      deficiencies: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          description: string
          id: string
          org_id: string
          photo_after_url: string | null
          photo_before_url: string | null
          priority: string | null
          project_id: string
          resolved_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          description: string
          id?: string
          org_id: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          priority?: string | null
          project_id: string
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          description?: string
          id?: string
          org_id?: string
          photo_after_url?: string | null
          photo_before_url?: string | null
          priority?: string | null
          project_id?: string
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deficiencies_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deficiencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "deficiencies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address_line1: string | null
          city: string | null
          created_at: string | null
          emergency_contact: Json | null
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_diy_hero: boolean | null
          org_id: string
          ot_multiplier: number | null
          overtime_enabled: boolean | null
          phone: string | null
          postal_code: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          created_at?: string | null
          emergency_contact?: Json | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_diy_hero?: boolean | null
          org_id: string
          ot_multiplier?: number | null
          overtime_enabled?: boolean | null
          phone?: string | null
          postal_code?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          created_at?: string | null
          emergency_contact?: Json | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_diy_hero?: boolean | null
          org_id?: string
          ot_multiplier?: number | null
          overtime_enabled?: boolean | null
          phone?: string | null
          postal_code?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          physical_address: string | null
          plan: string | null
          plan_type: string | null
          primary_email: string | null
          primary_phone: string | null
          usage_metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          physical_address?: string | null
          plan?: string | null
          plan_type?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          usage_metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          physical_address?: string | null
          plan?: string | null
          plan_type?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          usage_metadata?: Json | null
        }
        Relationships: []
      }
      payrolls: {
        Row: {
          bonus: number | null
          created_at: string | null
          employee_id: string
          gross_pay: number | null
          id: string
          net_pay: number | null
          org_id: string
          period_end: string
          period_start: string
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          bonus?: number | null
          created_at?: string | null
          employee_id: string
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          org_id: string
          period_end: string
          period_start: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          bonus?: number | null
          created_at?: string | null
          employee_id?: string
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          org_id?: string
          period_end?: string
          period_start?: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          persona: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          persona?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          persona?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          address: string | null
          client_org_id: string | null
          created_at: string | null
          id: string
          is_diy: boolean | null
          metadata: Json | null
          name: string
          organization_id: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          client_org_id?: string | null
          created_at?: string | null
          id?: string
          is_diy?: boolean | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          client_org_id?: string | null
          created_at?: string | null
          id?: string
          is_diy?: boolean | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_org_id_fkey"
            columns: ["client_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_assets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_logs: {
        Row: {
          checklist_data: Json | null
          conducted_by: string | null
          created_at: string | null
          id: string
          incident_reported: boolean | null
          log_date: string
          org_id: string
          project_id: string
          updated_at: string | null
          weather_notes: string | null
        }
        Insert: {
          checklist_data?: Json | null
          conducted_by?: string | null
          created_at?: string | null
          id?: string
          incident_reported?: boolean | null
          log_date?: string
          org_id: string
          project_id: string
          updated_at?: string | null
          weather_notes?: string | null
        }
        Update: {
          checklist_data?: Json | null
          conducted_by?: string | null
          created_at?: string | null
          id?: string
          incident_reported?: boolean | null
          log_date?: string
          org_id?: string
          project_id?: string
          updated_at?: string | null
          weather_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_logs_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "safety_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          billing_address: string | null
          business_number: string | null
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          email: string | null
          gst_number: string | null
          gst_verified_at: string | null
          id: string
          is_active: boolean | null
          legal_name: string | null
          org_id: string
          payment_terms: string | null
          phone: string | null
          primary_contact_name: string | null
          recipient_type: string | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          business_number?: string | null
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          gst_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          org_id: string
          payment_terms?: string | null
          phone?: string | null
          primary_contact_name?: string | null
          recipient_type?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          business_number?: string | null
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          email?: string | null
          gst_number?: string | null
          gst_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          org_id?: string
          payment_terms?: string | null
          phone?: string | null
          primary_contact_name?: string | null
          recipient_type?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_duration: number | null
          created_at: string | null
          description: string | null
          employee_id: string
          end_time: string
          id: string
          period_date: string | null
          project_id: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          break_duration?: number | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          end_time: string
          id?: string
          period_date?: string | null
          project_id?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          break_duration?: number | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          end_time?: string
          id?: string
          period_date?: string | null
          project_id?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          amount: number | null
          category_tax: string | null
          created_at: string | null
          description: string | null
          id: string
          quantity: number | null
          transaction_id: string
          unit_price: number | null
        }
        Insert: {
          amount?: number | null
          category_tax?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          quantity?: number | null
          transaction_id: string
          unit_price?: number | null
        }
        Update: {
          amount?: number | null
          category_tax?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          quantity?: number | null
          transaction_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          ai_confidence: number | null
          attachment_url: string | null
          base_amount: number | null
          category_tax: string | null
          category_user: string | null
          created_at: string | null
          currency: string | null
          deductible_rate: number | null
          direction: string | null
          entry_source: string | null
          exchange_rate: number | null
          expense_type: string | null
          id: string
          image_hash: string | null
          internal_notes: string | null
          is_capital_asset: boolean | null
          is_reimbursable: boolean | null
          is_tax_deductible: boolean | null
          needs_review: boolean | null
          org_id: string
          payment_status: string | null
          project_id: string | null
          raw_data: Json | null
          source_app: string | null
          status: string | null
          subcontractor_id: string | null
          tax_amount: number | null
          tax_details: Json | null
          total_amount: number
          transaction_date: string
          updated_at: string | null
          user_id: string | null
          vendor_name: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          ai_confidence?: number | null
          attachment_url?: string | null
          base_amount?: number | null
          category_tax?: string | null
          category_user?: string | null
          created_at?: string | null
          currency?: string | null
          deductible_rate?: number | null
          direction?: string | null
          entry_source?: string | null
          exchange_rate?: number | null
          expense_type?: string | null
          id?: string
          image_hash?: string | null
          internal_notes?: string | null
          is_capital_asset?: boolean | null
          is_reimbursable?: boolean | null
          is_tax_deductible?: boolean | null
          needs_review?: boolean | null
          org_id: string
          payment_status?: string | null
          project_id?: string | null
          raw_data?: Json | null
          source_app?: string | null
          status?: string | null
          subcontractor_id?: string | null
          tax_amount?: number | null
          tax_details?: Json | null
          total_amount: number
          transaction_date: string
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          ai_confidence?: number | null
          attachment_url?: string | null
          base_amount?: number | null
          category_tax?: string | null
          category_user?: string | null
          created_at?: string | null
          currency?: string | null
          deductible_rate?: number | null
          direction?: string | null
          entry_source?: string | null
          exchange_rate?: number | null
          expense_type?: string | null
          id?: string
          image_hash?: string | null
          internal_notes?: string | null
          is_capital_asset?: boolean | null
          is_reimbursable?: boolean | null
          is_tax_deductible?: boolean | null
          needs_review?: boolean | null
          org_id?: string
          payment_status?: string | null
          project_id?: string | null
          raw_data?: Json | null
          source_app?: string | null
          status?: string | null
          subcontractor_id?: string | null
          tax_amount?: number | null
          tax_details?: Json | null
          total_amount?: number
          transaction_date?: string
          updated_at?: string | null
          user_id?: string | null
          vendor_name?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_financials_summary"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          organization_id: string | null
          resolved_name: string
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          resolved_name: string
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          organization_id?: string | null
          resolved_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_aliases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      project_financials_summary: {
        Row: {
          cost_labor: number | null
          cost_materials: number | null
          project_id: string | null
          project_name: string | null
          total_hours_worked: number | null
          total_project_cost: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_bc_labor_cost:
        | {
            Args: { duration_minutes: number; hourly_rate: number }
            Returns: number
          }
        | {
            Args: {
              duration_minutes: number
              hourly_rate: number
              overtime_enabled?: boolean
            }
            Returns: number
          }
        | {
            Args: {
              duration_minutes: number
              hourly_rate: number
              is_diy_hero?: boolean
              overtime_enabled?: boolean
            }
            Returns: number
          }
    }
    Enums: {
      entry_source_enum: "ocr" | "manual" | "bank"
      expense_type_enum: "business" | "personal" | "mixed"
      payment_status_enum: "unpaid" | "paid" | "partial"
      transaction_direction: "income" | "expense"
      transaction_status: "pending" | "verified" | "void"
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
      entry_source_enum: ["ocr", "manual", "bank"],
      expense_type_enum: ["business", "personal", "mixed"],
      payment_status_enum: ["unpaid", "paid", "partial"],
      transaction_direction: ["income", "expense"],
      transaction_status: ["pending", "verified", "void"],
    },
  },
} as const

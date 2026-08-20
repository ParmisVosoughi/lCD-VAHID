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
      backup_snapshots: {
        Row: {
          checksum: string | null
          created_at: string
          created_by: string | null
          id: string
          record_counts: Json | null
          size_bytes: number | null
          snapshot_data: Json
          snapshot_type: string
          status: string
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          record_counts?: Json | null
          size_bytes?: number | null
          snapshot_data: Json
          snapshot_type: string
          status?: string
        }
        Update: {
          checksum?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          record_counts?: Json | null
          size_bytes?: number | null
          snapshot_data?: Json
          snapshot_type?: string
          status?: string
        }
        Relationships: []
      }
      daily_currency_rates: {
        Row: {
          created_at: string
          currency: string
          id: string
          rate: number
          rate_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          rate: number
          rate_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          rate?: number
          rate_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          invoice_id: string
          invoice_unit_price: number
          item_category: string | null
          line_total: number
          original_product_price: number
          product_id: string | null
          product_title: string
          quantity: number
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          invoice_id: string
          invoice_unit_price?: number
          item_category?: string | null
          line_total?: number
          original_product_price?: number
          product_id?: string | null
          product_title: string
          quantity?: number
          variant_id?: string | null
          variant_name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          invoice_id?: string
          invoice_unit_price?: number
          item_category?: string | null
          line_total?: number
          original_product_price?: number
          product_id?: string | null
          product_title?: string
          quantity?: number
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_name: string
          gregorian_date: string
          id: string
          invoice_number: string
          jalali_date: string
          payment_method: string | null
          print_copies: number
          print_format: string
          printed_time: string
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          customer_name: string
          gregorian_date: string
          id?: string
          invoice_number: string
          jalali_date: string
          payment_method?: string | null
          print_copies?: number
          print_format?: string
          printed_time: string
          status?: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          customer_name?: string
          gregorian_date?: string
          id?: string
          invoice_number?: string
          jalali_date?: string
          payment_method?: string | null
          print_copies?: number
          print_format?: string
          printed_time?: string
          status?: string
          total_amount?: number
        }
        Relationships: []
      }
      market_rate_history: {
        Row: {
          asset_code: string
          created_at: string
          fetched_at: string
          id: string
          rate_in_rial: number
          source_name: string
          unit_label: string
        }
        Insert: {
          asset_code: string
          created_at?: string
          fetched_at: string
          id?: string
          rate_in_rial: number
          source_name: string
          unit_label: string
        }
        Update: {
          asset_code?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rate_in_rial?: number
          source_name?: string
          unit_label?: string
        }
        Relationships: []
      }
      market_rates: {
        Row: {
          asset_code: string
          asset_name: string
          asset_type: string
          change_amount: number | null
          change_percent: number | null
          created_at: string
          fetched_at: string
          id: string
          previous_rate_in_rial: number | null
          rate_in_rial: number
          source_name: string
          unit_label: string
          updated_at: string
        }
        Insert: {
          asset_code: string
          asset_name: string
          asset_type: string
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          previous_rate_in_rial?: number | null
          rate_in_rial: number
          source_name: string
          unit_label: string
          updated_at?: string
        }
        Update: {
          asset_code?: string
          asset_name?: string
          asset_type?: string
          change_amount?: number | null
          change_percent?: number | null
          created_at?: string
          fetched_at?: string
          id?: string
          previous_rate_in_rial?: number | null
          rate_in_rial?: number
          source_name?: string
          unit_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_price_history: {
        Row: {
          change_source: string
          changed_at: string
          id: string
          new_price: number
          old_price: number | null
          percentage_change: number | null
          product_id: string
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          change_source?: string
          changed_at?: string
          id?: string
          new_price: number
          old_price?: number | null
          percentage_change?: number | null
          product_id: string
          variant_id?: string | null
          variant_name: string
        }
        Update: {
          change_source?: string
          changed_at?: string
          id?: string
          new_price?: number
          old_price?: number | null
          percentage_change?: number | null
          product_id?: string
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          badge_color: string
          created_at: string
          display_order: number
          id: string
          key_number: number
          price: number
          price_updated_at: string | null
          product_id: string
          purchase_calculated_at: string | null
          purchase_currency: string | null
          purchase_exchange_rate: number | null
          purchase_price: number | null
          shipping_cost_rial: number | null
          text_color: string
          variant_name: string
        }
        Insert: {
          badge_color?: string
          created_at?: string
          display_order?: number
          id?: string
          key_number?: number
          price?: number
          price_updated_at?: string | null
          product_id: string
          purchase_calculated_at?: string | null
          purchase_currency?: string | null
          purchase_exchange_rate?: number | null
          purchase_price?: number | null
          shipping_cost_rial?: number | null
          text_color?: string
          variant_name: string
        }
        Update: {
          badge_color?: string
          created_at?: string
          display_order?: number
          id?: string
          key_number?: number
          price?: number
          price_updated_at?: string | null
          product_id?: string
          purchase_calculated_at?: string | null
          purchase_currency?: string | null
          purchase_exchange_rate?: number | null
          purchase_price?: number | null
          shipping_cost_rial?: number | null
          text_color?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          show_thumbnail: boolean
          thumbnail_url: string | null
          title: string
          updated_at: string
          website_product_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          show_thumbnail?: boolean
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          website_product_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          show_thumbnail?: boolean
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          website_product_url?: string | null
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          client_operation_id: string
          created_at: string
          error_message: string | null
          id: string
          operation_type: string
          payload: Json
          processed_at: string | null
          result: Json | null
          retry_count: number
          status: string
          user_id: string | null
        }
        Insert: {
          client_operation_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type: string
          payload: Json
          processed_at?: string | null
          result?: Json | null
          retry_count?: number
          status?: string
          user_id?: string | null
        }
        Update: {
          client_operation_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type?: string
          payload?: Json
          processed_at?: string | null
          result?: Json | null
          retry_count?: number
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      upload_logs: {
        Row: {
          file_name: string
          id: string
          is_active: boolean | null
          note: string | null
          page_key: string
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          file_name: string
          id?: string
          is_active?: boolean | null
          note?: string | null
          page_key: string
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          file_name?: string
          id?: string
          is_active?: boolean | null
          note?: string | null
          page_key?: string
          storage_path?: string
          uploaded_at?: string | null
        }
        Relationships: []
      }
      variant_presets: {
        Row: {
          created_at: string
          id: string
          names: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          names?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          names?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      variant_replace_logs: {
        Row: {
          admin_user: string | null
          affected_count: number
          case_sensitive: boolean
          created_at: string
          id: string
          new_text: string
          old_text: string
          scope_type: string
          scope_value: string | null
        }
        Insert: {
          admin_user?: string | null
          affected_count?: number
          case_sensitive?: boolean
          created_at?: string
          id?: string
          new_text: string
          old_text: string
          scope_type?: string
          scope_value?: string | null
        }
        Update: {
          admin_user?: string | null
          affected_count?: number
          case_sensitive?: boolean
          created_at?: string
          id?: string
          new_text?: string
          old_text?: string
          scope_type?: string
          scope_value?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_percentage_to_category: {
        Args: {
          p_category: string
          p_direction: string
          p_percent: number
          p_round_unit?: number
        }
        Returns: number
      }
      apply_variant_replace: {
        Args: {
          p_case_sensitive: boolean
          p_new: string
          p_old: string
          p_scope_type: string
          p_scope_value: string
        }
        Returns: number
      }
      preview_variant_replace: {
        Args: {
          p_case_sensitive: boolean
          p_new: string
          p_old: string
          p_scope_type: string
          p_scope_value: string
        }
        Returns: {
          new_name: string
          old_name: string
          product_id: string
          product_title: string
          variant_id: string
        }[]
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
  public: {
    Enums: {},
  },
} as const

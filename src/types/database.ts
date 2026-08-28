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
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          active: boolean
          created_at: string
          id: string
          institution: string | null
          is_savings: boolean
          is_spend_account: boolean
          name: string
          role: string | null
          user_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          active?: boolean
          created_at?: string
          id?: string
          institution?: string | null
          is_savings?: boolean
          is_spend_account?: boolean
          name: string
          role?: string | null
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          active?: boolean
          created_at?: string
          id?: string
          institution?: string | null
          is_savings?: boolean
          is_spend_account?: boolean
          name?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_snapshots: {
        Row: {
          account_id: string
          actual_balance: number
          correcting_transaction_id: string | null
          date: string
          id: string
          tracked_balance_at_time: number
          user_id: string
        }
        Insert: {
          account_id: string
          actual_balance: number
          correcting_transaction_id?: string | null
          date: string
          id?: string
          tracked_balance_at_time: number
          user_id: string
        }
        Update: {
          account_id?: string
          actual_balance?: number
          correcting_transaction_id?: string | null
          date?: string
          id?: string
          tracked_balance_at_time?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_snapshots_correcting_transaction_id_fkey"
            columns: ["correcting_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          default_account_id: string | null
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          default_account_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          default_account_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_expenses: {
        Row: {
          id: string
          split_method: Database["public"]["Enums"]["split_method"]
          total_amount: number
          transaction_id: string
          user_id: string
        }
        Insert: {
          id?: string
          split_method: Database["public"]["Enums"]["split_method"]
          total_amount: number
          transaction_id: string
          user_id: string
        }
        Update: {
          id?: string
          split_method?: Database["public"]["Enums"]["split_method"]
          total_amount?: number
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_expenses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          exchange: string | null
          id: string
          name: string
          symbol: string | null
          user_id: string
          vehicle_type: Database["public"]["Enums"]["instrument_vehicle_type"]
        }
        Insert: {
          exchange?: string | null
          id?: string
          name: string
          symbol?: string | null
          user_id: string
          vehicle_type: Database["public"]["Enums"]["instrument_vehicle_type"]
        }
        Update: {
          exchange?: string | null
          id?: string
          name?: string
          symbol?: string | null
          user_id?: string
          vehicle_type?: Database["public"]["Enums"]["instrument_vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "instruments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      iou_entries: {
        Row: {
          amount_owed: number
          amount_settled: number
          date_incurred: string
          direction: Database["public"]["Enums"]["iou_direction"]
          group_expense_id: string | null
          id: string
          note: string | null
          person_name: string | null
          reimbursed_transaction_id: string | null
          status: Database["public"]["Enums"]["iou_status"]
          user_id: string
        }
        Insert: {
          amount_owed: number
          amount_settled?: number
          date_incurred: string
          direction: Database["public"]["Enums"]["iou_direction"]
          group_expense_id?: string | null
          id?: string
          note?: string | null
          person_name?: string | null
          reimbursed_transaction_id?: string | null
          status?: Database["public"]["Enums"]["iou_status"]
          user_id: string
        }
        Update: {
          amount_owed?: number
          amount_settled?: number
          date_incurred?: string
          direction?: Database["public"]["Enums"]["iou_direction"]
          group_expense_id?: string | null
          id?: string
          note?: string | null
          person_name?: string | null
          reimbursed_transaction_id?: string | null
          status?: Database["public"]["Enums"]["iou_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "iou_entries_group_expense_id_fkey"
            columns: ["group_expense_id"]
            isOneToOne: false
            referencedRelation: "group_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iou_entries_reimbursed_transaction_id_fkey"
            columns: ["reimbursed_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iou_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_templates: {
        Row: {
          account_id: string
          active: boolean
          amount: number
          category_id: string
          custom_interval_days: number | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          next_due_date: string
          user_id: string
        }
        Insert: {
          account_id: string
          active?: boolean
          amount: number
          category_id: string
          custom_interval_days?: number | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          kind: Database["public"]["Enums"]["category_kind"]
          next_due_date: string
          user_id: string
        }
        Update: {
          account_id?: string
          active?: boolean
          amount?: number
          category_id?: string
          custom_interval_days?: number | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          next_due_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_templates_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          instrument_id: string | null
          note: string | null
          quantity: number | null
          recurring_template_id: string | null
          refunded_transaction_id: string | null
          related_iou_entry_id: string | null
          to_account_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          id?: string
          instrument_id?: string | null
          note?: string | null
          quantity?: number | null
          recurring_template_id?: string | null
          refunded_transaction_id?: string | null
          related_iou_entry_id?: string | null
          to_account_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          instrument_id?: string | null
          note?: string | null
          quantity?: number | null
          recurring_template_id?: string | null
          refunded_transaction_id?: string | null
          related_iou_entry_id?: string | null
          to_account_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_template_id_fkey"
            columns: ["recurring_template_id"]
            isOneToOne: false
            referencedRelation: "recurring_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_refunded_transaction_id_fkey"
            columns: ["refunded_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_related_iou_entry_id_fkey"
            columns: ["related_iou_entry_id"]
            isOneToOne: false
            referencedRelation: "iou_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          google_id: string
          id: string
          name: string
          pin_hash: string | null
          privacy_mode_enabled: boolean
          timezone: string
        }
        Insert: {
          created_at?: string
          google_id: string
          id: string
          name: string
          pin_hash?: string | null
          privacy_mode_enabled?: boolean
          timezone?: string
        }
        Update: {
          created_at?: string
          google_id?: string
          id?: string
          name?: string
          pin_hash?: string | null
          privacy_mode_enabled?: boolean
          timezone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: "bank" | "credit_card"
      category_kind: "expense" | "income"
      instrument_vehicle_type: "equity" | "mutual_fund" | "ppf"
      iou_direction: "receivable" | "payable" | "reimbursement"
      iou_status: "pending" | "partial" | "settled" | "written_off"
      recurring_frequency: "monthly" | "quarterly" | "annual" | "custom"
      split_method: "equal" | "custom"
      transaction_type:
        | "expense"
        | "transfer"
        | "investment"
        | "income"
        | "iou_repayment"
        | "iou_settlement"
        | "refund"
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
    Enums: {
      account_type: ["bank", "credit_card"],
      category_kind: ["expense", "income"],
      instrument_vehicle_type: ["equity", "mutual_fund", "ppf"],
      iou_direction: ["receivable", "payable", "reimbursement"],
      iou_status: ["pending", "partial", "settled", "written_off"],
      recurring_frequency: ["monthly", "quarterly", "annual", "custom"],
      split_method: ["equal", "custom"],
      transaction_type: [
        "expense",
        "transfer",
        "investment",
        "income",
        "iou_repayment",
        "iou_settlement",
        "refund",
      ],
    },
  },
} as const


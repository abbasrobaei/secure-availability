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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string | null
          date: string
          end_date: string | null
          end_time: string | null
          id: string
          is_recurring: boolean | null
          location: string
          mobile_deployable: string | null
          notes: string | null
          shift_type: string | null
          start_time: string | null
          updated_at: string | null
          user_id: string | null
          weekdays: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location: string
          mobile_deployable?: string | null
          notes?: string | null
          shift_type?: string | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
          weekdays?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_recurring?: boolean | null
          location?: string
          mobile_deployable?: string | null
          notes?: string | null
          shift_type?: string | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
          weekdays?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bank_name: string | null
          birth_date: string | null
          birth_place: string | null
          city: string | null
          created_at: string | null
          e_pin_number: string | null
          email: string
          first_name: string | null
          guard_id_number: string | null
          health_insurance: string | null
          house_number: string | null
          iban: string | null
          id: string
          last_name: string | null
          nationality: string | null
          onboarding_completed: boolean | null
          personal_data_completed: boolean | null
          phone_number: string | null
          postal_code: string | null
          rules_acknowledged: boolean | null
          salutation: string | null
          social_security_number: string | null
          street: string | null
          tax_class: string | null
          tax_id: string | null
        }
        Insert: {
          bank_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          created_at?: string | null
          e_pin_number?: string | null
          email: string
          first_name?: string | null
          guard_id_number?: string | null
          health_insurance?: string | null
          house_number?: string | null
          iban?: string | null
          id: string
          last_name?: string | null
          nationality?: string | null
          onboarding_completed?: boolean | null
          personal_data_completed?: boolean | null
          phone_number?: string | null
          postal_code?: string | null
          rules_acknowledged?: boolean | null
          salutation?: string | null
          social_security_number?: string | null
          street?: string | null
          tax_class?: string | null
          tax_id?: string | null
        }
        Update: {
          bank_name?: string | null
          birth_date?: string | null
          birth_place?: string | null
          city?: string | null
          created_at?: string | null
          e_pin_number?: string | null
          email?: string
          first_name?: string | null
          guard_id_number?: string | null
          health_insurance?: string | null
          house_number?: string | null
          iban?: string | null
          id?: string
          last_name?: string | null
          nationality?: string | null
          onboarding_completed?: boolean | null
          personal_data_completed?: boolean | null
          phone_number?: string | null
          postal_code?: string | null
          rules_acknowledged?: boolean | null
          salutation?: string | null
          social_security_number?: string | null
          street?: string | null
          tax_class?: string | null
          tax_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const

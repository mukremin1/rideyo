export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          additional_driver_enabled: boolean | null
          additional_driver_fee: number | null
          additional_driver_license: string | null
          additional_driver_name: string | null
          car_id: string
          created_at: string | null
          different_zone_fee: number | null
          driver_history_checked: boolean | null
          driver_risk_level: string | null
          dropoff_address: string | null
          dropoff_zone_id: string | null
          end_time: string
          id: string
          payment_status: string | null
          pickup_address: string | null
          pickup_zone_id: string | null
          rental_type: string
          start_time: string
          total_price: number
          traffic_delay_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_driver_enabled?: boolean | null
          additional_driver_fee?: number | null
          additional_driver_license?: string | null
          additional_driver_name?: string | null
          car_id: string
          created_at?: string | null
          different_zone_fee?: number | null
          driver_history_checked?: boolean | null
          driver_risk_level?: string | null
          dropoff_address?: string | null
          dropoff_zone_id?: string | null
          end_time: string
          id?: string
          payment_status?: string | null
          pickup_address?: string | null
          pickup_zone_id?: string | null
          rental_type: string
          start_time: string
          total_price: number
          traffic_delay_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_driver_enabled?: boolean | null
          additional_driver_fee?: number | null
          additional_driver_license?: string | null
          additional_driver_name?: string | null
          car_id?: string
          created_at?: string | null
          different_zone_fee?: number | null
          driver_history_checked?: boolean | null
          driver_risk_level?: string | null
          dropoff_address?: string | null
          dropoff_zone_id?: string | null
          end_time?: string
          id?: string
          payment_status?: string | null
          pickup_address?: string | null
          pickup_zone_id?: string | null
          rental_type?: string
          start_time?: string
          total_price?: number
          traffic_delay_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
      campaigns: {
        Row: {
          car_types: string[] | null
          created_at: string | null
          description: string | null
          discount_percentage: number
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          car_types?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_percentage: number
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          car_types?: string[] | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cars: {
        Row: {
          available: boolean | null
          battery_level: number | null
          city: string | null
          created_at: string | null
          description: string | null
          fuel_type: string
          gps_device_id: string | null
          heading: number | null
          id: string
          image_url: string | null
          km_packages: Json | null
          last_gps_update: string | null
          latitude: number | null
          location: string
          lock_status: string | null
          longitude: number | null
          name: string
          owner_id: string
          plate_number: string | null
          price_per_day: number
          price_per_hour: number
          price_per_km: number | null
          price_per_minute: number
          seats: number
          speed: number | null
          transmission: string
          type: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          available?: boolean | null
          battery_level?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          fuel_type: string
          gps_device_id?: string | null
          heading?: number | null
          id?: string
          image_url?: string | null
          km_packages?: Json | null
          last_gps_update?: string | null
          latitude?: number | null
          location: string
          lock_status?: string | null
          longitude?: number | null
          name: string
          owner_id: string
          plate_number?: string | null
          price_per_day: number
          price_per_hour: number
          price_per_km?: number | null
          price_per_minute: number
          seats: number
          speed?: number | null
          transmission: string
          type: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          available?: boolean | null
          battery_level?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          fuel_type?: string
          gps_device_id?: string | null
          heading?: number | null
          id?: string
          image_url?: string | null
          km_packages?: Json | null
          last_gps_update?: string | null
          latitude?: number | null
          location?: string
          lock_status?: string | null
          longitude?: number | null
          name?: string
          owner_id?: string
          plate_number?: string | null
          price_per_day?: number
          price_per_hour?: number
          price_per_km?: number | null
          price_per_minute?: number
          seats?: number
          speed?: number | null
          transmission?: string
          type?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      driver_history: {
        Row: {
          blocked_reason: string | null
          created_at: string
          driver_score: number | null
          id: string
          is_approved: boolean | null
          last_violation_date: string | null
          license_number: string
          national_id: string | null
          notes: string | null
          penalty_points: number
          total_accidents: number
          traffic_violations: number
          updated_at: string
          user_id: string
          verification_status: string
          verified_given_names: string | null
          verified_surname: string | null
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          driver_score?: number | null
          id?: string
          is_approved?: boolean | null
          last_violation_date?: string | null
          license_number: string
          national_id?: string | null
          notes?: string | null
          penalty_points?: number
          total_accidents?: number
          traffic_violations?: number
          updated_at?: string
          user_id: string
          verification_status?: string
          verified_given_names?: string | null
          verified_surname?: string | null
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          driver_score?: number | null
          id?: string
          is_approved?: boolean | null
          last_violation_date?: string | null
          license_number?: string
          national_id?: string | null
          notes?: string | null
          penalty_points?: number
          total_accidents?: number
          traffic_violations?: number
          updated_at?: string
          user_id?: string
          verification_status?: string
          verified_given_names?: string | null
          verified_surname?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          car_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          car_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          car_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
      gps_location_history: {
        Row: {
          accuracy: number | null
          car_id: string
          created_at: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
        }
        Insert: {
          accuracy?: number | null
          car_id: string
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
        }
        Update: {
          accuracy?: number | null
          car_id?: string
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_location_history_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          car_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          car_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          car_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_cards: {
        Row: {
          card_holder_name: string
          card_type: string
          created_at: string | null
          encrypted_card_token: string
          expiry_month: number
          expiry_year: number
          id: string
          is_default: boolean | null
          last_four_digits: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_holder_name: string
          card_type: string
          created_at?: string | null
          encrypted_card_token: string
          expiry_month: number
          expiry_year: number
          id?: string
          is_default?: boolean | null
          last_four_digits: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_holder_name?: string
          card_type?: string
          created_at?: string | null
          encrypted_card_token?: string
          expiry_month?: number
          expiry_year?: number
          id?: string
          is_default?: boolean | null
          last_four_digits?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_zones: {
        Row: {
          boundaries: Json
          city: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          boundaries: Json
          city?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          boundaries?: Json
          city?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          discount_percentage: number
          end_date: string
          id: string
          start_date: string
          status: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_percentage?: number
          end_date: string
          id?: string
          start_date?: string
          status?: string
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_percentage?: number
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_actions: {
        Row: {
          action_type: string
          car_id: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          car_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          car_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_actions_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
      vehicle_alerts: {
        Row: {
          alert_type: string
          car_id: string
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          car_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          car_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_alerts_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
      vehicle_photos: {
        Row: {
          booking_id: string
          car_id: string
          created_at: string | null
          flash_used: boolean | null
          id: string
          is_dark_environment: boolean | null
          notes: string | null
          photo_type: string
          photo_url: string
          user_id: string
        }
        Insert: {
          booking_id: string
          car_id: string
          created_at?: string | null
          flash_used?: boolean | null
          id?: string
          is_dark_environment?: boolean | null
          notes?: string | null
          photo_type: string
          photo_url: string
          user_id: string
        }
        Update: {
          booking_id?: string
          car_id?: string
          created_at?: string | null
          flash_used?: boolean | null
          id?: string
          is_dark_environment?: boolean | null
          notes?: string | null
          photo_type?: string
          photo_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_photos_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_driver_eligibility: {
        Args: { p_user_id: string }
        Returns: {
          driver_score: number
          is_eligible: boolean
          reason: string
        }[]
      }
      has_role: {
        Args: {
          _role: string
          _user_id: string
        }
        Returns: boolean
      }
      update_driver_score: {
        Args: { p_change: number; p_reason: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "car_owner" | "admin"
      car_type: "compact" | "sedan" | "suv"
      fuel_type: "Benzin" | "Dizel" | "Elektrik" | "Hibrit"
      subscription_tier: "basic" | "premium" | "vip"
      transmission_type: "Manuel" | "Otomatik"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer Row
    }
    ? Row
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends { Row: infer Row }
      ? Row
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer Insert
    }
    ? Insert
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer Insert
      }
      ? Insert
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer Update
    }
    ? Update
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer Update
      }
      ? Update
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

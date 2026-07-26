export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'customer' | 'business_owner' | 'admin';
export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'refunded'
  | 'rescheduled';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'cancelled';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Database {
  public: {
    Tables: {
      platform_settings: {
        Row: {
          id: number;
          currency_code: string;
          currency_symbol: string;
          commission_type: string;
          commission_value: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          currency_code?: string;
          currency_symbol?: string;
          commission_type?: string;
          commission_value?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          currency_code?: string;
          currency_symbol?: string;
          commission_type?: string;
          commission_value?: number;
          updated_at?: string;
        };
      };
      cities: {
        Row: {
          id: string;
          name: string;
          state_or_country: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          state_or_country?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          state_or_country?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: UserRole;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          preferred_language: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: UserRole;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          preferred_language?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: UserRole;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          preferred_language?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          email: string | null;
          website: string | null;
          address: string;
          city: string;
          country: string;
          latitude: number;
          longitude: number;
          average_rating: number;
          review_count: number;
          verification_status: VerificationStatus;
          subscription_status: SubscriptionStatus;
          is_featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          email?: string | null;
          website?: string | null;
          address: string;
          city: string;
          country?: string;
          latitude: number;
          longitude: number;
          average_rating?: number;
          review_count?: number;
          verification_status?: VerificationStatus;
          subscription_status?: SubscriptionStatus;
          is_featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          email?: string | null;
          website?: string | null;
          address?: string;
          city?: string;
          country?: string;
          latitude?: number;
          longitude?: number;
          average_rating?: number;
          review_count?: number;
          verification_status?: VerificationStatus;
          subscription_status?: SubscriptionStatus;
          is_featured?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          customer_id: string;
          business_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_price: number;
          status: BookingStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          business_id: string;
          service_id: string;
          booking_date: string;
          start_time: string;
          end_time: string;
          total_price: number;
          status?: BookingStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          business_id?: string;
          service_id?: string;
          booking_date?: string;
          start_time?: string;
          end_time?: string;
          total_price?: number;
          status?: BookingStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          customer_id: string;
          business_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          customer_id: string;
          business_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          customer_id?: string;
          business_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          related_entity_type: string | null;
          related_entity_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_id?: string;
          created_at?: string;
        };
      };
      verification_requests: {
        Row: {
          id: string;
          business_id: string;
          document_url: string;
          notes: string | null;
          status: VerificationStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          document_url: string;
          notes?: string | null;
          status?: VerificationStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          document_url?: string;
          notes?: string | null;
          status?: VerificationStatus;
          created_at?: string;
        };
      };
      processed_webhook_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          processed_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          target_entity: string;
          target_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          target_entity: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          target_entity?: string;
          target_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      nearby_businesses: {
        Args: {
          lat: number;
          lng: number;
          radius_meters?: number;
          cat_id?: string | null;
          min_rat?: number;
          ver_stat?: string | null;
        };
        Returns: {
          id: string;
          owner_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          email: string | null;
          website: string | null;
          address: string;
          city: string;
          country: string;
          latitude: number;
          longitude: number;
          average_rating: number;
          review_count: number;
          verification_status: VerificationStatus;
          subscription_status: SubscriptionStatus;
          is_featured: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          distance_meters: number;
        }[];
      };
      create_booking_atomic: {
        Args: {
          // The customer is taken from auth.uid() server-side, not passed in.
          p_service_id: string;
          p_booking_date: string;
          p_start_time: string;
          p_end_time: string;
          p_notes?: string | null;
        };
        Returns: Database['public']['Tables']['bookings']['Row'];
      };
    };
  };
}

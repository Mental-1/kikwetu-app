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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_drafts: {
        Row: {
          ad_details: Json | null
          category: number | null
          created_at: string | null
          id: string
          media_details: Json | null
          payment_status: string | null
          profile_id: string
          selected_plan: Json | null
          updated_at: string | null
        }
        Insert: {
          ad_details?: Json | null
          category?: number | null
          created_at?: string | null
          id?: string
          media_details?: Json | null
          payment_status?: string | null
          profile_id: string
          selected_plan?: Json | null
          updated_at?: string | null
        }
        Update: {
          ad_details?: Json | null
          category?: number | null
          created_at?: string | null
          id?: string
          media_details?: Json | null
          payment_status?: string | null
          profile_id?: string
          selected_plan?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_drafts_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: number
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      cleanup_logs: {
        Row: {
          created_at: string | null
          deleted_listings: number | null
          deleted_transactions: number | null
          error_message: string | null
          executed_at: string | null
          execution_time: unknown | null
          id: number
          operation_type: string
          status: string
        }
        Insert: {
          created_at?: string | null
          deleted_listings?: number | null
          deleted_transactions?: number | null
          error_message?: string | null
          executed_at?: string | null
          execution_time?: unknown | null
          id?: number
          operation_type: string
          status: string
        }
        Update: {
          created_at?: string | null
          deleted_listings?: number | null
          deleted_transactions?: number | null
          error_message?: string | null
          executed_at?: string | null
          execution_time?: unknown | null
          id?: number
          operation_type?: string
          status?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          encryption_key: string
          id: string
          listing_id: string | null
          seller_id: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          encryption_key: string
          id?: string
          listing_id?: string | null
          seller_id?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          encryption_key?: string
          id?: string
          listing_id?: string | null
          seller_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          id: number
          is_active: boolean | null
          max_uses: number | null
          type: Database["public"]["Enums"]["discount_type"]
          use_count: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          max_uses?: number | null
          type: Database["public"]["Enums"]["discount_type"]
          use_count?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: number
          is_active?: boolean | null
          max_uses?: number | null
          type?: Database["public"]["Enums"]["discount_type"]
          use_count?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_messages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          encrypted_content: string
          id: string
          iv: string
          message_type: string | null
          read_at: string | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          encrypted_content: string
          id?: string
          iv: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          encrypted_content?: string
          id?: string
          iv?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encrypted_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encrypted_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followers_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geocoded_locations: {
        Row: {
          address: string
          city: string | null
          country: string | null
          created_at: string | null
          formatted_address: string | null
          geometry: unknown | null
          id: string
          latitude: number
          longitude: number
          postal_code: string | null
          state: string | null
        }
        Insert: {
          address: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          formatted_address?: string | null
          geometry?: unknown | null
          id?: string
          latitude: number
          longitude: number
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          formatted_address?: string | null
          geometry?: unknown | null
          id?: string
          latitude?: number
          longitude?: number
          postal_code?: string | null
          state?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          activated_at: string | null
          category_id: number | null
          condition: string | null
          created_at: string | null
          description: string
          expiry_date: string | null
          featured: boolean | null
          featured_tier: string | null
          featured_until: string | null
          id: string
          images: string[] | null
          latitude: number | null
          location: string | null
          location_geometry: unknown | null
          longitude: number | null
          payment_status: string | null
          plan: string | null
          plan_id: string | null
          plan_name: string | null
          price: number | null
          search_vector: unknown | null
          status: string | null
          subcategory_id: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          views: number | null
        }
        Insert: {
          activated_at?: string | null
          category_id?: number | null
          condition?: string | null
          created_at?: string | null
          description: string
          expiry_date?: string | null
          featured?: boolean | null
          featured_tier?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location?: string | null
          location_geometry?: unknown | null
          longitude?: number | null
          payment_status?: string | null
          plan?: string | null
          plan_id?: string | null
          plan_name?: string | null
          price?: number | null
          search_vector?: unknown | null
          status?: string | null
          subcategory_id?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          views?: number | null
        }
        Update: {
          activated_at?: string | null
          category_id?: number | null
          condition?: string | null
          created_at?: string | null
          description?: string
          expiry_date?: string | null
          featured?: boolean | null
          featured_tier?: string | null
          featured_until?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          location?: string | null
          location_geometry?: unknown | null
          longitude?: number | null
          payment_status?: string | null
          plan?: string | null
          plan_id?: string | null
          plan_name?: string | null
          price?: number | null
          search_vector?: unknown | null
          status?: string | null
          subcategory_id?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          listing_id: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          listing_id?: string | null
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          listing_id?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_listing_id"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_listing_id"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      orphaned_callbacks: {
        Row: {
          amount: number | null
          callback_metadata: Json | null
          checkout_request_id: string
          created_at: string | null
          id: string
          investigation_notes: string | null
          mpesa_receipt_number: string | null
          notes: string | null
          phone_number: string | null
          raw_callback: Json | null
          resolved_at: string | null
          resolved_transaction_id: string | null
          result_code: number
          result_description: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          callback_metadata?: Json | null
          checkout_request_id: string
          created_at?: string | null
          id?: string
          investigation_notes?: string | null
          mpesa_receipt_number?: string | null
          notes?: string | null
          phone_number?: string | null
          raw_callback?: Json | null
          resolved_at?: string | null
          resolved_transaction_id?: string | null
          result_code: number
          result_description?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          callback_metadata?: Json | null
          checkout_request_id?: string
          created_at?: string | null
          id?: string
          investigation_notes?: string | null
          mpesa_receipt_number?: string | null
          notes?: string | null
          phone_number?: string | null
          raw_callback?: Json | null
          resolved_at?: string | null
          resolved_transaction_id?: string | null
          result_code?: number
          result_description?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orphaned_callbacks_resolved_transaction_id_fkey"
            columns: ["resolved_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          duration: number
          features: Json | null
          id: string
          max_listings: number | null
          name: string
          price: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration: number
          features?: Json | null
          id?: string
          max_listings?: number | null
          name: string
          price: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number
          features?: Json | null
          id?: string
          max_listings?: number | null
          name?: string
          price?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          authenticated: boolean | null
          avatar_url: string | null
          banned_until: string | null
          bio: string | null
          birth_date: string | null
          created_at: string | null
          currency: string | null
          current_plan_id: string | null
          deleted_at: string | null
          deletion_reason: string | null
          email: string | null
          email_notifications: boolean
          email_verified: boolean
          full_name: string | null
          id: string
          is_flagged: boolean | null
          language: string
          listing_count: number
          listing_updates: boolean
          location: string | null
          marketing_emails: boolean
          mfa_enabled: boolean | null
          nationality: string | null
          new_messages: boolean
          phone: string | null
          phone_number: string | null
          phone_verified: boolean
          price_alerts: boolean
          profile_visibility: string
          push_notifications: boolean
          rating: number
          referral_code: string | null
          reviews_count: number
          role: Database["public"]["Enums"]["user_role"]
          show_email: boolean
          show_last_seen: boolean
          show_phone: boolean
          sms_notifications: boolean
          theme: string
          timezone: string
          updated_at: string | null
          username: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          authenticated?: boolean | null
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string | null
          currency?: string | null
          current_plan_id?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string | null
          email_notifications?: boolean
          email_verified?: boolean
          full_name?: string | null
          id: string
          is_flagged?: boolean | null
          language?: string
          listing_count?: number
          listing_updates?: boolean
          location?: string | null
          marketing_emails?: boolean
          mfa_enabled?: boolean | null
          nationality?: string | null
          new_messages?: boolean
          phone?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          price_alerts?: boolean
          profile_visibility?: string
          push_notifications?: boolean
          rating?: number
          referral_code?: string | null
          reviews_count?: number
          role?: Database["public"]["Enums"]["user_role"]
          show_email?: boolean
          show_last_seen?: boolean
          show_phone?: boolean
          sms_notifications?: boolean
          theme?: string
          timezone?: string
          updated_at?: string | null
          username: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          authenticated?: boolean | null
          avatar_url?: string | null
          banned_until?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string | null
          currency?: string | null
          current_plan_id?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          email?: string | null
          email_notifications?: boolean
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_flagged?: boolean | null
          language?: string
          listing_count?: number
          listing_updates?: boolean
          location?: string | null
          marketing_emails?: boolean
          mfa_enabled?: boolean | null
          nationality?: string | null
          new_messages?: boolean
          phone?: string | null
          phone_number?: string | null
          phone_verified?: boolean
          price_alerts?: boolean
          profile_visibility?: string
          push_notifications?: boolean
          rating?: number
          referral_code?: string | null
          reviews_count?: number
          role?: Database["public"]["Enums"]["user_role"]
          show_email?: boolean
          show_last_seen?: boolean
          show_phone?: boolean
          sms_notifications?: boolean
          theme?: string
          timezone?: string
          updated_at?: string | null
          username?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes_pool: {
        Row: {
          code: string
          created_at: string | null
          id: number
          used: boolean | null
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: number
          used?: boolean | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: number
          used?: boolean | null
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          rating: number
          review: string | null
          reviewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          rating: number
          review?: string | null
          reviewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          rating?: number
          review?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: number
          name: string
          parent_category_id: number
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: number
          name: string
          parent_category_id: number
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: number
          name?: string
          parent_category_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id: string
          start_date?: string
          status: Database["public"]["Enums"]["subscription_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string
          discount_code_id: number | null
          email: string | null
          id: string
          listing_id: string | null
          merchant_request_id: string | null
          payment_method: string
          phone_number: string | null
          psp_event_id: string | null
          psp_transaction_id: string | null
          reference: string | null
          status: string
          transaction_token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string
          discount_code_id?: number | null
          email?: string | null
          id?: string
          listing_id?: string | null
          merchant_request_id?: string | null
          payment_method: string
          phone_number?: string | null
          psp_event_id?: string | null
          psp_transaction_id?: string | null
          reference?: string | null
          status?: string
          transaction_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string
          discount_code_id?: number | null
          email?: string | null
          id?: string
          listing_id?: string | null
          merchant_request_id?: string | null
          payment_method?: string
          phone_number?: string | null
          psp_event_id?: string | null
          psp_transaction_id?: string | null
          reference?: string | null
          status?: string
          transaction_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      user_applied_codes: {
        Row: {
          applied_at: string
          code_id: number
          id: number
          listing_id: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          code_id: number
          id?: number
          listing_id?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          code_id?: number
          id?: number
          listing_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_applied_codes_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_applied_codes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_applied_codes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_applied_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_dead_letter_queue: {
        Row: {
          final_failure_reason: string | null
          id: string
          moved_at: string | null
          original_event_id: string
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          final_failure_reason?: string | null
          id?: string
          moved_at?: string | null
          original_event_id: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          final_failure_reason?: string | null
          id?: string
          moved_at?: string | null
          original_event_id?: string
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          failure_reason: string | null
          id: string
          next_retry_at: string | null
          payload: Json
          psp: string
          psp_event_id: string
          retry_count: number
          status: Database["public"]["Enums"]["webhook_event_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          next_retry_at?: string | null
          payload: Json
          psp: string
          psp_event_id: string
          retry_count?: number
          status?: Database["public"]["Enums"]["webhook_event_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          failure_reason?: string | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          psp?: string
          psp_event_id?: string
          retry_count?: number
          status?: Database["public"]["Enums"]["webhook_event_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      listing_reviews_summary: {
        Row: {
          average_rating: number | null
          listing_id: string | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_with_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      listings_with_reviews: {
        Row: {
          average_rating: number | null
          category_id: number | null
          condition: string | null
          created_at: string | null
          description: string | null
          expiry_date: string | null
          featured: boolean | null
          featured_tier: string | null
          featured_until: string | null
          id: string | null
          images: string[] | null
          latitude: number | null
          location: string | null
          location_geometry: unknown | null
          longitude: number | null
          payment_status: string | null
          plan: string | null
          plan_id: string | null
          plan_name: string | null
          price: number | null
          review_count: number | null
          search_vector: unknown | null
          status: string | null
          subcategory_id: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events_summary: {
        Row: {
          avg_retry_count: number | null
          event_count: number | null
          max_retry_count: number | null
          newest_event: string | null
          oldest_event: string | null
          psp: string | null
          status: Database["public"]["Enums"]["webhook_event_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_delete_listing: {
        Args: { listing_uuid: string }
        Returns: boolean
      }
      can_edit_listing: {
        Args: { listing_uuid: string }
        Returns: boolean
      }
      can_feature_listing: {
        Args: { listing_uuid: string; user_uuid: string }
        Returns: boolean
      }
      claim_next_referral_code: {
        Args: { user_id: string }
        Returns: string
      }
      cleanup_abandoned_transactions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_webhook_events: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      create_notification: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
          target_user_id: string
        }
        Returns: string
      }
      delete_abandoned_listings: {
        Args: Record<PropertyKey, never>
        Returns: {
          deleted_listings: number
          deleted_transactions: number
          error_message: string
          execution_time: unknown
        }[]
      }
      feature_listing: {
        Args: { duration_days?: number; listing_uuid: string }
        Returns: boolean
      }
      generate_referral_codes_batch: {
        Args: { batch_size?: number }
        Returns: number
      }
      get_cleanup_stats: {
        Args: { days_back?: number }
        Returns: {
          avg_execution_time: unknown
          failed_runs: number
          last_failed_run: string
          last_successful_run: string
          successful_runs: number
          total_listings_deleted: number
          total_runs: number
          total_transactions_deleted: number
        }[]
      }
      get_filtered_listings: {
        Args: {
          p_categories?: number[]
          p_conditions?: string[]
          p_max_price?: number
          p_min_price?: number
          p_page?: number
          p_page_size?: number
          p_radius_km?: number
          p_search_query?: string
          p_sort_by?: string
          p_sort_order?: string
          p_subcategories?: number[]
          p_user_latitude?: number
          p_user_longitude?: number
        }
        Returns: Json
      }
      get_listings_within_radius: {
        Args: {
          radius_km: number
          user_latitude: number
          user_longitude: number
        }
        Returns: {
          activated_at: string | null
          category_id: number | null
          condition: string | null
          created_at: string | null
          description: string
          expiry_date: string | null
          featured: boolean | null
          featured_tier: string | null
          featured_until: string | null
          id: string
          images: string[] | null
          latitude: number | null
          location: string | null
          location_geometry: unknown | null
          longitude: number | null
          payment_status: string | null
          plan: string | null
          plan_id: string | null
          plan_name: string | null
          price: number | null
          search_vector: unknown | null
          status: string | null
          subcategory_id: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          views: number | null
        }[]
      }
      get_or_create_conversation: {
        Args: {
          p_buyer_id: string
          p_encryption_key: string
          p_listing_id: string
          p_seller_id: string
        }
        Returns: string
      }
      get_referral_pool_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          available_codes: number
          estimated_days_remaining: number
          pool_status: string
          total_codes: number
          usage_rate_last_24h: number
          used_codes: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      handle_expired_listings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      increment_listing_views: {
        Args: { listing_uuid: string }
        Returns: number
      }
      insert_webhook_event: {
        Args: { p_payload: Json; p_psp: string; p_psp_event_id: string }
        Returns: string
      }
      maintain_referral_codes_pool: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          codes_generated: number
          pool_health: string
          total_available: number
        }[]
      }
      manage_webhook_workers: {
        Args: { action?: string }
        Returns: string
      }
      manual_cleanup_abandoned_listings: {
        Args: { confirm_deletion?: boolean }
        Returns: {
          deleted_listings: number
          deleted_transactions: number
          error_message: string
          execution_time: unknown
        }[]
      }
      mark_all_notifications_as_read: {
        Args: { user_uuid?: string }
        Returns: number
      }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: boolean
      }
      process_webhook_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_listing_reviews_summary: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      renew_listing: {
        Args: { listing_id: string; plan_id: string }
        Returns: undefined
      }
      reverse_geocode: {
        Args: { lat: number; lng: number }
        Returns: {
          address: string
          city: string | null
          country: string | null
          created_at: string | null
          formatted_address: string | null
          geometry: unknown | null
          id: string
          latitude: number
          longitude: number
          postal_code: string | null
          state: string | null
        }[]
      }
      search_listings_with_fuzzy: {
        Args: {
          p_categories?: number[]
          p_conditions?: string[]
          p_max_price?: number
          p_min_price?: number
          p_page?: number
          p_page_size?: number
          p_radius_km?: number
          p_search_query?: string
          p_sort_by?: string
          p_sort_order?: string
          p_subcategories?: number[]
          p_user_latitude?: number
          p_user_longitude?: number
        }
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      show_webhook_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          command: string
          jobname: string
          schedule: string
        }[]
      }
      unfeature_expired_listings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      webhook_processing_stats: {
        Args: { hours_back?: number }
        Returns: {
          completed_events: number
          completion_rate: number
          dead_letter_events: number
          failed_events: number
          processing_events: number
          total_events: number
        }[]
      }
    }
    Enums: {
      discount_type:
        | "PERCENTAGE_DISCOUNT"
        | "FIXED_AMOUNT_DISCOUNT"
        | "EXTRA_LISTING_DAYS"
      subscription_status:
        | "active"
        | "inactive"
        | "cancelled"
        | "past_due"
        | "free"
      transaction_status: "pending" | "completed" | "failed"
      user_role: "user" | "admin" | "moderator"
      webhook_event_status:
        | "received"
        | "processing"
        | "completed"
        | "failed"
        | "dead_letter"
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
      discount_type: [
        "PERCENTAGE_DISCOUNT",
        "FIXED_AMOUNT_DISCOUNT",
        "EXTRA_LISTING_DAYS",
      ],
      subscription_status: [
        "active",
        "inactive",
        "cancelled",
        "past_due",
        "free",
      ],
      transaction_status: ["pending", "completed", "failed"],
      user_role: ["user", "admin", "moderator"],
      webhook_event_status: [
        "received",
        "processing",
        "completed",
        "failed",
        "dead_letter",
      ],
    },
  },
} as const

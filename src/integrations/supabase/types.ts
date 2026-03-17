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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_csv_files: {
        Row: {
          campaign_id: string
          created_at: string
          file_name: string | null
          file_size: number | null
          headers: Json | null
          id: string
          raw_content: string
          row_count: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          headers?: Json | null
          id?: string
          raw_content: string
          row_count?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          headers?: Json | null
          id?: string
          raw_content?: string
          row_count?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_csv_files_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_csv_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_logs: {
        Row: {
          batch_number: number | null
          campaign_id: string
          created_at: string
          event: string
          id: string
          message: string | null
          pages_in_batch: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          batch_number?: number | null
          campaign_id: string
          created_at?: string
          event: string
          id?: string
          message?: string | null
          pages_in_batch?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          batch_number?: number | null
          campaign_id?: string
          created_at?: string
          event?: string
          id?: string
          message?: string | null
          pages_in_batch?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          batch_size: number | null
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          created_at: string
          csv_data: Json | null
          csv_storage_path: string | null
          current_batch: number | null
          failed_rows: number | null
          generation_completed_at: string | null
          generation_started_at: string | null
          geo_settings: Json | null
          id: string
          is_paused: boolean | null
          mapping: Json | null
          max_rows: number | null
          name: string
          processed_rows: number | null
          publish_mode: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          template_id: string | null
          total_rows: number | null
          updated_at: string
          user_id: string
          utm_settings: Json | null
          website_id: string | null
          workspace_id: string | null
        }
        Insert: {
          batch_size?: number | null
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          csv_data?: Json | null
          csv_storage_path?: string | null
          current_batch?: number | null
          failed_rows?: number | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          geo_settings?: Json | null
          id?: string
          is_paused?: boolean | null
          mapping?: Json | null
          max_rows?: number | null
          name: string
          processed_rows?: number | null
          publish_mode?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          total_rows?: number | null
          updated_at?: string
          user_id: string
          utm_settings?: Json | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          batch_size?: number | null
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          created_at?: string
          csv_data?: Json | null
          csv_storage_path?: string | null
          current_batch?: number | null
          failed_rows?: number | null
          generation_completed_at?: string | null
          generation_started_at?: string | null
          geo_settings?: Json | null
          id?: string
          is_paused?: boolean | null
          mapping?: Json | null
          max_rows?: number | null
          name?: string
          processed_rows?: number | null
          publish_mode?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          total_rows?: number | null
          updated_at?: string
          user_id?: string
          utm_settings?: Json | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          campaign_id: string
          config: Json | null
          created_at: string
          file_name: string | null
          file_size: number | null
          headers: Json | null
          id: string
          row_count: number | null
          type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          campaign_id: string
          config?: Json | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          headers?: Json | null
          id?: string
          row_count?: number | null
          type?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string
          config?: Json | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          headers?: Json | null
          id?: string
          row_count?: number | null
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pages: {
        Row: {
          ad_campaign_id: string | null
          ad_group_id: string | null
          campaign_id: string
          canonical_url: string | null
          content: string
          created_at: string
          error_message: string | null
          external_id: string | null
          external_url: string | null
          id: string
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          title: string
          user_id: string
          website_id: string | null
          workspace_id: string | null
        }
        Insert: {
          ad_campaign_id?: string | null
          ad_group_id?: string | null
          campaign_id: string
          canonical_url?: string | null
          content: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          title: string
          user_id: string
          website_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          ad_campaign_id?: string | null
          ad_group_id?: string | null
          campaign_id?: string
          canonical_url?: string | null
          content?: string
          created_at?: string
          error_message?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          title?: string
          user_id?: string
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          batch_size: number
          campaign_id: string
          completed_at: string | null
          config: Json | null
          created_at: string
          current_batch: number
          error_count: number
          error_log: Json | null
          id: string
          processed_rows: number
          started_at: string | null
          status: Database["public"]["Enums"]["generation_job_status"]
          success_count: number
          total_rows: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          batch_size?: number
          campaign_id: string
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_batch?: number
          error_count?: number
          error_log?: Json | null
          id?: string
          processed_rows?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
          success_count?: number
          total_rows?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          batch_size?: number
          campaign_id?: string
          completed_at?: string | null
          config?: Json | null
          created_at?: string
          current_batch?: number
          error_count?: number
          error_log?: Json | null
          id?: string
          processed_rows?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["generation_job_status"]
          success_count?: number
          total_rows?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      indexing_requests: {
        Row: {
          created_at: string
          error_message: string | null
          google_response: Json | null
          id: string
          last_checked_at: string | null
          page_id: string | null
          retry_count: number
          status: Database["public"]["Enums"]["indexing_status"]
          submitted_at: string | null
          updated_at: string
          url: string
          user_id: string
          website_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          google_response?: Json | null
          id?: string
          last_checked_at?: string | null
          page_id?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["indexing_status"]
          submitted_at?: string | null
          updated_at?: string
          url: string
          user_id: string
          website_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          google_response?: Json | null
          id?: string
          last_checked_at?: string | null
          page_id?: string | null
          retry_count?: number
          status?: Database["public"]["Enums"]["indexing_status"]
          submitted_at?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          website_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indexing_requests_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indexing_requests_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indexing_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_link_settings: {
        Row: {
          anchor_format: string
          auto_build: boolean
          campaign_id: string
          created_at: string
          enabled: boolean
          grouping_variable: string | null
          id: string
          max_links_per_page: number
          section_title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          anchor_format?: string
          auto_build?: boolean
          campaign_id: string
          created_at?: string
          enabled?: boolean
          grouping_variable?: string | null
          id?: string
          max_links_per_page?: number
          section_title?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          anchor_format?: string
          auto_build?: boolean
          campaign_id?: string
          created_at?: string
          enabled?: boolean
          grouping_variable?: string | null
          id?: string
          max_links_per_page?: number
          section_title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_link_settings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_link_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_links: {
        Row: {
          anchor_text: string
          campaign_id: string
          created_at: string
          id: string
          source_page_id: string
          target_page_id: string
          workspace_id: string | null
        }
        Insert: {
          anchor_text: string
          campaign_id: string
          created_at?: string
          id?: string
          source_page_id: string
          target_page_id: string
          workspace_id?: string | null
        }
        Update: {
          anchor_text?: string
          campaign_id?: string
          created_at?: string
          id?: string
          source_page_id?: string
          target_page_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_links_source_page_id_fkey"
            columns: ["source_page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_links_target_page_id_fkey"
            columns: ["target_page_id"]
            isOneToOne: false
            referencedRelation: "generated_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mappings: {
        Row: {
          campaign_id: string
          created_at: string
          data_source_id: string | null
          field_category: string
          id: string
          is_required: boolean
          sort_order: number
          source_column: string
          target_field: string
          transform_expression: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          data_source_id?: string | null
          field_category?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          source_column: string
          target_field: string
          transform_expression?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          data_source_id?: string | null
          field_category?: string
          id?: string
          is_required?: boolean
          sort_order?: number
          source_column?: string
          target_field?: string
          transform_expression?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mappings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mappings_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mappings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_content_length: string
          ai_language: string
          ai_tone: string
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_content_length?: string
          ai_language?: string
          ai_tone?: string
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_content_length?: string
          ai_language?: string
          ai_tone?: string
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sitemaps: {
        Row: {
          content: string
          created_at: string
          id: string
          last_generated_at: string
          page_count: number
          updated_at: string
          user_id: string
          website_id: string
          workspace_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          last_generated_at?: string
          page_count?: number
          updated_at?: string
          user_id: string
          website_id: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          last_generated_at?: string
          page_count?: number
          updated_at?: string
          user_id?: string
          website_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sitemaps_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: true
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sitemaps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      store_generations: {
        Row: {
          categories: Json | null
          content_tone: string | null
          created_at: string
          error_message: string | null
          id: string
          keywords: string[] | null
          language: string | null
          niche: string
          price_max: number | null
          price_min: number | null
          product_count: number
          products: Json | null
          progress: Json | null
          status: string
          updated_at: string
          user_id: string
          website_id: string | null
          workspace_id: string | null
        }
        Insert: {
          categories?: Json | null
          content_tone?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          niche: string
          price_max?: number | null
          price_min?: number | null
          product_count?: number
          products?: Json | null
          progress?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          website_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          categories?: Json | null
          content_tone?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          keywords?: string[] | null
          language?: string | null
          niche?: string
          price_max?: number | null
          price_min?: number | null
          product_count?: number
          products?: Json | null
          progress?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_generations_website_id_fkey"
            columns: ["website_id"]
            isOneToOne: false
            referencedRelation: "websites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_generations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ai_generations_limit: number
          ai_generations_used: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pages_limit: number
          pages_used: number
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_generations_limit?: number
          ai_generations_used?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pages_limit?: number
          pages_used?: number
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_generations_limit?: number
          ai_generations_used?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pages_limit?: number
          pages_used?: number
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          schema_config: Json | null
          schema_type: string | null
          seo_description_pattern: string | null
          seo_title_pattern: string | null
          updated_at: string
          user_id: string
          variables: string[] | null
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          schema_config?: Json | null
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          updated_at?: string
          user_id: string
          variables?: string[] | null
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          schema_config?: Json | null
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          updated_at?: string
          user_id?: string
          variables?: string[] | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      websites: {
        Row: {
          created_at: string
          credentials: Json | null
          google_indexing_enabled: boolean | null
          google_service_account: Json | null
          id: string
          last_sync: string | null
          name: string
          status: Database["public"]["Enums"]["website_status"]
          type: Database["public"]["Enums"]["website_type"]
          updated_at: string
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          google_indexing_enabled?: boolean | null
          google_service_account?: Json | null
          id?: string
          last_sync?: string | null
          name: string
          status?: Database["public"]["Enums"]["website_status"]
          type: Database["public"]["Enums"]["website_type"]
          updated_at?: string
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          google_indexing_enabled?: boolean | null
          google_service_account?: Json | null
          id?: string
          last_sync?: string | null
          name?: string
          status?: Database["public"]["Enums"]["website_status"]
          type?: Database["public"]["Enums"]["website_type"]
          updated_at?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "websites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_workspace_role: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      campaign_status:
        | "draft"
        | "queued"
        | "processing"
        | "completed"
        | "failed"
      campaign_type: "seo" | "sea" | "geo"
      generation_job_status:
        | "pending"
        | "running"
        | "paused"
        | "completed"
        | "failed"
        | "cancelled"
      indexing_status: "pending" | "submitted" | "indexed" | "failed"
      page_status: "pending" | "published" | "failed"
      website_status: "connected" | "error" | "disconnected"
      website_type: "wordpress" | "shopify" | "prestashop" | "woocommerce"
      workspace_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "user"],
      campaign_status: ["draft", "queued", "processing", "completed", "failed"],
      campaign_type: ["seo", "sea", "geo"],
      generation_job_status: [
        "pending",
        "running",
        "paused",
        "completed",
        "failed",
        "cancelled",
      ],
      indexing_status: ["pending", "submitted", "indexed", "failed"],
      page_status: ["pending", "published", "failed"],
      website_status: ["connected", "error", "disconnected"],
      website_type: ["wordpress", "shopify", "prestashop", "woocommerce"],
      workspace_role: ["owner", "admin", "member"],
    },
  },
} as const

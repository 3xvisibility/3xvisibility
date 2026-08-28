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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          name: string
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
          variant_a_content: string
          variant_a_failed: number
          variant_a_label: string
          variant_a_pages: number
          variant_a_published: number
          variant_b_content: string
          variant_b_failed: number
          variant_b_label: string
          variant_b_pages: number
          variant_b_published: number
          winner: string | null
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          variant_a_content: string
          variant_a_failed?: number
          variant_a_label?: string
          variant_a_pages?: number
          variant_a_published?: number
          variant_b_content: string
          variant_b_failed?: number
          variant_b_label?: string
          variant_b_pages?: number
          variant_b_published?: number
          winner?: string | null
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          variant_a_content?: string
          variant_a_failed?: number
          variant_a_label?: string
          variant_a_pages?: number
          variant_a_published?: number
          variant_b_content?: string
          variant_b_failed?: number
          variant_b_label?: string
          variant_b_pages?: number
          variant_b_published?: number
          winner?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_link_id: string
          created_at: string
          id: string
          ip_address: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_link_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_link_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_links: {
        Row: {
          code: string
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          pending_balance: number
          total_clicks: number
          total_conversions: number
          total_credited: number
          total_earned: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          code: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          pending_balance?: number
          total_clicks?: number
          total_conversions?: number
          total_credited?: number
          total_earned?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          code?: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          pending_balance?: number
          total_clicks?: number
          total_conversions?: number
          total_credited?: number
          total_earned?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          affiliate_link_id: string
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          status: string
          type: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          affiliate_link_id: string
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          type?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          affiliate_link_id?: string
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          type?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_link_id: string
          commission_amount: number
          converted_at: string | null
          created_at: string
          credit_reward: number
          id: string
          referred_user_id: string | null
          status: string
          subscription_plan: string | null
          workspace_id: string | null
        }
        Insert: {
          affiliate_link_id: string
          commission_amount?: number
          converted_at?: string | null
          created_at?: string
          credit_reward?: number
          id?: string
          referred_user_id?: string | null
          status?: string
          subscription_plan?: string | null
          workspace_id?: string | null
        }
        Update: {
          affiliate_link_id?: string
          commission_amount?: number
          converted_at?: string | null
          created_at?: string
          credit_reward?: number
          id?: string
          referred_user_id?: string | null
          status?: string
          subscription_plan?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      ai_credit_gate_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          model: string | null
          prompt_type: string | null
          reason: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          model?: string | null
          prompt_type?: string | null
          reason?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          model?: string | null
          prompt_type?: string | null
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_credits: {
        Row: {
          created_at: string
          credits_reset_at: string
          id: string
          plan: string
          remaining_credits: number
          total_credits: number
          updated_at: string
          used_credits: number
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_reset_at?: string
          id?: string
          plan?: string
          remaining_credits?: number
          total_credits?: number
          updated_at?: string
          used_credits?: number
          user_id: string
        }
        Update: {
          created_at?: string
          credits_reset_at?: string
          id?: string
          plan?: string
          remaining_credits?: number
          total_credits?: number
          updated_at?: string
          used_credits?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_credits_usage: {
        Row: {
          created_at: string
          credits_used: number
          id: string
          metadata: Json
          model: string | null
          prompt_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          id?: string
          metadata?: Json
          model?: string | null
          prompt_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          id?: string
          metadata?: Json
          model?: string | null
          prompt_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_provider_keys: {
        Row: {
          api_key: string | null
          created_at: string
          default_model: string | null
          enabled: boolean
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          default_model?: string | null
          enabled?: boolean
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string
          default_model?: string | null
          enabled?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
        Relationships: []
      }
      campaign_csv_files: {
        Row: {
          campaign_id: string | null
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
          campaign_id?: string | null
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
          campaign_id?: string | null
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
        Relationships: []
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
        Relationships: []
      }
      campaigns: {
        Row: {
          ai_max_lines: number | null
          ai_max_words: number | null
          author_rotation: Json | null
          batch_size: number | null
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          campaign_types: string[]
          country: string
          created_at: string
          csv_data: Json | null
          csv_storage_path: string | null
          current_batch: number | null
          design_mode: string
          directory_structure: Json | null
          drip_feed_settings: Json | null
          failed_rows: number | null
          generation_completed_at: string | null
          generation_method: string
          generation_started_at: string | null
          geo_settings: Json | null
          id: string
          is_paused: boolean | null
          keyword_source: string | null
          keyword_source_details: Json | null
          language: string
          mapping: Json | null
          max_rows: number | null
          name: string
          processed_rows: number | null
          publish_format: string
          publish_mode: string
          publish_type: string
          recurring_schedule: Json | null
          scheduled_at: string | null
          shopify_page_template_suffix: string | null
          shopify_product_template_suffix: string | null
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
          ai_max_lines?: number | null
          ai_max_words?: number | null
          author_rotation?: Json | null
          batch_size?: number | null
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          campaign_types?: string[]
          country?: string
          created_at?: string
          csv_data?: Json | null
          csv_storage_path?: string | null
          current_batch?: number | null
          design_mode?: string
          directory_structure?: Json | null
          drip_feed_settings?: Json | null
          failed_rows?: number | null
          generation_completed_at?: string | null
          generation_method?: string
          generation_started_at?: string | null
          geo_settings?: Json | null
          id?: string
          is_paused?: boolean | null
          keyword_source?: string | null
          keyword_source_details?: Json | null
          language?: string
          mapping?: Json | null
          max_rows?: number | null
          name: string
          processed_rows?: number | null
          publish_format?: string
          publish_mode?: string
          publish_type?: string
          recurring_schedule?: Json | null
          scheduled_at?: string | null
          shopify_page_template_suffix?: string | null
          shopify_product_template_suffix?: string | null
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
          ai_max_lines?: number | null
          ai_max_words?: number | null
          author_rotation?: Json | null
          batch_size?: number | null
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          campaign_types?: string[]
          country?: string
          created_at?: string
          csv_data?: Json | null
          csv_storage_path?: string | null
          current_batch?: number | null
          design_mode?: string
          directory_structure?: Json | null
          drip_feed_settings?: Json | null
          failed_rows?: number | null
          generation_completed_at?: string | null
          generation_method?: string
          generation_started_at?: string | null
          geo_settings?: Json | null
          id?: string
          is_paused?: boolean | null
          keyword_source?: string | null
          keyword_source_details?: Json | null
          language?: string
          mapping?: Json | null
          max_rows?: number | null
          name?: string
          processed_rows?: number | null
          publish_format?: string
          publish_mode?: string
          publish_type?: string
          recurring_schedule?: Json | null
          scheduled_at?: string | null
          shopify_page_template_suffix?: string | null
          shopify_product_template_suffix?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          total_rows?: number | null
          updated_at?: string
          user_id?: string
          utm_settings?: Json | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          replied_by: string | null
          reply_message: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          replied_by?: string | null
          reply_message?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      elementor_templates: {
        Row: {
          category: string
          created_at: string
          default_content: Json
          default_limits: Json
          editable_fields: Json
          elementor_json: Json
          id: string
          image_map: Json
          name: string
          placeholders: Json
          preview_image: string | null
          responsive_rules: Json
          shopify_section_json: Json
          source_template_id: string
          status: string
          template_structure: Json
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          created_at?: string
          default_content?: Json
          default_limits?: Json
          editable_fields?: Json
          elementor_json?: Json
          id?: string
          image_map?: Json
          name: string
          placeholders?: Json
          preview_image?: string | null
          responsive_rules?: Json
          shopify_section_json?: Json
          source_template_id: string
          status?: string
          template_structure?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          default_content?: Json
          default_limits?: Json
          editable_fields?: Json
          elementor_json?: Json
          id?: string
          image_map?: Json
          name?: string
          placeholders?: Json
          preview_image?: string | null
          responsive_rules?: Json
          shopify_section_json?: Json
          source_template_id?: string
          status?: string
          template_structure?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      generated_pages: {
        Row: {
          ad_campaign_id: string | null
          ad_group_id: string | null
          campaign_id: string | null
          canonical_url: string | null
          container_width: number | null
          container_width_mobile: number | null
          container_width_tablet: number | null
          content: string
          created_at: string
          editor_readiness: Json | null
          error_message: string | null
          external_id: string | null
          external_url: string | null
          gutter_desktop: number | null
          gutter_mobile: number | null
          gutter_tablet: number | null
          id: string
          keyword_source: string | null
          keyword_source_details: Json | null
          publish_steps: Json | null
          seo_analyzed_at: string | null
          seo_description: string | null
          seo_findings: Json | null
          seo_grade: string | null
          seo_keywords: string[] | null
          seo_scores: Json | null
          seo_title: string | null
          seo_warnings: Json | null
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          title: string
          user_id: string
          variables: Json | null
          website_id: string | null
          workspace_id: string | null
        }
        Insert: {
          ad_campaign_id?: string | null
          ad_group_id?: string | null
          campaign_id?: string | null
          canonical_url?: string | null
          container_width?: number | null
          container_width_mobile?: number | null
          container_width_tablet?: number | null
          content: string
          created_at?: string
          editor_readiness?: Json | null
          error_message?: string | null
          external_id?: string | null
          external_url?: string | null
          gutter_desktop?: number | null
          gutter_mobile?: number | null
          gutter_tablet?: number | null
          id?: string
          keyword_source?: string | null
          keyword_source_details?: Json | null
          publish_steps?: Json | null
          seo_analyzed_at?: string | null
          seo_description?: string | null
          seo_findings?: Json | null
          seo_grade?: string | null
          seo_keywords?: string[] | null
          seo_scores?: Json | null
          seo_title?: string | null
          seo_warnings?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          title: string
          user_id: string
          variables?: Json | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          ad_campaign_id?: string | null
          ad_group_id?: string | null
          campaign_id?: string | null
          canonical_url?: string | null
          container_width?: number | null
          container_width_mobile?: number | null
          container_width_tablet?: number | null
          content?: string
          created_at?: string
          editor_readiness?: Json | null
          error_message?: string | null
          external_id?: string | null
          external_url?: string | null
          gutter_desktop?: number | null
          gutter_mobile?: number | null
          gutter_tablet?: number | null
          id?: string
          keyword_source?: string | null
          keyword_source_details?: Json | null
          publish_steps?: Json | null
          seo_analyzed_at?: string | null
          seo_description?: string | null
          seo_findings?: Json | null
          seo_grade?: string | null
          seo_keywords?: string[] | null
          seo_scores?: Json | null
          seo_title?: string | null
          seo_warnings?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          title?: string
          user_id?: string
          variables?: Json | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      invoices: {
        Row: {
          amount_refunded: number
          amount_total: number
          billing_details: Json
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          description: string | null
          dispute_reason: string | null
          dispute_status: string | null
          disputed_amount: number
          disputed_at: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_number: string
          invoice_pdf_url: string | null
          issued_at: string
          line_items: Json
          manual_status_at: string | null
          manual_status_by: string | null
          manual_status_reason: string | null
          plan: string | null
          receipt_url: string | null
          refunded_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent: string | null
          updated_at: string
          user_id: string | null
          voided_at: string | null
        }
        Insert: {
          amount_refunded?: number
          amount_total?: number
          billing_details?: Json
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          disputed_amount?: number
          disputed_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number: string
          invoice_pdf_url?: string | null
          issued_at?: string
          line_items?: Json
          manual_status_at?: string | null
          manual_status_by?: string | null
          manual_status_reason?: string | null
          plan?: string | null
          receipt_url?: string | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string
          user_id?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_refunded?: number
          amount_total?: number
          billing_details?: Json
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          description?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          disputed_amount?: number
          disputed_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_number?: string
          invoice_pdf_url?: string | null
          issued_at?: string
          line_items?: Json
          manual_status_at?: string | null
          manual_status_by?: string | null
          manual_status_reason?: string | null
          plan?: string | null
          receipt_url?: string | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent?: string | null
          updated_at?: string
          user_id?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          area_code: string | null
          city: string
          country: string
          country_code: string
          county: string | null
          created_at: string
          ethnicity_data: Json | null
          id: string
          latitude: number | null
          longitude: number | null
          median_age: number | null
          median_household_income: number | null
          phone_country_code: string | null
          population: number | null
          population_female: number | null
          population_male: number | null
          region: string | null
          state: string
          state_code: string | null
          timezone: string | null
          wikipedia_url: string | null
          zip_code: string | null
        }
        Insert: {
          area_code?: string | null
          city: string
          country?: string
          country_code?: string
          county?: string | null
          created_at?: string
          ethnicity_data?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          median_age?: number | null
          median_household_income?: number | null
          phone_country_code?: string | null
          population?: number | null
          population_female?: number | null
          population_male?: number | null
          region?: string | null
          state: string
          state_code?: string | null
          timezone?: string | null
          wikipedia_url?: string | null
          zip_code?: string | null
        }
        Update: {
          area_code?: string | null
          city?: string
          country?: string
          country_code?: string
          county?: string | null
          created_at?: string
          ethnicity_data?: Json | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          median_age?: number | null
          median_household_income?: number | null
          phone_country_code?: string | null
          population?: number | null
          population_female?: number | null
          population_male?: number | null
          region?: string | null
          state?: string
          state_code?: string | null
          timezone?: string | null
          wikipedia_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      mapping_profiles: {
        Row: {
          campaign_type: string
          created_at: string
          description: string | null
          id: string
          mappings: Json
          name: string
          transforms: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          campaign_type?: string
          created_at?: string
          description?: string | null
          id?: string
          mappings?: Json
          name: string
          transforms?: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          campaign_type?: string
          created_at?: string
          description?: string | null
          id?: string
          mappings?: Json
          name?: string
          transforms?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
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
        Relationships: []
      }
      marketplace_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          default_values: Json
          description: string
          elementor_data: Json
          id: string
          name: string
          preview_html: string | null
          source_url: string | null
          updated_at: string
          variables: string[]
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string
          elementor_data?: Json
          id?: string
          name: string
          preview_html?: string | null
          source_url?: string | null
          updated_at?: string
          variables?: string[]
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_values?: Json
          description?: string
          elementor_data?: Json
          id?: string
          name?: string
          preview_html?: string | null
          source_url?: string | null
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
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
        Relationships: []
      }
      page_assets: {
        Row: {
          content: string
          created_at: string
          hash: string
          id: string
          kind: string
          workspace_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          hash: string
          id?: string
          kind: string
          workspace_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          hash?: string
          id?: string
          kind?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      page_improvements: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          field: string
          id: string
          page_id: string
          score_after: number | null
          score_before: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          field: string
          id?: string
          page_id: string
          score_after?: number | null
          score_before?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          field?: string
          id?: string
          page_id?: string
          score_after?: number | null
          score_before?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      page_metrics: {
        Row: {
          avg_time_on_page: number
          bounce_rate: number
          click_through_rate: number
          conversions: number
          created_at: string
          id: string
          page_id: string
          period_end: string
          period_start: string
          unique_visitors: number
          updated_at: string
          user_id: string
          views: number
          workspace_id: string | null
        }
        Insert: {
          avg_time_on_page?: number
          bounce_rate?: number
          click_through_rate?: number
          conversions?: number
          created_at?: string
          id?: string
          page_id: string
          period_end?: string
          period_start?: string
          unique_visitors?: number
          updated_at?: string
          user_id: string
          views?: number
          workspace_id?: string | null
        }
        Update: {
          avg_time_on_page?: number
          bounce_rate?: number
          click_through_rate?: number
          conversions?: number
          created_at?: string
          id?: string
          page_id?: string
          period_end?: string
          period_start?: string
          unique_visitors?: number
          updated_at?: string
          user_id?: string
          views?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      page_render_checks: {
        Row: {
          attempt: number
          baseline_path: string | null
          baseline_source: string | null
          created_at: string
          diff_regions: Json
          error_message: string | null
          generated_page_id: string | null
          id: string
          meta: Json
          overridden: boolean
          pixel_score: number | null
          provider: string | null
          published_screenshot_url: string | null
          score: number | null
          status: string
          structural_score: number | null
          target_path: string | null
          target_source: string | null
          template_id: string | null
          template_screenshot_url: string | null
          threshold: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempt?: number
          baseline_path?: string | null
          baseline_source?: string | null
          created_at?: string
          diff_regions?: Json
          error_message?: string | null
          generated_page_id?: string | null
          id?: string
          meta?: Json
          overridden?: boolean
          pixel_score?: number | null
          provider?: string | null
          published_screenshot_url?: string | null
          score?: number | null
          status?: string
          structural_score?: number | null
          target_path?: string | null
          target_source?: string | null
          template_id?: string | null
          template_screenshot_url?: string | null
          threshold?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempt?: number
          baseline_path?: string | null
          baseline_source?: string | null
          created_at?: string
          diff_regions?: Json
          error_message?: string | null
          generated_page_id?: string | null
          id?: string
          meta?: Json
          overridden?: boolean
          pixel_score?: number | null
          provider?: string | null
          published_screenshot_url?: string | null
          score?: number | null
          status?: string
          structural_score?: number | null
          target_path?: string | null
          target_source?: string | null
          template_id?: string | null
          template_screenshot_url?: string | null
          threshold?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      page_versions: {
        Row: {
          content: string | null
          created_at: string
          external_id: string | null
          id: string
          page_id: string | null
          page_type: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string | null
          source: string
          title: string | null
          user_id: string
          website_id: string | null
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          page_id?: string | null
          page_type?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string | null
          source?: string
          title?: string | null
          user_id: string
          website_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          page_id?: string | null
          page_type?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string | null
          source?: string
          title?: string | null
          user_id?: string
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      pgp_keyword_groups: {
        Row: {
          created_at: string
          id: string
          language: string
          name: string
          template_id: string | null
          updated_at: string
          user_id: string
          variables: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          name: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          variables?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          name?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          variables?: Json
          workspace_id?: string
        }
        Relationships: []
      }
      pgp_keywords: {
        Row: {
          columns: string[] | null
          created_at: string
          delimiter: string | null
          folder: string | null
          id: string
          name: string
          source: string
          source_config: Json | null
          term_count: number
          terms: string[]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          columns?: string[] | null
          created_at?: string
          delimiter?: string | null
          folder?: string | null
          id?: string
          name: string
          source?: string
          source_config?: Json | null
          term_count?: number
          terms?: string[]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          columns?: string[] | null
          created_at?: string
          delimiter?: string | null
          folder?: string | null
          id?: string
          name?: string
          source?: string
          source_config?: Json | null
          term_count?: number
          terms?: string[]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_content_length: string
          ai_language: string
          ai_tone: string
          banned_at: string | null
          banned_reason: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          is_banned: boolean
          notification_preferences: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_content_length?: string
          ai_language?: string
          ai_tone?: string
          banned_at?: string | null
          banned_reason?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          notification_preferences?: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_content_length?: string
          ai_language?: string
          ai_tone?: string
          banned_at?: string | null
          banned_reason?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          notification_preferences?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      referral_reward_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_threshold: number
          monthly_limit: number | null
          plan: string
          reward_credits: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_threshold?: number
          monthly_limit?: number | null
          plan: string
          reward_credits?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_threshold?: number
          monthly_limit?: number | null
          plan?: string
          reward_credits?: number
          updated_at?: string
        }
        Relationships: []
      }
      seo_apply_verifications: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          expected: Json
          force_republish: boolean
          id: string
          live: Json
          matches: Json
          page_id: string
          page_slug: string | null
          page_type: string | null
          page_url: string | null
          user_id: string
          verified_all: boolean
          website_id: string | null
          workspace_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          expected?: Json
          force_republish?: boolean
          id?: string
          live?: Json
          matches?: Json
          page_id: string
          page_slug?: string | null
          page_type?: string | null
          page_url?: string | null
          user_id: string
          verified_all?: boolean
          website_id?: string | null
          workspace_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          expected?: Json
          force_republish?: boolean
          id?: string
          live?: Json
          matches?: Json
          page_id?: string
          page_slug?: string | null
          page_type?: string | null
          page_url?: string | null
          user_id?: string
          verified_all?: boolean
          website_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      shared_templates: {
        Row: {
          author_name: string
          category: string
          content: string
          created_at: string
          description: string
          downloads: number
          id: string
          is_approved: boolean
          schema_type: string | null
          seo_description_pattern: string | null
          seo_title_pattern: string | null
          template_id: string
          updated_at: string
          user_id: string
          variables: string[]
          workspace_id: string | null
        }
        Insert: {
          author_name?: string
          category?: string
          content: string
          created_at?: string
          description?: string
          downloads?: number
          id?: string
          is_approved?: boolean
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          template_id: string
          updated_at?: string
          user_id: string
          variables?: string[]
          workspace_id?: string | null
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          created_at?: string
          description?: string
          downloads?: number
          id?: string
          is_approved?: boolean
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
          variables?: string[]
          workspace_id?: string | null
        }
        Relationships: []
      }
      shopify_connections: {
        Row: {
          access_token: string
          created_at: string
          id: string
          scopes: string | null
          shop_domain: string
          updated_at: string
          user_id: string
          website_id: string | null
          workspace_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          scopes?: string | null
          shop_domain: string
          updated_at?: string
          user_id: string
          website_id?: string | null
          workspace_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          scopes?: string | null
          shop_domain?: string
          updated_at?: string
          user_id?: string
          website_id?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      shopify_field_mappings: {
        Row: {
          campaign_id: string | null
          created_at: string
          field_map: Json
          id: string
          metafields: Json
          updated_at: string
          user_id: string
          variant_map: Json
          website_id: string
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          field_map?: Json
          id?: string
          metafields?: Json
          updated_at?: string
          user_id: string
          variant_map?: Json
          website_id: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          field_map?: Json
          id?: string
          metafields?: Json
          updated_at?: string
          user_id?: string
          variant_map?: Json
          website_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      shopify_oauth_states: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          id: string
          language: string | null
          shop_domain: string
          site_name: string | null
          state: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          language?: string | null
          shop_domain: string
          site_name?: string | null
          state: string
          user_id: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          language?: string | null
          shop_domain?: string
          site_name?: string | null
          state?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      shopify_sync_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          product_title: string | null
          shopify_product_id: number
          synced_at: string
          user_id: string
          website_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          product_title?: string | null
          shopify_product_id: number
          synced_at?: string
          user_id: string
          website_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          product_title?: string | null
          shopify_product_id?: number
          synced_at?: string
          user_id?: string
          website_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      site_index_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          details: Json
          id: string
          kind: string
          message: string | null
          status: string
          url_count: number
          user_id: string
          website_id: string
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          kind: string
          message?: string | null
          status?: string
          url_count?: number
          user_id: string
          website_id: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          message?: string | null
          status?: string
          url_count?: number
          user_id?: string
          website_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      sitemaps: {
        Row: {
          campaign_id: string | null
          content: string
          created_at: string
          id: string
          indexnow_key: string | null
          last_generated_at: string
          last_ping_at: string | null
          last_ping_result: Json | null
          page_count: number
          robots_checked_at: string | null
          robots_result: Json | null
          sitemap_url: string | null
          updated_at: string
          user_id: string
          website_id: string
          workspace_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          content?: string
          created_at?: string
          id?: string
          indexnow_key?: string | null
          last_generated_at?: string
          last_ping_at?: string | null
          last_ping_result?: Json | null
          page_count?: number
          robots_checked_at?: string | null
          robots_result?: Json | null
          sitemap_url?: string | null
          updated_at?: string
          user_id: string
          website_id: string
          workspace_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          content?: string
          created_at?: string
          id?: string
          indexnow_key?: string | null
          last_generated_at?: string
          last_ping_at?: string | null
          last_ping_result?: Json | null
          page_count?: number
          robots_checked_at?: string | null
          robots_result?: Json | null
          sitemap_url?: string | null
          updated_at?: string
          user_id?: string
          website_id?: string
          workspace_id?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      subscriptions: {
        Row: {
          ai_generations_limit: number
          ai_generations_used: number
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pages_limit: number
          pages_used: number
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_generations_limit?: number
          ai_generations_used?: number
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pages_limit?: number
          pages_used?: number
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_generations_limit?: number
          ai_generations_used?: number
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pages_limit?: number
          pages_used?: number
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          ai_provider: string
          ai_provider_content: string | null
          ai_provider_design: string | null
          feature_flags: Json
          id: string
          maintenance_message: string | null
          maintenance_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_provider?: string
          ai_provider_content?: string | null
          ai_provider_design?: string | null
          feature_flags?: Json
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_provider?: string
          ai_provider_content?: string | null
          ai_provider_design?: string | null
          feature_flags?: Json
          id?: string
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      template_backfill_items: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          fields: number | null
          id: string
          run_id: string
          status: string
          template_id: string | null
          template_name: string | null
          updated_at: string
          widgets: number | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          fields?: number | null
          id?: string
          run_id: string
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          widgets?: number | null
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          fields?: number | null
          id?: string
          run_id?: string
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          widgets?: number | null
        }
        Relationships: []
      }
      template_backfill_page_items: {
        Row: {
          created_at: string
          has_icon_widgets: boolean
          id: string
          page_id: string | null
          page_slug: string | null
          page_status: string | null
          page_title: string | null
          run_id: string
          status: string
          template_id: string | null
          template_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_icon_widgets?: boolean
          id?: string
          page_id?: string | null
          page_slug?: string | null
          page_status?: string | null
          page_title?: string | null
          run_id: string
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_icon_widgets?: boolean
          id?: string
          page_id?: string | null
          page_slug?: string | null
          page_status?: string | null
          page_title?: string | null
          run_id?: string
          status?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      template_backfill_runs: {
        Row: {
          converted: number
          created_at: string
          error: string | null
          failed: number
          finished_at: string | null
          force: boolean
          id: string
          processed: number
          retry_of_run_id: string | null
          skipped: number
          started_at: string
          started_by: string | null
          status: string
          total_templates: number
          trigger_source: string
          updated_at: string
        }
        Insert: {
          converted?: number
          created_at?: string
          error?: string | null
          failed?: number
          finished_at?: string | null
          force?: boolean
          id?: string
          processed?: number
          retry_of_run_id?: string | null
          skipped?: number
          started_at?: string
          started_by?: string | null
          status?: string
          total_templates?: number
          trigger_source?: string
          updated_at?: string
        }
        Update: {
          converted?: number
          created_at?: string
          error?: string | null
          failed?: number
          finished_at?: string | null
          force?: boolean
          id?: string
          processed?: number
          retry_of_run_id?: string | null
          skipped?: number
          started_at?: string
          started_by?: string | null
          status?: string
          total_templates?: number
          trigger_source?: string
          updated_at?: string
        }
        Relationships: []
      }
      template_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          shared_template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          shared_template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          shared_template_id?: string
          user_id?: string
        }
        Relationships: []
      }
      template_versions: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          elementor_data: Json | null
          id: string
          name: string
          schema_config: Json | null
          schema_type: string | null
          seo_description_pattern: string | null
          seo_title_pattern: string | null
          template_id: string
          template_kind: string | null
          user_id: string
          variables: string[] | null
          version_number: number
          workspace_id: string | null
        }
        Insert: {
          change_summary?: string | null
          content?: string
          created_at?: string
          elementor_data?: Json | null
          id?: string
          name: string
          schema_config?: Json | null
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          template_id: string
          template_kind?: string | null
          user_id: string
          variables?: string[] | null
          version_number?: number
          workspace_id?: string | null
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          elementor_data?: Json | null
          id?: string
          name?: string
          schema_config?: Json | null
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          template_id?: string
          template_kind?: string | null
          user_id?: string
          variables?: string[] | null
          version_number?: number
          workspace_id?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          container_width: number | null
          container_width_mobile: number | null
          container_width_tablet: number | null
          content: string
          created_at: string
          elementor_data: Json | null
          elementor_page_template: string | null
          gutter_desktop: number | null
          gutter_mobile: number | null
          gutter_tablet: number | null
          id: string
          name: string
          schema_config: Json | null
          schema_type: string | null
          seo_description_pattern: string | null
          seo_title_pattern: string | null
          source_imported_at: string | null
          source_marketplace_id: string | null
          source_version: string | null
          template_kind: string
          updated_at: string
          user_id: string
          variables: string[] | null
          vibe_theme: Json | null
          workspace_id: string | null
        }
        Insert: {
          container_width?: number | null
          container_width_mobile?: number | null
          container_width_tablet?: number | null
          content: string
          created_at?: string
          elementor_data?: Json | null
          elementor_page_template?: string | null
          gutter_desktop?: number | null
          gutter_mobile?: number | null
          gutter_tablet?: number | null
          id?: string
          name: string
          schema_config?: Json | null
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          source_imported_at?: string | null
          source_marketplace_id?: string | null
          source_version?: string | null
          template_kind?: string
          updated_at?: string
          user_id: string
          variables?: string[] | null
          vibe_theme?: Json | null
          workspace_id?: string | null
        }
        Update: {
          container_width?: number | null
          container_width_mobile?: number | null
          container_width_tablet?: number | null
          content?: string
          created_at?: string
          elementor_data?: Json | null
          elementor_page_template?: string | null
          gutter_desktop?: number | null
          gutter_mobile?: number | null
          gutter_tablet?: number | null
          id?: string
          name?: string
          schema_config?: Json | null
          schema_type?: string | null
          seo_description_pattern?: string | null
          seo_title_pattern?: string | null
          source_imported_at?: string | null
          source_marketplace_id?: string | null
          source_version?: string | null
          template_kind?: string
          updated_at?: string
          user_id?: string
          variables?: string[] | null
          vibe_theme?: Json | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_ai_access: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          monthly_credit_limit: number | null
          notes: string | null
          provider: string
          purposes: string[]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          monthly_credit_limit?: number | null
          notes?: string | null
          provider?: string
          purposes?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          monthly_credit_limit?: number | null
          notes?: string | null
          provider?: string
          purposes?: string[]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
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
      webhook_endpoints: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_status_code: number | null
          last_triggered_at: string | null
          secret: string | null
          updated_at: string
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret?: string | null
          updated_at?: string
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
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
          inline_assets_fallback: boolean
          language: string | null
          language_locked: boolean
          last_sync: string | null
          name: string
          shop_details: Json | null
          site_context: Json | null
          status: Database["public"]["Enums"]["website_status"]
          type: Database["public"]["Enums"]["website_type"]
          updated_at: string
          url: string
          user_id: string
          workspace_id: string | null
          wp_plugin_settings: Json
        }
        Insert: {
          created_at?: string
          credentials?: Json | null
          google_indexing_enabled?: boolean | null
          google_service_account?: Json | null
          id?: string
          inline_assets_fallback?: boolean
          language?: string | null
          language_locked?: boolean
          last_sync?: string | null
          name: string
          shop_details?: Json | null
          site_context?: Json | null
          status?: Database["public"]["Enums"]["website_status"]
          type: Database["public"]["Enums"]["website_type"]
          updated_at?: string
          url: string
          user_id: string
          workspace_id?: string | null
          wp_plugin_settings?: Json
        }
        Update: {
          created_at?: string
          credentials?: Json | null
          google_indexing_enabled?: boolean | null
          google_service_account?: Json | null
          id?: string
          inline_assets_fallback?: boolean
          language?: string | null
          language_locked?: boolean
          last_sync?: string | null
          name?: string
          shop_details?: Json | null
          site_context?: Json | null
          status?: Database["public"]["Enums"]["website_status"]
          type?: Database["public"]["Enums"]["website_type"]
          updated_at?: string
          url?: string
          user_id?: string
          workspace_id?: string | null
          wp_plugin_settings?: Json
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          workspace_id?: string
        }
        Relationships: []
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
        Relationships: []
      }
      workspaces: {
        Row: {
          branding: Json | null
          created_at: string
          elementor_container_width: number
          id: string
          locale: string
          name: string
          owner_id: string
          plan: string
          seo_defaults: Json
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          branding?: Json | null
          created_at?: string
          elementor_container_width?: number
          id?: string
          locale?: string
          name: string
          owner_id: string
          plan?: string
          seo_defaults?: Json
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          branding?: Json | null
          created_at?: string
          elementor_container_width?: number
          id?: string
          locale?: string
          name?: string
          owner_id?: string
          plan?: string
          seo_defaults?: Json
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      shopify_connections_safe: {
        Row: {
          created_at: string | null
          id: string | null
          scopes: string | null
          shop_domain: string | null
          updated_at: string | null
          user_id: string | null
          website_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          scopes?: string | null
          shop_domain?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          scopes?: string | null
          shop_domain?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_page_counts: {
        Row: {
          pages_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      campaign_limit_for_plan: { Args: { _plan: string }; Returns: number }
      can_access_realtime_topic: { Args: { _topic: string }; Returns: boolean }
      current_verified_email: { Args: never; Returns: string }
      deduct_ai_credits: {
        Args: {
          p_credits: number
          p_metadata?: Json
          p_model?: string
          p_prompt_type: string
          p_user_id: string
        }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_campaign_csv_window: {
        Args: { _campaign_id: string; _row_count?: number; _start_row?: number }
        Returns: Json
      }
      get_location_meta: {
        Args: { _country_code: string }
        Returns: {
          regions: string[]
          states: string[]
        }[]
      }
      get_shopify_access_token: {
        Args: { _website_id: string }
        Returns: string
      }
      get_template_rating_stats: {
        Args: never
        Returns: {
          avg_rating: number
          rating_count: number
          shared_template_id: string
        }[]
      }
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
      log_security_event: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
          _workspace_id: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_invoice_number: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      template_limit_for_plan: { Args: { _plan: string }; Returns: number }
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
      page_status:
        | "pending"
        | "published"
        | "failed"
        | "queued"
        | "generating"
        | "publishing"
        | "done"
      website_status: "connected" | "error" | "disconnected"
      website_type: "wordpress" | "shopify" | "prestashop" | "woocommerce"
      workspace_role: "owner" | "admin" | "member" | "readonly"
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
      page_status: [
        "pending",
        "published",
        "failed",
        "queued",
        "generating",
        "publishing",
        "done",
      ],
      website_status: ["connected", "error", "disconnected"],
      website_type: ["wordpress", "shopify", "prestashop", "woocommerce"],
      workspace_role: ["owner", "admin", "member", "readonly"],
    },
  },
} as const

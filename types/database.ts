export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          plan: string
          situations_count: number
          situations_limit: number
          ai_advice_used: number
          ai_advice_limit: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          plan?: string
          situations_count?: number
          situations_limit?: number
          ai_advice_used?: number
          ai_advice_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          plan?: string
          situations_count?: number
          situations_limit?: number
          ai_advice_used?: number
          ai_advice_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      situations: {
        Row: {
          id: string
          user_id: string
          name: string
          avatar_emoji: string
          stage: string
          emotional_invest: number
          compatibility: number
          first_contact: string | null
          last_interaction: string | null
          vibe: string
          red_flags: string[]
          green_flags: string[]
          notes: string
          contact_method: string
          is_archived: boolean
          is_breakup_mode: boolean
          no_contact_started: string | null
          no_contact_reasons: string[]
          recovery_milestones: string[]
          memory_summary: string | null
          private_vault: string
          match_id: string | null
          situation_person_type: string
          manual_name: string | null
          manual_photo_url: string | null
          matched_user_id: string | null
          dating_profile_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          avatar_emoji?: string
          stage?: string
          emotional_invest?: number
          compatibility?: number
          first_contact?: string | null
          last_interaction?: string | null
          vibe?: string
          red_flags?: string[]
          green_flags?: string[]
          notes?: string
          contact_method?: string
          is_archived?: boolean
          is_breakup_mode?: boolean
          no_contact_started?: string | null
          no_contact_reasons?: string[]
          recovery_milestones?: string[]
          memory_summary?: string | null
          private_vault?: string
          match_id?: string | null
          situation_person_type?: string
          manual_name?: string | null
          manual_photo_url?: string | null
          matched_user_id?: string | null
          dating_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          avatar_emoji?: string
          stage?: string
          emotional_invest?: number
          compatibility?: number
          first_contact?: string | null
          last_interaction?: string | null
          vibe?: string
          red_flags?: string[]
          green_flags?: string[]
          notes?: string
          contact_method?: string
          is_archived?: boolean
          is_breakup_mode?: boolean
          no_contact_started?: string | null
          no_contact_reasons?: string[]
          recovery_milestones?: string[]
          memory_summary?: string | null
          private_vault?: string
          match_id?: string | null
          situation_person_type?: string
          manual_name?: string | null
          manual_photo_url?: string | null
          matched_user_id?: string | null
          dating_profile_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          id: string
          situation_id: string
          user_id: string
          type: string
          note: string
          sentiment: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          situation_id: string
          user_id: string
          type: string
          note?: string
          sentiment?: string
          date?: string
          created_at?: string
        }
        Update: {
          id?: string
          situation_id?: string
          user_id?: string
          type?: string
          note?: string
          sentiment?: string
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      ai_advice: {
        Row: {
          id: string
          situation_id: string
          user_id: string
          question: string
          advice: string
          advice_type: string
          created_at: string
        }
        Insert: {
          id?: string
          situation_id: string
          user_id: string
          question: string
          advice: string
          advice_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          situation_id?: string
          user_id?: string
          question?: string
          advice?: string
          advice_type?: string
          created_at?: string
        }
        Relationships: []
      }
      relationship_reports: {
        Row: {
          id: string
          user_id: string
          situation_id: string
          title: string
          summary: string
          recommended_next_steps: string[]
          content_html: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          situation_id: string
          title: string
          summary: string
          recommended_next_steps?: string[]
          content_html: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          situation_id?: string
          title?: string
          summary?: string
          recommended_next_steps?: string[]
          content_html?: string
          created_at?: string
        }
        Relationships: []
      }
      weekly_summaries: {
        Row: {
          id: string
          user_id: string
          week_start: string
          week_end: string
          emotional_trend: string
          biggest_red_flag: string
          healthiest_connection: string
          most_draining_situation: string
          no_contact_progress: string
          suggested_focus: string
          summary: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          week_end: string
          emotional_trend: string
          biggest_red_flag: string
          healthiest_connection: string
          most_draining_situation: string
          no_contact_progress: string
          suggested_focus: string
          summary: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          week_end?: string
          emotional_trend?: string
          biggest_red_flag?: string
          healthiest_connection?: string
          most_draining_situation?: string
          no_contact_progress?: string
          suggested_focus?: string
          summary?: string
          created_at?: string
        }
        Relationships: []
      }
      dating_profiles: {
        Row: {
          user_id: string
          display_name: string
          age: number
          bio: string
          gender: string
          interested_in: string
          relationship_goal: string
          interests: string[]
          city: string
          visibility_status: string
          verification_status: string
          use_nickname: boolean
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          display_name: string
          age: number
          bio?: string
          gender: string
          interested_in: string
          relationship_goal: string
          interests?: string[]
          city?: string
          visibility_status?: string
          verification_status?: string
          use_nickname?: boolean
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          display_name?: string
          age?: number
          bio?: string
          gender?: string
          interested_in?: string
          relationship_goal?: string
          interests?: string[]
          city?: string
          visibility_status?: string
          verification_status?: string
          use_nickname?: boolean
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_photos: {
        Row: {
          id: string
          user_id: string
          photo_url: string
          storage_path: string | null
          source: string
          mime_type: string | null
          size_bytes: number | null
          position: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          photo_url: string
          storage_path?: string | null
          source?: string
          mime_type?: string | null
          size_bytes?: number | null
          position?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          photo_url?: string
          storage_path?: string | null
          source?: string
          mime_type?: string | null
          size_bytes?: number | null
          position?: number
          is_primary?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profile_likes: {
        Row: {
          id: string
          liker_user_id: string
          liked_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          liker_user_id: string
          liked_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          liker_user_id?: string
          liked_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      profile_passes: {
        Row: {
          id: string
          passer_user_id: string
          passed_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          passer_user_id: string
          passed_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          passer_user_id?: string
          passed_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          user_one_id: string
          user_two_id: string
          last_message_at: string | null
          last_activity_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_one_id: string
          user_two_id: string
          last_message_at?: string | null
          last_activity_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_one_id?: string
          user_two_id?: string
          last_message_at?: string | null
          last_activity_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          id: string
          blocker_user_id: string
          blocked_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_user_id: string
          blocked_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_user_id?: string
          blocked_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          id: string
          reporter_user_id: string
          reported_user_id: string
          reason: string
          details: string
          status: string
          internal_notes: string
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_user_id: string
          reported_user_id: string
          reason: string
          details?: string
          status?: string
          internal_notes?: string
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_user_id?: string
          reported_user_id?: string
          reason?: string
          details?: string
          status?: string
          internal_notes?: string
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      dating_messages: {
        Row: {
          id: string
          match_id: string
          sender_id: string
          body: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          read_at: string | null
        }
        Insert: {
          id?: string
          match_id: string
          sender_id: string
          body: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          read_at?: string | null
        }
        Update: {
          id?: string
          match_id?: string
          sender_id?: string
          body?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          read_at?: string | null
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          id: string
          user_id: string
          image_url: string
          storage_path: string
          section: string
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          storage_path: string
          section: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          storage_path?: string
          section?: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_posts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      social_post_reactions: {
        Row: {
          id: string
          post_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_post_reactions_post_id_fkey'
            columns: ['post_id']
            isOneToOne: false
            referencedRelation: 'social_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'social_post_reactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          link_url: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          link_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          link_url?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

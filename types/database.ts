export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      groups: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          privacy: string
          allow_invites: boolean
          require_approval: boolean
          max_members: number | null
          rules: string[]
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          category?: string
          privacy?: string
          allow_invites?: boolean
          require_approval?: boolean
          max_members?: number | null
          rules?: string[]
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          privacy?: string
          allow_invites?: boolean
          require_approval?: boolean
          max_members?: number | null
          rules?: string[]
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
        }
        Relationships: []
      }
      group_discussions: {
        Row: {
          id: string
          group_id: string
          user_id: string
          title: string
          body: string
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          title?: string
          body: string
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          title?: string
          body?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      group_discussion_comments: {
        Row: {
          id: string
          discussion_id: string
          user_id: string
          parent_id: string | null
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          user_id: string
          parent_id?: string | null
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          user_id?: string
          parent_id?: string | null
          body?: string
        }
        Relationships: []
      }
      group_comment_likes: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_discussion_likes: {
        Row: {
          id: string
          discussion_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          user_id?: string
        }
        Relationships: []
      }
      group_reports: {
        Row: {
          id: string
          group_id: string
          reported_by: string
          reason: string
          description: string
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          reported_by: string
          reason?: string
          description?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          status?: string
          reviewed_by?: string
          reviewed_at?: string
        }
        Relationships: []
      }
      group_mutes: {
        Row: {
          id: string
          group_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_posts: {
        Row: {
          id: string
          bot_user_id: string
          post_id: string | null
          content_template: string
          generated_content: string
          post_type: string
          target_post_id: string | null
          scheduled_for: string | null
          posted_at: string | null
          status: string
          metadata: Json
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bot_user_id: string
          post_id?: string | null
          content_template: string
          generated_content: string
          post_type?: string
          target_post_id?: string | null
          scheduled_for?: string | null
          posted_at?: string | null
          status?: string
          metadata?: Json
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bot_user_id?: string
          post_id?: string | null
          content_template?: string
          generated_content?: string
          post_type?: string
          target_post_id?: string | null
          scheduled_for?: string | null
          posted_at?: string | null
          status?: string
          metadata?: Json
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_posts_bot_user_id_fkey"
            columns: ["bot_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_posts_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      bot_config: {
        Row: {
          id: string
          config_key: string
          config_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          config_key: string
          config_value: Json
          updated_at?: string
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      confessional_reactions: {
        Row: {
          id: string
          confessional_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          confessional_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          confessional_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: []
      }
      confessional_comments: {
        Row: {
          id: string
          confessional_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          confessional_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          confessional_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          parent_comment_id: string | null
          content: string
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          parent_comment_id?: string | null
          content: string
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          parent_comment_id?: string | null
          content?: string
          edited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      confessionals: {
        Row: {
          id: string
          user_id: string
          video_path: string
          thumbnail_path: string
          duration_seconds: number
          blur_level: number
          face_filter: string | null
          voice_effects: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_path: string
          thumbnail_path: string
          duration_seconds: number
          blur_level?: number
          face_filter?: string | null
          voice_effects?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_path?: string
          thumbnail_path?: string
          duration_seconds?: number
          blur_level?: number
          face_filter?: string | null
          voice_effects?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          follower_id: string
          followee_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          followee_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          followee_id?: string
          created_at?: string
        }
        Relationships: []
      }
      game_leaderboards: {
        Row: {
          id: string
          user_id: string
          game_id: string
          high_score: number
          game_version: string | null
          achieved_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_id: string
          high_score: number
          game_version?: string | null
          achieved_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_id?: string
          high_score?: number
          game_version?: string | null
          achieved_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          sound_id: string | null
          image_url: string | null
          visibility: string
          parent_id: string | null
          is_repost: boolean
          like_count: number
          audio_library_id: string | null
          created_at: string
          edited_at: string | null
          deleted: boolean
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          sound_id?: string | null
          image_url?: string | null
          visibility?: string
          parent_id?: string | null
          is_repost?: boolean
          like_count?: number
          audio_library_id?: string | null
          created_at?: string
          edited_at?: string | null
          deleted?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          sound_id?: string | null
          image_url?: string | null
          visibility?: string
          parent_id?: string | null
          is_repost?: boolean
          like_count?: number
          audio_library_id?: string | null
          created_at?: string
          edited_at?: string | null
          deleted?: boolean
        }
        Relationships: []
      }
      sounds: {
        Row: {
          id: string
          user_id: string
          name: string
          storage_path: string
          duration_seconds: number
          parameters: Json | null
          deleted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          storage_path: string
          duration_seconds: number
          parameters?: Json | null
          deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          storage_path?: string
          duration_seconds?: number
          parameters?: Json | null
          deleted?: boolean
          created_at?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          id: string
          author_id: string
          title: string
          excerpt: string
          content: string
          image_url: string
          author_name_override: string
          author_avatar_override: string
          section: 'latest' | 'editor' | 'archive'
          likes_count: number
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          excerpt?: string
          content: string
          image_url?: string
          author_name_override?: string
          author_avatar_override?: string
          section?: 'latest' | 'editor' | 'archive'
          likes_count?: number
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          excerpt?: string
          content?: string
          image_url?: string
          author_name_override?: string
          author_avatar_override?: string
          section?: 'latest' | 'editor' | 'archive'
          likes_count?: number
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      story_reactions: {
        Row: {
          id: string
          story_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          challenge_id: string
          unlocked_at: string
        }
        Insert: {
          id?: string
          user_id: string
          challenge_id: string
          unlocked_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          challenge_id?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          slug: string
          name: string
          description: string
          threshold: Json
          badge_url: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description: string
          threshold: Json
          badge_url: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string
          threshold?: Json
          badge_url?: string
          created_at?: string
        }
        Relationships: []
      }
      sound_battles: {
        Row: {
          id: string
          challenger_id: string
          opponent_id: string
          theme: string
          wager_amount: number
          submission_period_hours: number
          voting_period_hours: number
          status: 'pending' | 'active' | 'voting' | 'completed' | 'cancelled' | 'draw'
          winner_id: string | null
          created_at: string
          accepted_at: string | null
          submission_deadline: string | null
          voting_deadline: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          challenger_id: string
          opponent_id: string
          theme: string
          wager_amount: number
          submission_period_hours: number
          voting_period_hours: number
          status?: 'pending' | 'active' | 'voting' | 'completed' | 'cancelled' | 'draw'
          winner_id?: string | null
          created_at?: string
          accepted_at?: string | null
          submission_deadline?: string | null
          voting_deadline?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          challenger_id?: string
          opponent_id?: string
          theme?: string
          wager_amount?: number
          submission_period_hours?: number
          voting_period_hours?: number
          status?: 'pending' | 'active' | 'voting' | 'completed' | 'cancelled' | 'draw'
          winner_id?: string | null
          created_at?: string
          accepted_at?: string | null
          submission_deadline?: string | null
          voting_deadline?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
      battle_submissions: {
        Row: {
          id: string
          battle_id: string
          user_id: string
          sound_id: string
          submitted_at: string
        }
        Insert: {
          id?: string
          battle_id: string
          user_id: string
          sound_id: string
          submitted_at?: string
        }
        Update: {
          id?: string
          battle_id?: string
          user_id?: string
          sound_id?: string
          submitted_at?: string
        }
        Relationships: []
      }
      battle_votes: {
        Row: {
          id: string
          battle_id: string
          voter_id: string
          voted_for_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          battle_id: string
          voter_id: string
          voted_for_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          battle_id?: string
          voter_id?: string
          voted_for_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          battle_id: string | null
          related_user_id: string | null
          group_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          battle_id?: string | null
          related_user_id?: string | null
          group_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          battle_id?: string | null
          related_user_id?: string | null
          group_id?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      battle_themes: {
        Row: {
          id: string
          theme: string
          category: 'space' | 'underwater' | 'comedy' | 'horror' | 'nature' | 'sci-fi' | 'fantasy' | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          is_active: boolean
        }
        Insert: {
          id?: string
          theme: string
          category?: 'space' | 'underwater' | 'comedy' | 'horror' | 'nature' | 'sci-fi' | 'fantasy' | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          is_active?: boolean
        }
        Update: {
          id?: string
          theme?: string
          category?: 'space' | 'underwater' | 'comedy' | 'horror' | 'nature' | 'sci-fi' | 'fantasy' | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          is_active?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_level: number
          role_title: string
          assigned_by: string | null
          assigned_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role_level: number
          role_title?: string
          assigned_by?: string | null
          assigned_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role_level?: number
          role_title?: string
          assigned_by?: string | null
          assigned_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          location: string | null
          avatar_url: string | null
          banner_url: string | null
          is_private: boolean
          is_premium: boolean
          premium_tier: string
          is_admin: boolean
          is_bot: boolean
          bot_personality: Json | null
          fb_coins: number
          fb_gold: number
          premium_since: string | null
          last_username_change_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          location?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          is_private?: boolean
          is_premium?: boolean
          premium_tier?: string
          is_admin?: boolean
          is_bot?: boolean
          bot_personality?: Json | null
          fb_coins?: number
          fb_gold?: number
          premium_since?: string | null
          last_username_change_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          location?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          is_private?: boolean
          is_premium?: boolean
          premium_tier?: string
          is_admin?: boolean
          is_bot?: boolean
          bot_personality?: Json | null
          fb_coins?: number
          fb_gold?: number
          premium_since?: string | null
          last_username_change_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_notes: {
        Row: {
          id: string
          user_id: string
          page_path: string
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          page_path: string
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          page_path?: string
          text?: string
          created_at?: string
        }
        Relationships: []
      }
      audio_library: {
        Row: {
          id: string
          name: string
          storage_path: string
          description: string | null
          category: string | null
          tags: string[] | null
          duration_seconds: number | null
          file_size_bytes: number | null
          deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          storage_path: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          storage_path?: string
          description?: string | null
          category?: string | null
          tags?: string[] | null
          duration_seconds?: number | null
          file_size_bytes?: number | null
          deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fart_jokes: {
        Row: {
          id: string
          user_id: string
          setup: string
          punchline: string
          fire_count: number
          dislike_count: number
          created_at: string
          deleted: boolean
        }
        Insert: {
          id?: string
          user_id: string
          setup: string
          punchline: string
          fire_count?: number
          dislike_count?: number
          created_at?: string
          deleted?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          setup?: string
          punchline?: string
          fire_count?: number
          dislike_count?: number
          created_at?: string
          deleted?: boolean
        }
        Relationships: []
      }
      fart_joke_reactions: {
        Row: {
          id: string
          joke_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          joke_id: string
          user_id: string
          reaction_type: string
          created_at?: string
        }
        Update: {
          id?: string
          joke_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
        Relationships: []
      }
      content_flags: {
        Row: {
          id: string
          content_type: string
          content_id: string
          reported_by: string
          reason: string
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          content_type: string
          content_id: string
          reported_by: string
          reason: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          content_type?: string
          content_id?: string
          reported_by?: string
          reason?: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Relationships: []
      }
      engagement_scores: {
        Row: {
          id: string
          post_id: string
          score: number
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_username: {
        Args: {
          user_uuid: string
          new_username: string
        }
        Returns: undefined
      }
      can_change_username: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      upgrade_to_premium: {
        Args: {
          user_uuid: string
        }
        Returns: undefined
      }
      award_achievement_if_eligible: {
        Args: {
          p_user_id: string
          p_challenge_slug: string
        }
        Returns: boolean
      }
      upsert_game_high_score: {
        Args: {
          p_user_id: string
          p_game_id: string
          p_score: number
        }
        Returns: Json
      }
      get_game_leaderboard: {
        Args: {
          p_game_id: string
          p_limit?: number
        }
        Returns: {
          rank: number
          user_id: string
          username: string
          display_name: string | null
          high_score: number
          achieved_at: string
        }[]
      }
      create_battle_challenge: {
        Args: {
          p_challenger_id: string
          p_opponent_id: string
          p_theme: string
          p_wager_amount: number
          p_submission_period_hours: number
          p_voting_period_hours: number
        }
        Returns: string
      }
      accept_battle_challenge: {
        Args: {
          p_battle_id: string
          p_opponent_id: string
        }
        Returns: undefined
      }
      cancel_battle: {
        Args: {
          p_battle_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      submit_to_battle: {
        Args: {
          p_battle_id: string
          p_user_id: string
          p_sound_id: string
        }
        Returns: undefined
      }
      vote_in_battle: {
        Args: {
          p_battle_id: string
          p_voter_id: string
          p_voted_for_user_id: string
        }
        Returns: undefined
      }
      finalize_battle: {
        Args: {
          p_battle_id: string
        }
        Returns: undefined
      }
      get_hall_of_fame: {
        Args: {
          p_limit?: number
        }
        Returns: {
          rank: number
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          fb_gold: number
          is_premium: boolean
        }[]
      }
      delete_post: {
        Args: {
          post_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      share_post_to_user: {
        Args: {
          p_target_user_id: string
          p_content: string
          p_sound_id?: string | null
        }
        Returns: undefined
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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clubs: {
        Row: {
          id: string;
          slug: string;
          public_name: string;
          official_name: string;
          association: string | null;
          competition_level: string | null;
          country: string;
          voivodeship: string | null;
          status: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          public_name: string;
          official_name?: string;
          association?: string | null;
          competition_level?: string | null;
          country?: string;
          voivodeship?: string | null;
          status?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          public_name?: string;
          official_name?: string;
          association?: string | null;
          competition_level?: string | null;
          country?: string;
          voivodeship?: string | null;
          status?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          category: Database["public"]["Enums"]["team_category"];
          season: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          category: Database["public"]["Enums"]["team_category"];
          season?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          name?: string;
          category?: Database["public"]["Enums"]["team_category"];
          season?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      club_memberships: {
        Row: {
          id: string;
          club_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["club_role"];
          status: Database["public"]["Enums"]["membership_status"];
          team_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["club_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          team_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["club_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          club_id: string;
          team_id: string | null;
          first_name: string;
          last_name: string;
          photo_url: string | null;
          date_of_birth: string;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          jersey_number: number | null;
          primary_position: Database["public"]["Enums"]["player_position"] | null;
          secondary_position: Database["public"]["Enums"]["player_position"] | null;
          dominant_foot: Database["public"]["Enums"]["dominant_foot"] | null;
          height_cm: number | null;
          weight_kg: number | null;
          status: Database["public"]["Enums"]["player_status"];
          joined_at: string | null;
          left_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          team_id?: string | null;
          first_name: string;
          last_name: string;
          photo_url?: string | null;
          date_of_birth: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          jersey_number?: number | null;
          primary_position?: Database["public"]["Enums"]["player_position"] | null;
          secondary_position?: Database["public"]["Enums"]["player_position"] | null;
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          status?: Database["public"]["Enums"]["player_status"];
          joined_at?: string | null;
          left_at?: string | null;
        };
        Update: {
          team_id?: string | null;
          first_name?: string;
          last_name?: string;
          photo_url?: string | null;
          date_of_birth?: string;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          jersey_number?: number | null;
          primary_position?: Database["public"]["Enums"]["player_position"] | null;
          secondary_position?: Database["public"]["Enums"]["player_position"] | null;
          dominant_foot?: Database["public"]["Enums"]["dominant_foot"] | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          status?: Database["public"]["Enums"]["player_status"];
          joined_at?: string | null;
          left_at?: string | null;
        };
        Relationships: [];
      };
      player_documents: {
        Row: {
          id: string;
          club_id: string;
          player_id: string;
          document_type: Database["public"]["Enums"]["player_document_type"];
          title: string;
          storage_path: string;
          file_name: string;
          mime_type: string | null;
          file_size: number | null;
          expires_at: string | null;
          notes: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          player_id: string;
          document_type: Database["public"]["Enums"]["player_document_type"];
          title: string;
          storage_path: string;
          file_name: string;
          mime_type?: string | null;
          file_size?: number | null;
          expires_at?: string | null;
          notes?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          title?: string;
          expires_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      player_stats: {
        Row: {
          id: string;
          club_id: string;
          player_id: string;
          season: string;
          matches_played: number;
          goals: number;
          assists: number;
          yellow_cards: number;
          red_cards: number;
          minutes_played: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          player_id: string;
          season: string;
          matches_played?: number;
          goals?: number;
          assists?: number;
          yellow_cards?: number;
          red_cards?: number;
          minutes_played?: number;
        };
        Update: {
          matches_played?: number;
          goals?: number;
          assists?: number;
          yellow_cards?: number;
          red_cards?: number;
          minutes_played?: number;
        };
        Relationships: [];
      };
      player_club_history: {
        Row: {
          id: string;
          club_id: string;
          player_id: string;
          event_type: Database["public"]["Enums"]["player_history_event_type"];
          event_date: string;
          description: string | null;
          previous_value: string | null;
          new_value: string | null;
          related_club_name: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          player_id: string;
          event_type: Database["public"]["Enums"]["player_history_event_type"];
          event_date: string;
          description?: string | null;
          previous_value?: string | null;
          new_value?: string | null;
          related_club_name?: string | null;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      player_injuries: {
        Row: {
          id: string;
          club_id: string;
          player_id: string;
          injury_date: string;
          recovery_date: string | null;
          description: string;
          severity: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          player_id: string;
          injury_date: string;
          recovery_date?: string | null;
          description: string;
          severity?: string | null;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          recovery_date?: string | null;
          description?: string;
          severity?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      player_coach_notes: {
        Row: {
          id: string;
          club_id: string;
          player_id: string;
          author_id: string;
          note_type: Database["public"]["Enums"]["coach_note_type"];
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          player_id: string;
          author_id: string;
          note_type?: Database["public"]["Enums"]["coach_note_type"];
          content: string;
        };
        Update: {
          note_type?: Database["public"]["Enums"]["coach_note_type"];
          content?: string;
        };
        Relationships: [];
      };
      trainings: {
        Row: {
          id: string;
          club_id: string;
          team_id: string;
          name: string;
          training_date: string;
          start_time: string;
          end_time: string;
          location: string | null;
          description: string | null;
          coach_user_id: string | null;
          status: Database["public"]["Enums"]["training_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          team_id: string;
          name: string;
          training_date: string;
          start_time: string;
          end_time: string;
          location?: string | null;
          description?: string | null;
          coach_user_id?: string | null;
          status?: Database["public"]["Enums"]["training_status"];
        };
        Update: {
          team_id?: string;
          name?: string;
          training_date?: string;
          start_time?: string;
          end_time?: string;
          location?: string | null;
          description?: string | null;
          coach_user_id?: string | null;
          status?: Database["public"]["Enums"]["training_status"];
        };
        Relationships: [];
      };
      training_availability: {
        Row: {
          id: string;
          club_id: string;
          training_id: string;
          player_id: string;
          status: Database["public"]["Enums"]["availability_status"];
          absence_reason: Database["public"]["Enums"]["absence_reason"] | null;
          notes: string | null;
          responded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          training_id: string;
          player_id: string;
          status?: Database["public"]["Enums"]["availability_status"];
          absence_reason?: Database["public"]["Enums"]["absence_reason"] | null;
          notes?: string | null;
          responded_by?: string | null;
        };
        Update: {
          status?: Database["public"]["Enums"]["availability_status"];
          absence_reason?: Database["public"]["Enums"]["absence_reason"] | null;
          notes?: string | null;
          responded_by?: string | null;
        };
        Relationships: [];
      };
      training_attendance: {
        Row: {
          id: string;
          club_id: string;
          training_id: string;
          player_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          notes: string | null;
          marked_by: string | null;
          marked_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          training_id: string;
          player_id: string;
          status: Database["public"]["Enums"]["attendance_status"];
          notes?: string | null;
          marked_by?: string | null;
          marked_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["attendance_status"];
          notes?: string | null;
          marked_by?: string | null;
        };
        Relationships: [];
      };
      training_session_notes: {
        Row: {
          id: string;
          club_id: string;
          training_id: string;
          author_id: string;
          player_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          training_id: string;
          author_id: string;
          player_id?: string | null;
          content: string;
        };
        Update: {
          player_id?: string | null;
          content?: string;
        };
        Relationships: [];
      };
      club_notifications: {
        Row: {
          id: string;
          club_id: string;
          user_id: string;
          training_id: string | null;
          reminder_type: Database["public"]["Enums"]["training_reminder_type"] | null;
          title: string;
          body: string;
          href: string | null;
          scheduled_at: string;
          read_at: string | null;
          delivery_channels: Json;
          created_at: string;
          sponsor_contract_id: string | null;
          sponsor_reminder_days: number | null;
        };
        Insert: {
          id?: string;
          club_id: string;
          user_id: string;
          training_id?: string | null;
          reminder_type?: Database["public"]["Enums"]["training_reminder_type"] | null;
          title: string;
          body: string;
          href?: string | null;
          scheduled_at: string;
          read_at?: string | null;
          delivery_channels?: Json;
          sponsor_contract_id?: string | null;
          sponsor_reminder_days?: number | null;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          club_id: string;
          team_id: string;
          competition: string;
          season: string;
          round_number: number | null;
          match_date: string;
          match_time: string;
          home_team_name: string;
          away_team_name: string;
          stadium: string | null;
          stadium_address: string | null;
          status: Database["public"]["Enums"]["match_status"];
          home_score: number | null;
          away_score: number | null;
          formation: string | null;
          mvp_player_id: string | null;
          coach_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          team_id: string;
          competition: string;
          season: string;
          round_number?: number | null;
          match_date: string;
          match_time: string;
          home_team_name: string;
          away_team_name: string;
          stadium?: string | null;
          stadium_address?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          home_score?: number | null;
          away_score?: number | null;
          formation?: string | null;
          mvp_player_id?: string | null;
          coach_notes?: string | null;
        };
        Update: {
          team_id?: string;
          competition?: string;
          season?: string;
          round_number?: number | null;
          match_date?: string;
          match_time?: string;
          home_team_name?: string;
          away_team_name?: string;
          stadium?: string | null;
          stadium_address?: string | null;
          status?: Database["public"]["Enums"]["match_status"];
          home_score?: number | null;
          away_score?: number | null;
          formation?: string | null;
          mvp_player_id?: string | null;
          coach_notes?: string | null;
        };
        Relationships: [];
      };
      match_squad: {
        Row: {
          id: string;
          club_id: string;
          match_id: string;
          player_id: string;
          squad_role: Database["public"]["Enums"]["match_squad_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          match_id: string;
          player_id: string;
          squad_role?: Database["public"]["Enums"]["match_squad_role"];
        };
        Update: { squad_role?: Database["public"]["Enums"]["match_squad_role"] };
        Relationships: [];
      };
      match_lineup_positions: {
        Row: {
          id: string;
          club_id: string;
          match_id: string;
          player_id: string;
          slot_code: string;
          pos_x: number;
          pos_y: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          match_id: string;
          player_id: string;
          slot_code: string;
          pos_x: number;
          pos_y: number;
        };
        Update: {
          slot_code?: string;
          pos_x?: number;
          pos_y?: number;
        };
        Relationships: [];
      };
      match_events: {
        Row: {
          id: string;
          club_id: string;
          match_id: string;
          event_type: Database["public"]["Enums"]["match_event_type"];
          minute: number;
          player_id: string | null;
          related_player_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          match_id: string;
          event_type: Database["public"]["Enums"]["match_event_type"];
          minute: number;
          player_id?: string | null;
          related_player_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      match_player_stats: {
        Row: {
          id: string;
          club_id: string;
          match_id: string;
          player_id: string;
          minutes_played: number;
          goals: number;
          assists: number;
          yellow_cards: number;
          red_cards: number;
          is_starter: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          match_id: string;
          player_id: string;
          minutes_played?: number;
          goals?: number;
          assists?: number;
          yellow_cards?: number;
          red_cards?: number;
          is_starter?: boolean;
        };
        Update: {
          minutes_played?: number;
          goals?: number;
          assists?: number;
          yellow_cards?: number;
          red_cards?: number;
          is_starter?: boolean;
        };
        Relationships: [];
      };
      match_mvp_history: {
        Row: {
          id: string;
          club_id: string;
          match_id: string;
          player_id: string;
          selected_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          match_id: string;
          player_id: string;
          selected_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      league_table_entries: {
        Row: {
          id: string;
          club_id: string;
          competition: string;
          season: string;
          team_name: string;
          played: number;
          won: number;
          drawn: number;
          lost: number;
          goals_for: number;
          goals_against: number;
          points: number;
          is_own_club: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          competition: string;
          season: string;
          team_name: string;
          played?: number;
          won?: number;
          drawn?: number;
          lost?: number;
          goals_for?: number;
          goals_against?: number;
          points?: number;
          is_own_club?: boolean;
          sort_order?: number;
        };
        Update: {
          played?: number;
          won?: number;
          drawn?: number;
          lost?: number;
          goals_for?: number;
          goals_against?: number;
          points?: number;
          is_own_club?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      ai_report_categories: {
        Row: {
          id: Database["public"]["Enums"]["ai_report_category"];
          label: string;
          sort_order: number;
        };
        Insert: {
          id: Database["public"]["Enums"]["ai_report_category"];
          label: string;
          sort_order?: number;
        };
        Update: {
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          club_id: string;
          user_id: string;
          title: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          user_id: string;
          title?: string;
          is_pinned?: boolean;
        };
        Update: {
          title?: string;
          is_pinned?: boolean;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          club_id: string;
          conversation_id: string;
          role: Database["public"]["Enums"]["ai_message_role"];
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          conversation_id: string;
          role: Database["public"]["Enums"]["ai_message_role"];
          content: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [];
      };
      ai_reports: {
        Row: {
          id: string;
          club_id: string;
          category: Database["public"]["Enums"]["ai_report_category"];
          report_type: Database["public"]["Enums"]["ai_report_type"];
          title: string;
          content: string;
          status: Database["public"]["Enums"]["ai_report_status"];
          metadata: Json;
          source_type: string | null;
          source_id: string | null;
          created_by: string | null;
          reviewed_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          category: Database["public"]["Enums"]["ai_report_category"];
          report_type: Database["public"]["Enums"]["ai_report_type"];
          title: string;
          content: string;
          status?: Database["public"]["Enums"]["ai_report_status"];
          metadata?: Json;
          source_type?: string | null;
          source_id?: string | null;
          created_by?: string | null;
          reviewed_by?: string | null;
          published_at?: string | null;
        };
        Update: {
          title?: string;
          content?: string;
          status?: Database["public"]["Enums"]["ai_report_status"];
          metadata?: Json;
          reviewed_by?: string | null;
          published_at?: string | null;
        };
        Relationships: [];
      };
      sponsors: {
        Row: {
          id: string;
          club_id: string;
          profile_id: string | null;
          company_name: string;
          logo_url: string | null;
          nip: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          website: string | null;
          phone: string | null;
          email: string | null;
          contact_first_name: string | null;
          contact_last_name: string | null;
          contact_position: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          cooperation_status: Database["public"]["Enums"]["sponsor_cooperation_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          profile_id?: string | null;
          company_name: string;
          logo_url?: string | null;
          nip?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          contact_first_name?: string | null;
          contact_last_name?: string | null;
          contact_position?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cooperation_status?: Database["public"]["Enums"]["sponsor_cooperation_status"];
        };
        Update: {
          profile_id?: string | null;
          company_name?: string;
          logo_url?: string | null;
          nip?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          website?: string | null;
          phone?: string | null;
          email?: string | null;
          contact_first_name?: string | null;
          contact_last_name?: string | null;
          contact_position?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cooperation_status?: Database["public"]["Enums"]["sponsor_cooperation_status"];
        };
        Relationships: [];
      };
      sponsor_contracts: {
        Row: {
          id: string;
          club_id: string;
          sponsor_id: string;
          name: string;
          start_date: string;
          end_date: string;
          value: number;
          currency: string;
          benefits_description: string | null;
          status: Database["public"]["Enums"]["sponsor_contract_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          sponsor_id: string;
          name: string;
          start_date: string;
          end_date: string;
          value?: number;
          currency?: string;
          benefits_description?: string | null;
          status?: Database["public"]["Enums"]["sponsor_contract_status"];
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          value?: number;
          currency?: string;
          benefits_description?: string | null;
        };
        Relationships: [];
      };
      sponsor_contract_attachments: {
        Row: {
          id: string;
          club_id: string;
          contract_id: string;
          file_name: string;
          file_url: string;
          file_size: number | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          contract_id: string;
          file_name: string;
          file_url: string;
          file_size?: number | null;
          uploaded_by?: string | null;
        };
        Update: {
          file_name?: string;
          file_url?: string;
        };
        Relationships: [];
      };
      sponsor_leads: {
        Row: {
          id: string;
          club_id: string;
          company_name: string;
          contact_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          status: Database["public"]["Enums"]["sponsor_lead_status"];
          notes: string | null;
          assigned_to: string | null;
          converted_sponsor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          company_name: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: Database["public"]["Enums"]["sponsor_lead_status"];
          notes?: string | null;
          assigned_to?: string | null;
        };
        Update: {
          company_name?: string;
          contact_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?: Database["public"]["Enums"]["sponsor_lead_status"];
          notes?: string | null;
        };
        Relationships: [];
      };
      sponsor_notes: {
        Row: {
          id: string;
          club_id: string;
          sponsor_id: string;
          note_type: Database["public"]["Enums"]["sponsor_note_type"];
          content: string;
          contact_date: string;
          author_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          sponsor_id: string;
          note_type?: Database["public"]["Enums"]["sponsor_note_type"];
          content: string;
          contact_date?: string;
          author_id: string;
        };
        Update: {
          note_type?: Database["public"]["Enums"]["sponsor_note_type"];
          content?: string;
          contact_date?: string;
        };
        Relationships: [];
      };
      sponsor_publications: {
        Row: {
          id: string;
          club_id: string;
          title: string;
          published_at: string;
          description: string | null;
          image_url: string | null;
          source: Database["public"]["Enums"]["sponsor_publication_source"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          published_at: string;
          description?: string | null;
          image_url?: string | null;
          source?: Database["public"]["Enums"]["sponsor_publication_source"];
        };
        Update: {
          title?: string;
          published_at?: string;
          description?: string | null;
          image_url?: string | null;
          source?: Database["public"]["Enums"]["sponsor_publication_source"];
        };
        Relationships: [];
      };
      sponsor_publication_links: {
        Row: {
          id: string;
          club_id: string;
          publication_id: string;
          sponsor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          publication_id: string;
          sponsor_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      sponsor_exposure: {
        Row: {
          id: string;
          club_id: string;
          sponsor_id: string;
          exposure_type: Database["public"]["Enums"]["sponsor_exposure_type"];
          title: string;
          description: string | null;
          exposure_date: string;
          publication_id: string | null;
          match_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          sponsor_id: string;
          exposure_type: Database["public"]["Enums"]["sponsor_exposure_type"];
          title: string;
          description?: string | null;
          exposure_date: string;
          publication_id?: string | null;
          match_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          exposure_date?: string;
        };
        Relationships: [];
      };
      sponsor_reports: {
        Row: {
          id: string;
          club_id: string;
          sponsor_id: string;
          period_start: string;
          period_end: string;
          title: string;
          content: Json;
          status: Database["public"]["Enums"]["sponsor_report_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          sponsor_id: string;
          period_start: string;
          period_end: string;
          title: string;
          content?: Json;
          status?: Database["public"]["Enums"]["sponsor_report_status"];
          created_by?: string | null;
        };
        Update: {
          title?: string;
          content?: Json;
          status?: Database["public"]["Enums"]["sponsor_report_status"];
        };
        Relationships: [];
      };
      sponsor_financial_entries: {
        Row: {
          id: string;
          club_id: string;
          sponsor_id: string;
          contract_id: string | null;
          entry_type: Database["public"]["Enums"]["sponsor_financial_entry_type"];
          amount: number;
          currency: string;
          due_date: string | null;
          paid_at: string | null;
          status: Database["public"]["Enums"]["sponsor_financial_status"];
          reference_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          sponsor_id: string;
          contract_id?: string | null;
          entry_type: Database["public"]["Enums"]["sponsor_financial_entry_type"];
          amount: number;
          currency?: string;
          due_date?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["sponsor_financial_status"];
          reference_number?: string | null;
          notes?: string | null;
        };
        Update: {
          amount?: number;
          due_date?: string | null;
          paid_at?: string | null;
          status?: Database["public"]["Enums"]["sponsor_financial_status"];
          reference_number?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      ai_suggestions: {
        Row: {
          id: string;
          club_id: string;
          suggestion_type: Database["public"]["Enums"]["ai_suggestion_type"];
          title: string;
          description: string;
          action_hint: string | null;
          metadata: Json;
          status: Database["public"]["Enums"]["ai_suggestion_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          suggestion_type: Database["public"]["Enums"]["ai_suggestion_type"];
          title: string;
          description: string;
          action_hint?: string | null;
          metadata?: Json;
          status?: Database["public"]["Enums"]["ai_suggestion_status"];
        };
        Update: {
          title?: string;
          description?: string;
          action_hint?: string | null;
          metadata?: Json;
          status?: Database["public"]["Enums"]["ai_suggestion_status"];
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      user_club_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      user_has_club_role: {
        Args: {
          p_club_id: string;
          p_roles: Database["public"]["Enums"]["club_role"][];
        };
        Returns: boolean;
      };
      get_sponsor_portal_schedule: {
        Args: {
          p_club_id: string;
          p_team_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      club_role:
        | "owner"
        | "president"
        | "sports_director"
        | "coach"
        | "player"
        | "parent"
        | "sponsor";
      membership_status: "active" | "invited" | "suspended" | "archived";
      team_category: "seniors" | "u18" | "u12" | "u10" | "other";
      player_status: "active" | "injured" | "suspended" | "inactive";
      player_position: "goalkeeper" | "defender" | "midfielder" | "forward";
      dominant_foot: "left" | "right" | "both";
      player_document_type:
        | "medical_exam"
        | "parent_consent"
        | "club_declaration"
        | "insurance"
        | "document_photo"
        | "other";
      player_history_event_type:
        | "transfer_in"
        | "transfer_out"
        | "previous_club"
        | "position_change"
        | "jersey_number_change";
      coach_note_type: "observation" | "progress" | "health" | "training_goal";
      training_status: "planned" | "completed" | "cancelled";
      availability_status: "present" | "absent" | "unknown";
      absence_reason: "work" | "school" | "injury" | "travel" | "illness" | "other";
      attendance_status: "present" | "absent" | "late" | "excused";
      training_reminder_type: "hours_48" | "hours_24" | "hours_3";
      match_status: "planned" | "in_progress" | "completed" | "cancelled" | "postponed";
      match_squad_role: "squad" | "starter" | "substitute";
      match_event_type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution" | "injury";
      ai_message_role: "user" | "assistant" | "system";
      ai_report_category: "matches" | "trainings" | "players" | "management" | "sponsors";
      ai_report_type:
        | "match_summary"
        | "training_weekly"
        | "management_monthly"
        | "social_facebook"
        | "social_instagram"
        | "social_website"
        | "social_round";
      ai_report_status: "draft" | "published" | "archived";
      ai_suggestion_type:
        | "low_attendance"
        | "missing_availability"
        | "expiring_documents"
        | "high_injuries";
      ai_suggestion_status: "open" | "dismissed" | "resolved";
      sponsor_cooperation_status: "active" | "expiring" | "ended" | "potential";
      sponsor_contract_status: "active" | "expiring" | "expired";
      sponsor_lead_status:
        | "new"
        | "in_discussion"
        | "offer_sent"
        | "negotiation"
        | "won"
        | "rejected";
      sponsor_note_type: "phone" | "meeting" | "email" | "note";
      sponsor_publication_source: "facebook" | "instagram" | "website" | "other";
      sponsor_exposure_type: "publication" | "sponsored_match" | "sponsored_event";
      sponsor_financial_entry_type: "payment" | "installment" | "invoice";
      sponsor_financial_status: "planned" | "pending" | "paid" | "overdue" | "cancelled";
      sponsor_report_status: "draft" | "published";
    };
    CompositeTypes: Record<string, never>;
  };
};

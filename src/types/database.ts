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
          official_name: string | null;
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
          official_name?: string | null;
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
          official_name?: string | null;
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
    };
    CompositeTypes: Record<string, never>;
  };
};

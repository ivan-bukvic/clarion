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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          chat_session_id: string
          cited_chunk_ids: string[]
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          chat_session_id: string
          cited_chunk_ids?: string[]
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          chat_session_id?: string
          cited_chunk_ids?: string[]
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      comparison_findings: {
        Row: {
          category: Database["public"]["Enums"]["finding_category"]
          comparison_id: string
          description: string
          id: string
          source_a_ref: string | null
          source_b_ref: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["finding_category"]
          comparison_id: string
          description: string
          id?: string
          source_a_ref?: string | null
          source_b_ref?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["finding_category"]
          comparison_id?: string
          description?: string
          id?: string
          source_a_ref?: string | null
          source_b_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comparison_findings_comparison_id_fkey"
            columns: ["comparison_id"]
            isOneToOne: false
            referencedRelation: "comparisons"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          completed_at: string | null
          created_at: string
          document_a_id: string
          document_b_id: string
          id: string
          status: Database["public"]["Enums"]["comparison_status"]
          summary: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_a_id: string
          document_b_id: string
          id?: string
          status?: Database["public"]["Enums"]["comparison_status"]
          summary?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_a_id?: string
          document_b_id?: string
          id?: string
          status?: Database["public"]["Enums"]["comparison_status"]
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_document_a_id_fkey"
            columns: ["document_a_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_document_b_id_fkey"
            columns: ["document_b_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          heading: string | null
          id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          heading?: string | null
          id?: string
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          heading?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_type: Database["public"]["Enums"]["document_file_type"]
          id: string
          purpose: Database["public"]["Enums"]["document_purpose"]
          source_file: string
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          title: string
        }
        Insert: {
          created_at?: string
          file_type: Database["public"]["Enums"]["document_file_type"]
          id?: string
          purpose: Database["public"]["Enums"]["document_purpose"]
          source_file: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          title: string
        }
        Update: {
          created_at?: string
          file_type?: Database["public"]["Enums"]["document_file_type"]
          id?: string
          purpose?: Database["public"]["Enums"]["document_purpose"]
          source_file?: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_document_chunks: {
        Args: {
          match_count: number
          min_similarity: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          // Hand-patched: generate_typescript_types emits RETURNS TABLE columns
          // as non-nullable; document_chunks.heading is nullable (PDF/TXT).
          // Re-apply after every future type regeneration.
          heading: string | null
          id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      comparison_status: "processing" | "completed" | "failed"
      document_file_type: "pdf" | "docx" | "txt"
      document_purpose: "corpus" | "comparison"
      document_status: "processing" | "ready" | "failed"
      finding_category:
        | "price_difference"
        | "missing_item"
        | "scope_difference"
        | "term_difference"
        | "other"
      message_role: "user" | "assistant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

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
      comparison_status: ["processing", "completed", "failed"],
      document_file_type: ["pdf", "docx", "txt"],
      document_purpose: ["corpus", "comparison"],
      document_status: ["processing", "ready", "failed"],
      finding_category: [
        "price_difference",
        "missing_item",
        "scope_difference",
        "term_difference",
        "other",
      ],
      message_role: ["user", "assistant"],
    },
  },
} as const

/**
 * ConversationManager - Handles chat conversation state and API interactions
 *
 * Responsibilities:
 * 1. Manages conversation state in memory
 * 2. Creates new conversations in Supabase
 * 3. Sends messages to backend API
 * 4. Persists messages to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { ref } from 'vue';
import { SummarizationService } from './SummarizationService';

// Environment variables are declared in src/env.d.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Allowed message roles in the chat */
export type MessageRole = 'system' | 'user' | 'assistant';

/** Structure of a chat message */
export interface Message {
  role: MessageRole;
  content: string;
  created_at?: string;
}

export interface ConversationContext {
  summary: string;
  keyTerms: string[];
  tags: string[];
  raw_conversation?: string;
}

export interface ApiError extends Error {
  status?: number;
  details?: any;
}

export class ConversationManager {
  private messages = ref<Message[]>([]);
  private context: ConversationContext = {
    summary: '',
    keyTerms: [],
    tags: [],
    raw_conversation: ''
  };
  private conversationId: string | null = null;
  private summarizationService: SummarizationService;
  private systemMessage =
    'You are a helpful AI assistant that provides clear, accurate, and engaging responses.';
  private loading = ref(false);
  private error: ApiError | null = null;

  constructor() {
    this.summarizationService = new SummarizationService();
    // Add system message at initialization
    this.messages.value.push({ role: 'system', content: this.systemMessage });
  }

  private setError(message: string, status?: number, details?: any) {
    const error = new Error(message) as ApiError;
    error.status = status;
    error.details = details;
    this.error = error;
    console.error('ConversationManager error:', error);
  }

  private clearError() {
    this.error = null;
  }

  /**
   * Creates a new conversation in Supabase
   * Called automatically on initialization
   */
  private async createNewConversation(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (error) throw error;
      this.conversationId = data.id;
      return data.id;
    } catch (error) {
      this.setError('Failed to create conversation', 500, error);
      throw error;
    }
  }

  /**
   * Updates the conversation context based on current messages
   */
  private async updateContext() {
    try {
      // Only summarize if we have enough messages
      if (this.messages.value.length < 3) {
        return;
      }

      // Combine all message content for summarization
      const conversationText = this.messages.value
        .filter(m => m.role !== 'system')
        .map(m => m.content)
        .join('\n\n');

      // Generate summary
      const { summary, keyTerms } = await this.summarizationService.summarize(
        conversationText
      );

      this.context = {
        summary,
        keyTerms,
        tags: keyTerms,
        raw_conversation: conversationText
      };

      // Save context to Supabase if needed
      if (this.conversationId) {
        const { error } = await supabase.from('conversation_contexts').upsert({
          conversation_id: this.conversationId,
          summary,
          key_terms: keyTerms,
          tags: keyTerms,
          raw_conversation: conversationText
        });

        if (error) {
          console.error('Error saving context:', error);
        }
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  /**
   * Sends a message to the AI and handles the response
   *
   * @param content - The message text to send
   * @returns The AI's response text
   */
  async sendMessage(content: string): Promise<void> {
    this.loading.value = true;
    this.clearError();
    console.log('Sending message:', content);
    console.log('Current messages before:', this.messages.value);

    try {
      // Add user message immediately
      this.messages.value.push({ role: 'user', content });
      console.log('Messages after user message:', this.messages.value);

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: this.messages.value
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response from API');
      }

      const data = await response.json();
      console.log('API response:', data);

      if (!data.message) {
        throw new Error('Invalid response from API');
      }

      // Add assistant's response
      this.messages.value.push({
        role: 'assistant',
        content: data.message
      });
      console.log('Final messages:', this.messages.value);
    } catch (err) {
      console.error('Error sending message:', err);
      this.setError(
        err instanceof Error ? err.message : 'Failed to send message'
      );
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Gets all messages in the current conversation
   * @returns Array of messages
   */
  getCurrentMessages(): Message[] {
    return this.messages.value;
  }

  getContext(): ConversationContext {
    return this.context;
  }

  async searchByTags(tags: string[]): Promise<any[]> {
    this.clearError();
    try {
      const { data, error } = await supabase.rpc(
        'search_conversations_by_tags',
        { search_tags: tags }
      );

      if (error) throw error;
      return data || [];
    } catch (error) {
      this.setError('Failed to search by tags', 500, error);
      return [];
    }
  }

  async injectContext(conversationId: string): Promise<void> {
    this.clearError();
    try {
      // Get the context of the selected conversation
      const { data: contextData, error: contextError } = await supabase
        .from('conversation_contexts')
        .select('summary, raw_conversation')
        .eq('conversation_id', conversationId)
        .single();

      if (contextError) throw contextError;

      // Add the context as a system message
      if (contextData?.summary) {
        this.messages.value.push({
          role: 'system',
          content: `Additional context from a related conversation:\n${contextData.summary}`
        });
      }
    } catch (error) {
      this.setError('Failed to inject context', 500, error);
      throw error;
    }
  }

  isLoading(): boolean {
    return this.loading.value;
  }

  getError(): ApiError | null {
    return this.error;
  }
}

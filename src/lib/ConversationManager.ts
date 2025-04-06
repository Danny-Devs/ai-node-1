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

interface ConversationContext {
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
  private context = ref<ConversationContext>({
    summary: '',
    keyTerms: [],
    tags: []
  });
  private conversationId: string | null = null;
  private summarizationService: SummarizationService;
  private systemMessage = 'You are a helpful AI assistant.';
  private loading = ref(false);
  private error = ref<ApiError | null>(null);

  constructor() {
    this.summarizationService = new SummarizationService();
  }

  private setError(message: string, status?: number, details?: any) {
    const error = new Error(message) as ApiError;
    error.status = status;
    error.details = details;
    this.error.value = error;
    console.error('ConversationManager error:', error);
  }

  private clearError() {
    this.error.value = null;
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

      this.context.value = {
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
    this.clearError();
    this.loading.value = true;

    try {
      if (!this.conversationId) {
        await this.createNewConversation();
      }

      // Add user message
      const userMessage: Message = { role: 'user', content };
      this.messages.value.push(userMessage);

      // Save user message
      const { error: msgError } = await supabase.from('messages').insert({
        conversation_id: this.conversationId,
        role: 'user',
        content
      });

      if (msgError) throw msgError;

      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: this.systemMessage },
            ...this.messages.value
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      };

      this.messages.value.push(assistantMessage);

      // Save assistant message
      const { error: aiMsgError } = await supabase.from('messages').insert({
        conversation_id: this.conversationId,
        role: 'assistant',
        content: data.message
      });

      if (aiMsgError) throw aiMsgError;

      // Update context after new messages
      await this.updateContext();
    } catch (error) {
      this.setError('Failed to send message', 500, error);
      throw error;
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
    return this.context.value;
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
    return this.error.value;
  }
}

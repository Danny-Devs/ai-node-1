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
interface Message {
  role: MessageRole;
  content: string;
}

interface ConversationContext {
  summary: string;
  keyTerms: string[];
  tags: string[];
  raw_conversation?: string;
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

  constructor() {
    this.summarizationService = new SummarizationService();
  }

  /**
   * Creates a new conversation in Supabase
   * Called automatically on initialization
   */
  private async createNewConversation(): Promise<string> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (error) throw error;
    this.conversationId = data.id;
    return data.id;
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
    if (!this.conversationId) {
      await this.createNewConversation();
    }

    // Add user message
    const userMessage: Message = { role: 'user', content };
    this.messages.value.push(userMessage);

    try {
      // Save user message
      await supabase.from('messages').insert({
        conversation_id: this.conversationId,
        role: 'user',
        content
      });

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
        throw new Error('Failed to get AI response');
      }

      const { message: assistantMessage } = await response.json();

      // Add assistant message to local state
      const assistantMessageObj: Message = {
        role: 'assistant',
        content: assistantMessage
      };
      this.messages.value.push(assistantMessageObj);

      // Save AI message to Supabase
      const { error: aiMsgError } = await supabase.from('messages').insert([
        {
          conversation_id: this.conversationId,
          role: assistantMessageObj.role,
          content: assistantMessageObj.content
        }
      ]);

      if (aiMsgError) {
        console.error('Error saving AI message:', aiMsgError);
      }

      // Update context after new messages
      await this.updateContext();
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
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
    try {
      const { data, error } = await supabase.rpc(
        'search_conversations_by_tags',
        { search_tags: tags }
      );

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching by tags:', error);
      return [];
    }
  }

  async injectContext(conversationId: string): Promise<void> {
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
      console.error('Error injecting context:', error);
    }
  }
}

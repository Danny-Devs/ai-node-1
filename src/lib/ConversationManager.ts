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

// Environment variables are declared in src/env.d.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Allowed message roles in the chat */
type MessageRole = 'user' | 'assistant' | 'system';

/** Structure of a chat message */
interface Message {
  role: MessageRole;
  content: string;
}

export class ConversationManager {
  private currentConversationId: string | null = null;
  private messages: Message[] = [];

  constructor() {
    this.createNewConversation().catch(error => {
      console.error('Failed to create conversation:', error);
    });
  }

  /**
   * Creates a new conversation in Supabase
   * Called automatically on initialization
   */
  private async createNewConversation() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned from conversation creation');

      this.currentConversationId = data.id;
      console.log('Created new conversation:', this.currentConversationId);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create new conversation. Please try again.');
    }
  }

  /**
   * Sends a message to the AI and handles the response
   *
   * @param content - The message text to send
   * @returns The AI's response text
   */
  async sendMessage(content: string): Promise<string> {
    try {
      if (!this.currentConversationId) {
        await this.createNewConversation();
      }

      // Add user message to memory and database
      const userMessage: Message = { role: 'user', content };
      this.messages.push(userMessage);

      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: this.currentConversationId,
        role: 'user',
        content
      });

      if (insertError) {
        console.error('Error saving user message:', insertError);
        throw new Error('Failed to save message');
      }

      // Send request to backend
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation_id: this.currentConversationId,
          messages: this.messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();

      if (!data.content) {
        throw new Error('Invalid response from AI service');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content
      };
      this.messages.push(assistantMessage);

      return data.content;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to process message: ${error.message}`);
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Gets all messages in the current conversation
   * @returns Array of messages
   */
  async getCurrentMessages(): Promise<Message[]> {
    return this.messages;
  }
}

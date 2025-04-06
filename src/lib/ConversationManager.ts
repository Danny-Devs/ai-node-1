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

export class ConversationManager {
  private messages = ref<Message[]>([]);
  private systemMessage: Message = {
    role: 'system',
    content:
      'You are a helpful AI assistant. Be concise and clear in your responses.'
  };
  private conversationId: string | null = null;

  constructor() {
    // Initialize with empty messages array
    this.messages.value = [];
  }

  /**
   * Creates a new conversation in Supabase
   * Called automatically on initialization
   */
  private async createNewConversation(): Promise<string> {
    const { data, error } = await supabase
      .from('conversations')
      .insert([{}])
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }

    return data.id;
  }

  /**
   * Sends a message to the AI and handles the response
   *
   * @param content - The message text to send
   * @returns The AI's response text
   */
  async sendMessage(content: string): Promise<void> {
    try {
      if (!this.conversationId) {
        this.conversationId = await this.createNewConversation();
      }

      // Add user message to local state
      const userMessage: Message = { role: 'user', content };
      this.messages.value.push(userMessage);

      // Save user message to Supabase
      const { error: msgError } = await supabase.from('messages').insert([
        {
          conversation_id: this.conversationId,
          role: 'user',
          content
        }
      ]);

      if (msgError) {
        console.error('Error saving user message:', msgError);
      }

      // Get AI response
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [this.systemMessage, ...this.messages.value],
          conversationId: this.conversationId
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
}

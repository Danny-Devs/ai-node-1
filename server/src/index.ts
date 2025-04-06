/**
 * Main server entry point - Handles secure communication between frontend and OpenAI
 *
 * This server acts as a secure proxy between the frontend and OpenAI:
 * 1. Keeps API keys secure (never exposed to client)
 * 2. Handles message routing and error handling
 * 3. Manages conversation persistence with Supabase
 */

import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Express with JSON parsing and CORS
const app = express();
app.use(express.json());
app.use(cors());

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Initialize API clients
const openai = new OpenAI();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/chat - Main chat endpoint
 *
 * Handles:
 * 1. Receiving messages from frontend
 * 2. Getting AI response from OpenAI
 * 3. Saving response to Supabase
 * 4. Returning response to frontend
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, conversationId } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    console.log('Sending to OpenAI:', messages);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages
    });

    const assistantMessage = completion.choices[0].message.content;
    console.log('Got response from OpenAI:', assistantMessage);

    // Save assistant message to Supabase
    if (conversationId) {
      const { error: msgError } = await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantMessage
        }
      ]);

      if (msgError) {
        console.error('Error saving assistant message:', msgError);
      }
    }

    res.json({ message: assistantMessage });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

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
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize Express with JSON parsing and CORS
const app = express();
app.use(express.json());
app.use(cors());

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
}

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const { conversation_id, messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages must be an array' });
    }

    if (!conversation_id) {
      return res.status(400).json({ error: 'conversation_id is required' });
    }

    // Format messages for OpenAI
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system message if not present
    if (!formattedMessages.some(msg => msg.role === 'system')) {
      formattedMessages.unshift({
        role: 'system',
        content:
          'You are a helpful AI assistant. Be concise and clear in your responses.'
      });
    }

    console.log('Sending to OpenAI:', formattedMessages);

    // Get AI response from OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('Got response from OpenAI:', aiResponse);

    // Save assistant message to Supabase
    const { error: assistantError } = await supabase.from('messages').insert({
      conversation_id,
      role: 'assistant',
      content: aiResponse
    });

    if (assistantError) {
      console.error('Error inserting assistant message:', assistantError);
      return res
        .status(500)
        .json({ error: 'Failed to save message to database' });
    }

    res.json({ content: aiResponse });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unexpected error occurred' });
    }
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

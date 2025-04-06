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
import dotenv from 'dotenv';

dotenv.config();

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
    const { messages } = req.body;
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      temperature: 0.7
    });

    res.json({ message: response.choices[0].message.content });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// New summarization endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, tokenCount } = req.body;

    // First, get key terms and concepts
    const termsResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Extract 3-5 key terms or concepts from the text. These should be single words or short phrases that capture the main topics. Respond with ONLY the terms, separated by commas, no explanation or other text.'
        },
        { role: 'user', content: text }
      ],
      temperature: 0.3
    });

    const keyTerms =
      termsResponse.choices[0].message.content
        ?.split(',')
        .map(term => term.trim()) || [];

    // Then, generate a concise summary
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Create a concise 1-2 sentence summary of the conversation. Focus on the main points and any conclusions reached. Be specific but brief.'
        },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const summary =
      summaryResponse.choices[0].message.content ||
      'Failed to generate summary';

    res.json({
      summary,
      keyTerms
    });
  } catch (error) {
    console.error('Error in summarize endpoint:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

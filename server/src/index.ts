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

// Sample data for conversations
const sampleData = {
  conversations: [
    {
      title: 'AI Development Discussion',
      messages: [
        {
          role: 'user',
          content: 'What are the key considerations when developing AI systems?'
        },
        {
          role: 'assistant',
          content:
            'When developing AI systems, several key considerations are crucial: 1) Data quality and bias, 2) Model transparency and explainability, 3) Ethical implications, 4) Computational efficiency, and 5) Scalability and maintenance.'
        },
        { role: 'user', content: 'How can we ensure AI systems are ethical?' },
        {
          role: 'assistant',
          content:
            "Ensuring ethical AI involves: regular bias testing, diverse development teams, clear documentation, user privacy protection, and establishing governance frameworks. It's also important to have ongoing monitoring and feedback loops."
        }
      ],
      context: {
        summary:
          'Discussion about AI development best practices and ethical considerations',
        key_terms: [
          'AI ethics',
          'bias testing',
          'transparency',
          'governance',
          'data quality'
        ],
        tags: ['AI', 'ethics', 'development', 'best practices']
      }
    },
    {
      title: 'Machine Learning Basics',
      messages: [
        {
          role: 'user',
          content:
            'Can you explain the difference between supervised and unsupervised learning?'
        },
        {
          role: 'assistant',
          content:
            'Supervised learning uses labeled data where the desired output is known, like classifying emails as spam or not spam. Unsupervised learning works with unlabeled data to find patterns and structures, like customer segmentation.'
        },
        {
          role: 'user',
          content: 'What are some common supervised learning algorithms?'
        },
        {
          role: 'assistant',
          content:
            'Common supervised learning algorithms include: Linear Regression, Logistic Regression, Decision Trees, Random Forests, Support Vector Machines (SVM), and Neural Networks. Each has its own strengths and use cases.'
        }
      ],
      context: {
        summary: 'Overview of machine learning types and common algorithms',
        key_terms: [
          'supervised learning',
          'unsupervised learning',
          'algorithms',
          'classification'
        ],
        tags: ['machine learning', 'algorithms', 'ML basics']
      }
    }
  ]
};

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages
    });

    res.json({ message: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// New summarization endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Extract key information from the following conversation. Provide a brief summary and identify important terms/concepts mentioned.'
        },
        {
          role: 'user',
          content: text
        }
      ]
    });

    // Parse the response to extract summary and key terms
    const response = completion.choices[0].message.content || '';
    const summary = response.split('\n')[0] || '';
    const keyTerms =
      response
        .split('\n')
        .slice(1)
        .join(' ')
        .match(/\b\w+(?:\s+\w+)*\b/g) || [];

    res.json({ summary, keyTerms });
  } catch (error) {
    console.error('Error in summarize endpoint:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.post('/api/sample-data', async (req, res) => {
  try {
    // First, check if we already have sample data
    const { data: existingData, error: checkError } = await supabase
      .from('conversations')
      .select('id')
      .limit(1);

    if (checkError) throw checkError;

    // If we already have data, don't add more
    if (existingData && existingData.length > 0) {
      return res.json({ message: 'Sample data already exists' });
    }

    // Add each conversation
    for (const conv of sampleData.conversations) {
      // Create conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;
      if (!convData) throw new Error('No conversation data returned');

      // Add messages
      const messagesWithConvId = conv.messages.map(msg => ({
        ...msg,
        conversation_id: convData.id
      }));

      const { error: msgError } = await supabase
        .from('messages')
        .insert(messagesWithConvId);

      if (msgError) throw msgError;

      // Add context
      const { error: ctxError } = await supabase
        .from('conversation_contexts')
        .insert({
          conversation_id: convData.id,
          summary: conv.context.summary,
          key_terms: conv.context.key_terms,
          tags: conv.context.tags,
          raw_conversation: conv.messages.map(m => m.content).join('\n\n')
        });

      if (ctxError) throw ctxError;
    }

    res.json({ message: 'Sample data added successfully' });
  } catch (error) {
    console.error('Error adding sample data:', error);
    res.status(500).json({
      error: 'Failed to add sample data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

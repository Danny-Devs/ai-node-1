# AI Memory Chat

An intelligent chat application that builds a personal knowledge graph from your conversations with AI. Think ChatGPT meets Obsidian - your conversations don't just disappear, they build into an interconnected web of knowledge that grows with you.

[Screenshot coming soon]

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Environment Setup

1. Clone the repository

```bash
git clone [your-repo-url]
cd ai-memory-chat
```

2. Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

3. Configure environment variables

```bash
# Root directory - Frontend
cp .env.example .env
# Add your Supabase and API details to .env:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server directory - Backend
cd server
cp .env.example .env
# Add your OpenAI API key to .env:
OPENAI_API_KEY=your_openai_api_key
```

4. Start the development servers

```bash
# Start both frontend and backend
npm run dev
```

5. Open http://localhost:5173 in your browser

## Development

For detailed development documentation and feature planning, see [planning.md](planning.md).

### Tech Stack

- Frontend: Vue 3, TypeScript, Vite
- Backend: Node.js, Express
- Database: Supabase (PostgreSQL)
- AI: OpenAI GPT-4

### Project Structure

```
├── src/                  # Frontend source
│   ├── lib/             # Core services
│   ├── components/      # Vue components
│   └── assets/          # Static assets
├── server/              # Backend server
│   ├── src/            # Server source
│   └── tests/          # Server tests
└── planning.md          # Detailed feature docs
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for GPT API
- Supabase for backend infrastructure
- The Vue.js team for the excellent framework

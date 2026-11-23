# NEXA AI

A mobile-friendly AI assistant with a Node.js and Express backend and OpenAI Responses API integration.

## Requirements
- Node.js 20+
- An OpenAI API key

## Run locally
1. Install dependencies with npm install.
2. Copy .env.example to .env.
3. Add your API key to .env.
4. Start the app with npm start.
5. Open http://localhost:3000.

## Environment variables
- OPENAI_API_KEY: server-side API key; never expose this in browser code.
- OPENAI_MODEL: model name; defaults to gpt-4.1-mini.
- PORT: server port; defaults to 3000.

## API
- GET /api/health: health check.
- POST /api/chat: accepts a messages array containing user and assistant messages.

## Current scope
The first version includes a responsive chat interface, server-side AI requests, local conversation persistence, and a health endpoint. Agent tools, web search, voice, and synced account memory are planned follow-up features.

## Security
Keep .env private. Do not commit API keys. Add authentication, rate limiting, and usage controls before making the app public.

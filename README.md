# ACE Scanner Backend

This is the backend service for the ACE Scanner application. It provides APIs for managing wordlists, phrases, and scanning operations.

## Features

- Phrase management API
- Wordlist organization
- Scanning status tracking
- Integration with Supabase for data storage

## Prerequisites

- Node.js 18 or higher
- npm
- Supabase account and project

## Setup

1. Run the setup script:

\`\`\`bash
node setup.js
\`\`\`

This will guide you through the setup process, including:
- Installing dependencies
- Creating a .env file
- Starting the server

2. Alternatively, you can set up manually:

\`\`\`bash
# Install dependencies
npm install

# Create .env file (see .env.example)
cp .env.example .env

# Start the development server
npm run dev
\`\`\`

## Environment Variables

Create a `.env` file with the following variables:

\`\`\`
PORT=3001
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

## Database Setup

Run the SQL migration in `migrations/phrases-table.sql` in your Supabase SQL editor to create the necessary tables and functions.

## API Endpoints

### Phrases

- `GET /phrases` - Get all phrases with pagination and filtering
- `POST /phrases/upload` - Upload phrases
- `POST /phrases/mark-scanned` - Mark phrases as scanned
- `GET /phrases/stats` - Get wordlist statistics
- `GET /phrases/for-scanning` - Get phrases for scanning
- `DELETE /phrases/wordlist/:wordlist` - Delete phrases by wordlist

### Status

- `GET /status` - Get backend status information
- `GET /` - Health check endpoint

## Development

\`\`\`bash
# Start development server with hot reload
npm run dev

# Start production server
npm start
\`\`\`

## Deployment

This service can be deployed to any Node.js hosting platform such as:

- Heroku
- Render
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk

Make sure to set the environment variables in your hosting platform.
\`\`\`

Let's create a simple .env.example file:

```plaintext file="backend/.env.example" type="code"
PORT=3001
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

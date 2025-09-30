# Bulk Redmine

A secure web application for bulk time entry management in Redmine using Next.js, TypeScript, and ShadCN UI with encrypted credential storage.

## Features

- **Secure Authentication**: Supabase Auth with magic links and encrypted Redmine credentials (AES-256-GCM)
- **Bulk Time Entries**: Create multiple time entries for a week at once
- **Weekly Summary**: View and track your time entries by week
- **Redmine Sync**: Sync time entries directly to your Redmine instance
- **Dark Theme**: Beautiful dark theme by default
- **Database**: PostgreSQL with Drizzle ORM for credential management
- **Sidebar Navigation**: Modern sidebar with user menu and settings

## Tech Stack

- **Framework**: Next.js 15 with App Router (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with ShadCN UI
- **Authentication**: Supabase Auth with magic links
- **Database**: PostgreSQL with Drizzle ORM
- **Encryption**: AES-256-GCM for API key storage
- **API Integration**: Redmine REST API

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended package manager)
- PostgreSQL database (local Docker or Supabase)

### Quick Setup

For detailed setup instructions, see [docs/SETUP.md](docs/SETUP.md)

### Quick Start

1. Clone the repository

2. Install dependencies:
   ```powershell
   pnpm install
   ```

3. Set up environment variables:
   ```powershell
   Copy-Item .env.example .env.local
   ```
   
   Edit `.env.local` with your values (see SETUP.md for details)

4. Generate and run database migrations:
   ```powershell
   pnpm db:generate
   pnpm db:push
   ```

5. Start the development server:
   ```powershell
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### First Time Login

1. **Login Page**: Navigate to the login page
2. **Magic Link**: Enter your work email and click "Send Magic Link"
3. **Email**: Check your email (or Inbucket at http://127.0.0.1:54324 for local dev)
4. **Authenticate**: Click the magic link to sign in
5. **Redmine Setup**: On first login, you'll be redirected to configure Redmine:
   - Enter your Redmine instance URL
   - Enter your Redmine API key
6. **Validation**: The app validates your API key against Redmine
7. **Secure Storage**: Your credentials are encrypted and stored securely
8. **Ready**: Redirected to time tracking dashboard

### Creating Time Entries

1. **Navigate to Dashboard**: After login, you'll see the time entry form
2. **Add Entries**: 
   - Select project and activity
   - Choose the date
   - Enter hours worked
   - Add optional comments
3. **Bulk Add**: Create multiple entries for the week
4. **Submit**: All entries are saved directly to Redmine
5. **Real-time**: No sync needed, everything is instant

### Weekly Summary

- View your time entries for the current week
- Navigate between weeks using the arrow buttons
- See total hours and breakdown by project/activity
- All data fetched in real-time from Redmine

## Data & Security

### Credential Storage

- **Encrypted**: API keys encrypted with AES-256-GCM
- **Database**: PostgreSQL stores encrypted credentials
- **Server-Only**: Decryption happens only on server
- **Never Exposed**: API keys never reach the client

### Time Entry Data

- **No Local Storage**: Time entries stored only in Redmine
- **Real-time Sync**: All operations direct to Redmine API
- **Caching**: Smart caching for projects and activities

## API Integration

The app integrates with Redmine using the REST API:

- **Authentication**: Uses API key authentication
- **Time Entries**: Creates time entries via `/time_entries.json`
- **Projects**: Fetches available projects
- **Activities**: Fetches available activities

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:generate` - Generate database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations

### Project Structure

```
app/
  (auth)/                     # Public routes
    login/                    # Magic link login
  (protected)/                # Protected app routes
    time-tracking/            # Time tracking dashboard
    bulk-entry/               # Bulk entry page
    settings/                 # Settings pages
  lib/
    actions/                  # Server actions
    services/                 # Service layer
lib/
  supabase/                   # Supabase clients
  crypto.ts                   # AES-256-GCM encryption
  db.ts                       # Database client
  schema.ts                   # Database schema
components/
  app-sidebar.tsx             # Navigation sidebar
  dashboard/                  # Dashboard components
  time-entry/                 # Time entry components
  ui/                         # ShadCN UI components
docs/                         # Documentation
```

For detailed architecture, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Security

- **AES-256-GCM Encryption**: API keys encrypted at rest
- **Magic Link Authentication**: Passwordless login with Supabase
- **Server-Side Decryption**: Credentials only decrypted on server
- **HTTP-Only Cookies**: Session tokens not accessible to JavaScript
- **Middleware Protection**: Protected routes with Supabase middleware
- **Environment Variables**: Sensitive data in environment variables
- **No Client Exposure**: API keys never sent to client
- **Two-Step Security**: Separate auth and credential configuration

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Detailed installation and configuration
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data flow
- **[Sequence Diagrams](docs/SEQUENCE_DIAGRAMS.md)** - Visual flow of data with real examples
- **[API Reference](docs/API.md)** - Server actions and types
- **[Security](docs/SECURITY.md)** - Security features and best practices
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment guide
- **[Git & Version Control](docs/GIT.md)** - What to commit and why

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Please ensure compliance with your organization's policies when using with work-related Redmine instances.
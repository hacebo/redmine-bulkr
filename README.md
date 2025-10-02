# BulkRedmine

A modern time tracking application for Redmine that enables bulk time entry management with a beautiful, mobile-first interface.

## 🚀 Features

- **Bulk Time Entries**: Create multiple time entries for an entire week at once
- **Weekly Overview**: Visual weekly calendar with time tracking summary
- **Redmine Integration**: Direct sync with your Redmine instance
- **Secure Authentication**: Appwrite-powered authentication with magic links
- **Mobile-First Design**: Responsive design optimized for mobile devices
- **Dark Theme**: Beautiful dark theme by default
- **Real-time Validation**: Instant feedback on time entries and connections

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with ShadCN UI
- **Authentication**: Appwrite
- **Database**: Appwrite Databases
- **Encryption**: AES-256-GCM for secure credential storage
- **API Integration**: Redmine REST API

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Appwrite instance (local or cloud)
- Redmine instance with API access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bulkredmine
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📱 Usage

1. **Sign up/Login**: Use magic link authentication (no passwords needed)
2. **Configure Redmine**: Add your Redmine URL and API key in settings
3. **Select Project**: Choose a project from your Redmine instance
4. **Bulk Entry**: Create time entries for multiple days at once
5. **Track Progress**: View your weekly time tracking summary

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-endpoint
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_COLLECTION_ID=your-collection-id

# Appwrite Admin (Server-side)
APPWRITE_API_KEY=your-admin-api-key

# Crypto (Generate with: node scripts/generate-keys.js)
CRYPTO_KEY_BASE64=your-encryption-key

# App URL (for magic links)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📚 Documentation

For detailed setup and configuration instructions, see the [docs](./docs/) folder:

- [Appwrite Setup](./docs/APPWRITE_SETUP.md) - Complete Appwrite configuration guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Redmine](https://www.redmine.org/) - Project management tool
- [Appwrite](https://appwrite.io/) - Backend-as-a-Service
- [Next.js](https://nextjs.org/) - React framework
- [ShadCN UI](https://ui.shadcn.com/) - UI component library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
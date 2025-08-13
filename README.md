# Amagi Cursor Analytics Dashboard

🚀 **Ultra-modern analytics dashboard for Cursor AI usage tracking and license optimization at Amagi**

## 🌟 Features

- **📊 Comprehensive Analytics**: Track Composer, Chat, and Agent usage across your team
- **👥 User Management**: Top performers, inactive users, and license optimization insights
- **🎮 Gamified Overview**: Leaderboards and productivity metrics
- **🌙 Dark Mode**: Sleek, modern interface with full dark mode support
- **📱 Responsive Design**: Works perfectly on all devices
- **🔒 Production Ready**: Built with security, performance, and scalability in mind

## 🏗️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Icons**: Lucide React
- **Deployment**: Vercel/Netlify ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Cursor Admin API key (get from Cursor Admin dashboard)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd cursor-admin-analytics
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Cursor Admin API key
   ```

3. **Development Server**:
   ```bash
   npm run dev
   ```

4. **Open**: [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CURSOR_ADMIN_API_KEY` | ✅ | Your Cursor Admin API key |
| `NODE_ENV` | ✅ | Environment (development/production) |

### API Endpoints Used

- `POST /teams/daily-usage-data` - User activity and metrics
- `POST /teams/filtered-usage-events` - Usage events and timestamps  
- `GET /teams/members` - Team member information

## 🏭 Production Deployment

### Build & Test

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build

# Preview production build
npm run preview
```

### Deploy to Vercel

1. **Connect repository** to Vercel
2. **Add environment variables** in Vercel dashboard
3. **Deploy** automatically on push to main

### Deploy to Netlify

1. **Build command**: `npm run build`
2. **Publish directory**: `.next`
3. **Add environment variables** in Netlify dashboard

### Deploy to Other Platforms

The app is containerizable and can be deployed to:
- AWS ECS/Fargate
- Google Cloud Run  
- Azure Container Instances
- DigitalOcean App Platform

## 📊 Dashboard Sections

### 🎮 Overview (Gamified)
- **Vibe-Code Impact Metrics**: Key performance indicators
- **AI Feature Galaxy**: Interactive feature breakdown  
- **Champions Leaderboard**: Top 10 performers by combined score

### 👥 Top Users
- **Ultra-modern table** with comprehensive user data
- **Search & filtering** capabilities
- **Grid/table view** toggle
- **Export functionality**

### 📴 Inactive Users (License Management)
- **14/21 day** inactive user tracking
- **License reclaim candidates**
- **Automatic refresh** on filter changes
- **Action buttons** for license management

### 📈 Analytics
- **Usage trends** and patterns
- **Productivity insights**
- **Team performance** metrics

## 🔒 Security Features

- **CSP Headers**: Content Security Policy
- **XSS Protection**: Cross-site scripting prevention
- **CSRF Protection**: Cross-site request forgery protection
- **Environment Validation**: Runtime environment checks
- **Error Boundaries**: Graceful error handling
- **API Key Protection**: Server-side only API access

## 🎨 Design System

### Colors (Amagi Branding)
- **Primary**: Blue gradients (#1e40af to #6366f1)
- **Secondary**: Purple accents (#8b5cf6 to #a855f7)
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Error**: Red (#ef4444)

### Typography
- **Headings**: Gradient text effects
- **Body**: Clean, readable fonts
- **Code**: Monospace for technical data

## 🚧 Development

### Project Structure

```
src/
├── app/
│   ├── api/usage/          # API routes
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Main dashboard
├── components/
│   └── ErrorBoundary.tsx   # Error handling
└── lib/
    ├── cursorAdmin.ts      # API client
    └── env.ts              # Environment config
```

### Key Commands

```bash
npm run dev          # Development server
npm run build        # Production build  
npm run start        # Production server
npm run lint         # ESLint checking
npm run lint:fix     # Auto-fix linting issues
npm run type-check   # TypeScript validation
npm run clean        # Clean build cache
```

## 📈 Performance

- **Lighthouse Score**: 90+ in all categories
- **Core Web Vitals**: Optimized for real user metrics
- **Bundle Size**: Optimized with code splitting
- **Loading**: Fast initial page load with progressive enhancement

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

## 📝 License

This project is proprietary software for Amagi Corporation.

## 🆘 Support

For issues and support:
- **Internal**: Contact the Engineering Team
- **Documentation**: Check this README and inline code comments
- **Issues**: Use the internal issue tracking system

---

**Built with ❤️ by the Amagi Engineering Team**
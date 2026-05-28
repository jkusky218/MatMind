# MatMind 🧠🤼

**AI-powered team management for youth wrestling.**

MatMind is a conversational-first Progressive Web App (PWA) that replaces traditional team management tools with an AI assistant. Coaches manage their team through natural language — scheduling, communication, roster management, and availability tracking — all through a chat interface backed by Claude AI.

Built for [Lovett Wrestling](https://www.lovett.org), designed to scale to any youth sports program.

---

## Features

- **Conversational AI Command Center** — manage your team by talking to it
- **Channel-based Communication** — team-wide announcements, group channels, private coaching staff
- **AI Coach for Parents** — answers questions automatically from team FAQ and past communications
- **Schedule Management** — practices, matches, tournaments with RSVP tracking
- **Roster Management** — athletes, weight classes, parent contacts, skill-based groups
- **Multi-Channel Notifications** — email (weekly), SMS (tournament day), in-app chat
- **Installable PWA** — works on any phone, no app store required

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | CSS-in-JS (inline styles, Lovett brand tokens) |
| Database | Supabase (Postgres + Row Level Security) |
| Auth | Supabase Auth (email/password + magic link) |
| Real-time | Supabase Realtime (live chat) |
| AI | Anthropic Claude API (Haiku 4.5) |
| Email | SendGrid |
| SMS | Twilio |
| PWA | vite-plugin-pwa + Workbox |
| Hosting | Vercel (recommended) |

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/matmind.git
cd matmind
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key from **Settings > API**

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials.

### 4. Run locally

```bash
npm run dev
```

The app runs in **demo mode** if no Supabase credentials are provided — you can explore the full UI with mock data.

### 5. Deploy

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host.

## Project Structure

```
matmind/
├── public/                 # Static assets, PWA icons
├── src/
│   ├── components/         # Reusable UI components
│   ├── hooks/              # React hooks (useAuth, useRoster, etc.)
│   ├── lib/                # Supabase client, Claude API helpers
│   ├── pages/              # Page-level components
│   ├── styles/             # Global CSS
│   ├── App.jsx             # Root component
│   └── main.jsx            # Entry point
├── supabase/
│   └── migrations/         # Database schema SQL
├── .env.example            # Environment variable template
├── package.json
├── vite.config.js          # Vite + PWA config
└── README.md
```

## Database Schema

The Supabase schema includes:

- **teams** — multi-team support with branding
- **profiles** — user accounts (coaches, parents, admins)
- **athletes** — wrestlers with weight, grade, school, group
- **athlete_parents** — many-to-many parent-athlete links
- **coaches** — coaching staff with roles
- **events** — practices, matches, tournaments
- **availability** — per-athlete RSVP per event
- **channels** — communication channels per group
- **messages** — real-time in-app messages
- **broadcasts** — email/SMS broadcast log
- **ai_conversations** — private coach-AI chat history

All tables have Row Level Security (RLS) policies ensuring parents only see their team's data and can only modify their own athletes' availability.

## Roster Groups

| Group | Description |
|-------|------------|
| Coaches | Coaching staff |
| Advanced | Skill-based (not age-based) |
| Beginner | Skill-based (not age-based) |
| Tots | Youngest wrestlers |

## Communication Model

| Channel | Purpose | Audience |
|---------|---------|----------|
| MatMind AI | Private coach command center | Coaches only |
| Announcements | Team-wide updates | Everyone |
| Group channels | Group-specific discussion | Group members + parents |
| Coaches Only | Staff coordination | Coaches only |

| Method | Use Case | Trigger |
|--------|----------|---------|
| Email | Weekly updates, formal comms | Coach via AI or direct |
| SMS | Tournament-day urgent alerts | Coach via AI |
| In-app chat | Daily communication, Q&A | Everyone |

## Roadmap

- [x] Frontend prototype with hybrid chat/dashboard UI
- [x] Channel-based communication model
- [x] Login screen with role selection
- [ ] Supabase database + auth integration
- [ ] Claude API for real AI responses
- [ ] Real-time chat via Supabase Realtime
- [ ] Email broadcasts via SendGrid
- [ ] SMS alerts via Twilio
- [ ] PWA installability + push notifications
- [ ] Parent-facing experience
- [ ] TeamSnap data import
- [ ] Multi-team / league support

## Author

**Joey Kusky** — Solutions Architecture Leader & AI Technologist
- [LinkedIn](https://linkedin.com/in/joey-kusky-5211235)
- [Email](mailto:joey.kusky@gmail.com)

---

*Built with Claude AI. Go Lions! 🦁*

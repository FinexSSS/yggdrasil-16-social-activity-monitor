# Personal Yggdrasil: A Metaphorical Data Visualization

A SvelteKit + Three.js (Threlte) project that visualizes personal data as a growing “Yggdrasil” tree — a metaphorical garden you can explore.

## Tech stack

- SvelteKit + Vite
- Three.js via Threlte
- Tailwind CSS
- Supabase (client via `@supabase/supabase-js`)

## Getting started

### 1) Install dependencies

```sh
npm install
```

### 2) Configure environment variables

This app requires environment variables for Supabase and Facebook OAuth.

Update the `.env` file with your actual credentials:

- `PUBLIC_SUPABASE_URL` — Your Supabase project URL (from https://app.supabase.com)
- `PUBLIC_SUPABASE_ANON_KEY` — Your Supabase anonymous key
- `PUBLIC_FACEBOOK_APP_ID` — Your Facebook App ID (from https://developers.facebook.com/apps)

**Important:** The `.env` file contains placeholder values. Replace them with your actual credentials. Never commit real credentials to version control.

### 3) Run the dev server

```sh
npm run dev
```

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run preview` — preview production build
- `npm run check` — typecheck + Svelte check

## Supabase

The database schema lives in `supabase/schema.sql`.

## Environment Setup

This project uses a `.env` file for configuration. The file is included in the repository with placeholder values to help you get started. Before running the application:

1. Open `.env` and replace all placeholder values with your actual credentials
2. **Never commit real credentials** - the `.env` file is gitignored to protect your sensitive data
3. Keep your `.env` file private and secure

### Required Credentials

- **Supabase**: Create a project at [supabase.com](https://supabase.com)
- **Facebook App**: Create an app at [developers.facebook.com](https://developers.facebook.com)

## Project Title

**Personal Yggdrasil: A Metaphorical Data Visualization**

# Expander Turn Tracker

A secure, mobile-first web app for tracking orthodontic expander turns. Perfect for families who need to track turns every other day and ensure they don't miss any appointments. Data is stored securely in Supabase and syncs across all devices.

## Features

- **Secure Authentication**: Hard-coded user accounts (you control who can access)
- **Persistent Storage**: Data stored in Supabase database (survives browser cache clears)
- **Cross-Device Sync**: Access your data from any device - changes sync automatically
- **Dual Counter Tracking**: Track top and bottom expander turns separately (default: 27 top, 23 bottom)
- **Interval Enforcement**: Prevents logging turns too early (default: every 2 days)
- **Progress Visualization**: Visual progress bars and remaining turn counts
- **Status Indicators**: Clear Ready/Wait/Complete status with next due date
- **History Log**: View the last 10 logged turns with optional notes
- **Settings Panel**: Customize child name, install date, interval days, totals, and tracking mode
- **Mobile-First Design**: Optimized for iPhone and Android devices

## What It Does

The app helps families track orthodontic expander turns by:

1. **Secure Access**: Login with hard-coded credentials (you set who can access)
2. **Tracking Progress**: Two counters track turns for top and bottom expanders separately
3. **Enforcing Schedule**: Prevents logging turns too early (every other day by default)
4. **Showing Status**: Displays when the next turn is due and whether you're ready to log
5. **Recording History**: Keeps a log of all turns with optional notes
6. **Flexible Settings**: Adjust totals, intervals, and whether to log top/bottom together or separately
7. **Data Persistence**: All data stored in Supabase - never lost, even if browser cache is cleared

The orthodontist typically completes the first turn on install day, so the app starts with both counters at 1.

## Setup Instructions

### Prerequisites

- A [Supabase](https://supabase.com) account (free tier is sufficient)
- A [Vercel](https://vercel.com) account (free tier is sufficient)
- Node.js installed (for local development)

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `spread-turn-tracker` (or your choice)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait for the project to be ready (2-3 minutes)

### Step 2: Set Up Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run" (or press Ctrl/Cmd + Enter)
5. You should see "Success. No rows returned"

### Step 3: Configure Users (Environment Variable)

Users are configured via the `APP_USERS` environment variable (set in Step 5). This keeps credentials secure and out of your codebase.

The format is a JSON array. Use `password` (plain text) or `passwordHash` (bcrypt, recommended):

```json
[{"username":"stephen","password":"your-secure-password","displayName":"Dad"},{"username":"kelsey","password":"your-secure-password","displayName":"Mom"}]
```

For secure storage, use bcrypt hashes (generate with `require('bcryptjs').hashSync('yourpassword', 10)`):

```json
[{"username":"stephen","passwordHash":"$2a$10$...","displayName":"Dad"}]
```

You'll set this in Vercel environment variables (see Step 5).

### Step 4: Get Supabase Credentials

1. In Supabase, go to **Settings** → **API** (left sidebar)
2. Copy these values (you'll need them for Vercel):
   - **Project URL** (under "Project URL")
   - **Service Role Key** (under "Project API keys" → "service_role" - click "Reveal")

### Step 5: Deploy to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

1. Install Vercel CLI if you haven't:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the project directory:
   ```bash
   cd spread-turn-tracker
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time)
   - Project name: `spread-turn-tracker` (or your choice)
   - Directory: `./` (current directory)
   - Override settings? **No**

5. Set environment variables:
   ```bash
   vercel env add SUPABASE_URL
   # Paste your Supabase Project URL when prompted
   
   vercel env add SUPABASE_SERVICE_KEY
   # Paste your Supabase Service Role Key when prompted
   
   vercel env add JWT_SECRET
   # Enter a random secret string (e.g., generate with: openssl rand -base64 32)
   
   vercel env add APP_USERS
   # Paste your users JSON array, for example:
   # [{"username":"stephen","password":"your-secure-password","displayName":"Dad"},{"username":"kelsey","password":"your-secure-password","displayName":"Mom"}]
   ```
   
   **Important**: The `APP_USERS` variable must be valid JSON. Use single quotes around the entire string if your shell requires it, or escape quotes properly.

6. Redeploy to apply environment variables:
   ```bash
   npm run deploy
   ```
   or `vercel --prod`

#### Option B: Deploy via Vercel Dashboard

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your Git repository (GitHub/GitLab/Bitbucket)
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
5. Click "Deploy"
6. After deployment, go to **Settings** → **Environment Variables**
7. Add these variables:
   - `SUPABASE_URL`: Your Supabase Project URL
   - `SUPABASE_SERVICE_KEY`: Your Supabase Service Role Key
   - `JWT_SECRET`: A random secret string (required; generate one: `openssl rand -base64 32`)
   - `APP_USERS`: JSON array of users (see Step 3 for format)
   - `ALLOWED_ORIGIN` (optional): Restrict CORS to a specific origin, e.g. `https://your-app.vercel.app`
8. Go to **Deployments** tab, click the three dots on the latest deployment, and select "Redeploy"

### Step 6: Test Your Deployment

1. Visit your Vercel URL (shown after deployment)
2. You should see the login screen
3. Login with one of your hard-coded usernames/passwords
4. The app should load and you can start tracking!

## Running Locally

For local development:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the project root:
   ```
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   JWT_SECRET=your-random-secret-string
   APP_USERS=[{"username":"stephen","password":"your-secure-password","displayName":"Dad"},{"username":"kelsey","password":"your-secure-password","displayName":"Mom"}]
   ```
   
   **Note**: For `APP_USERS`, you may need to wrap the JSON in quotes depending on your shell:
   ```
   APP_USERS='[{"username":"stephen","password":"your-secure-password","displayName":"Dad"},{"username":"kelsey","password":"your-secure-password","displayName":"Mom"}]'
   ```

3. Copy `.env.example` to `.env.local` and fill in your values (or create `.env.local` from the README).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open `http://127.0.0.1:3000` in your browser

## Adding to Home Screen (Mobile App Experience)

### iOS (iPhone/iPad)

1. Open the app in Safari (not Chrome or other browsers)
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Edit the name if desired
5. Tap **"Add"**

The app will now appear on your home screen like a native app and will open in fullscreen mode.

### Android

1. Open the app in Chrome
2. Tap the **Menu** button (three dots in top right)
3. Tap **"Add to Home screen"** or **"Install app"**
4. Confirm the name
5. Tap **"Add"** or **"Install"**

The app will appear on your home screen and can be opened like a native app.

## Security Notes

- **User Credentials**: Users are configured via the `APP_USERS` environment variable. Use `passwordHash` (bcrypt) for secure storage, or `password` (plain text) for simplicity. Generate hashes with `require('bcryptjs').hashSync('yourpassword', 10)`.
- **JWT Secret**: `JWT_SECRET` is required. Never use a default or commit it. Generate with `openssl rand -base64 32`.
- **JWT Tokens**: Authentication uses JWT tokens stored in sessionStorage (cleared when browser closes, but data persists in Supabase).
- **CORS**: By default, CORS allows your Vercel deployment origin. Set `ALLOWED_ORIGIN` to restrict further (e.g. custom domain).
- **Service Role Key**: The Supabase service role key has full database access. Keep it secret and never commit it to Git.
- **RLS**: Row Level Security is enabled in the schema. The API uses the service role key, which bypasses RLS. RLS remains as defense-in-depth if you ever switch to Supabase Auth.
- **HTTPS**: Vercel automatically provides HTTPS for all deployments.
- **Data Privacy**: All data is stored in your Supabase database. You control access completely.

## File Structure

```
spread-turn-tracker/
├── api/
│   ├── lib/
│   │   ├── auth.js         # JWT verification, CORS helpers
│   │   └── supabase.js     # Supabase client
│   ├── login.js            # Authentication endpoint
│   ├── verify.js            # Token verification
│   ├── settings.js         # User settings CRUD
│   ├── turns.js             # Turn logging CRUD
│   └── treatment-notes.js   # Treatment notes CRUD
├── supabase/
│   ├── schema.sql          # Database schema
│   ├── setup-users.sql     # User setup instructions
│   └── migration.sql       # Migration scripts
├── index.html              # Main HTML
├── styles.css              # All styling
├── app.js                  # Frontend application logic
├── package.json            # Dependencies
├── vercel.json             # Vercel configuration
├── .env.example            # Environment variable template
└── README.md               # This file
```

## Troubleshooting

### "Failed to fetch" or CORS errors

- Make sure your environment variables are set correctly in Vercel
- Check that your Supabase project is active
- Verify the API endpoints are accessible

### Login fails

- Check that usernames/passwords in `APP_USERS` match what you're entering
- Verify JWT_SECRET is set in Vercel environment variables (required, no default)
- Check Vercel function logs: Vercel Dashboard → Your Project → Functions → View Logs

### Data not saving

- Check Supabase logs: Supabase Dashboard → Logs → Postgres Logs
- Verify SUPABASE_SERVICE_KEY is correct
- Check browser console for errors

### Can't deploy to Vercel

- Make sure `package.json` has all dependencies listed
- Check that `vercel.json` is properly formatted
- Verify you're logged into Vercel CLI or have connected your Git repo

### Database errors

- Run the schema SQL again in Supabase SQL Editor
- Check that tables exist: Supabase Dashboard → Table Editor
- Verify RLS policies are set (though API uses service role key which bypasses RLS)

## Updating Users

To add or modify users:

1. Update the `APP_USERS` environment variable in Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Edit `APP_USERS` with your updated JSON array
   - Or use CLI: `vercel env rm APP_USERS` then `vercel env add APP_USERS`
2. Redeploy to Vercel:
   ```bash
   vercel --prod
   ```

New users will be automatically created in the database on first login.

## Changing Passwords

To change a user's password:

1. Update the `APP_USERS` environment variable in Vercel with the new password
2. Redeploy to Vercel
3. The user can now login with the new password

**Note**: The old password hash in the database will be replaced on next login.

## Backup and Restore

Your data is stored in Supabase. To backup:

1. Go to Supabase Dashboard → Database → Backups
2. Or export data: Supabase Dashboard → SQL Editor → Run a SELECT query and export results

## Cost

- **Vercel**: Free tier includes 100GB bandwidth/month (plenty for a family app)
- **Supabase**: Free tier includes 500MB database, 2GB bandwidth (more than enough)

Both services have generous free tiers that should cover your needs completely.

## Support

For issues:
1. Check the Troubleshooting section above
2. Review Vercel function logs and Supabase logs
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

---

**Made with ❤️ for families tracking orthodontic progress**

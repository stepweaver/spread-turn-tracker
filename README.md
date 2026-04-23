# Orthodontic Turn & Visit Tracker

A mobile-first web app for tracking orthodontic appliance turns, visit notes, and treatment progress.

This project is designed to make orthodontic tracking simpler, clearer, and less error-prone. Instead of relying on memory, paper notes, or text messages, it provides a shared place to log turns, monitor progress, and keep treatment notes organized across devices.

## Overview

Orthodontic treatment often involves repeated actions over time, such as appliance turns, scheduled check-ins, and notes from appointments. This app turns that process into a simple workflow:

- log turns
- see what is due next
- track progress over time
- store treatment notes in one place
- access the same data from multiple approved logins

It is built for real-world daily use on a phone, with a clean interface and persistent cloud-backed storage.

## Features

- **Top and bottom turn tracking**  
  Track upper and lower appliance turns separately.

- **Flexible schedule options**  
  Supports either an every-`N`-days schedule or a twice-per-week schedule.

- **Progress visibility**  
  See logged counts, remaining turns, and current status at a glance.

- **Due-date awareness**  
  Clearly shows whether a turn is ready, waiting, or complete, including the next due time.

- **Turn history with optional notes**  
  Keep a record of recent turn activity.

- **Treatment notes**  
  Record appointment notes, adjustment details, reminders, or observations.

- **Shared access**  
  Multiple approved users can log in and work from the same tracker.

- **Persistent storage**  
  Data is stored in Google Sheets instead of relying on browser-only storage.

- **Mobile-first design**  
  Built to work well on phones and easy to save to the home screen.

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend/API**: Node.js with Vercel serverless functions
- **Database**: Google Sheets (via Google Sheets API)
- **Auth**: JWT-based authentication with environment-configured users
- **Password handling**: `bcryptjs` support for hashed passwords

## How It Works

1. An approved user logs in using credentials defined in environment variables.
2. The app calls the backend API to verify the JWT and load the shared tracker data from Google Sheets.
3. The current schedule (every-`N`-days or twice-per-week) determines when a turn can be logged.
4. When a turn is logged, turn counts, history, and next-due time are updated automatically.
5. Treatment notes can be added for visits, adjustments, or reminders.
6. Any approved user using the app sees the same shared data in real time.

## Use Cases

This app is useful for orthodontic workflows that involve:

- repeated appliance turns over weeks or months
- shared tracking between caregivers or household members
- visit-note logging to remember what happened at each appointment
- reducing missed or duplicate turns
- keeping treatment history organized in one place

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/stepweaver/spread-turn-tracker.git
cd spread-turn-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in your values.

Example:

```bash
GOOGLE_SHEETS_SPREADSHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
JWT_SECRET=your-random-secret-string
APP_USERS=[{"username":"user","password":"your-password","displayName":"Display Name"}]
ALLOWED_ORIGIN=http://127.0.0.1:3000
```

You can also use hashed passwords in `APP_USERS`:

```bash
APP_USERS=[{"username":"user","passwordHash":"$2a$10$...","displayName":"Display Name"}]
```

### 4. Run locally

```bash
npm run dev
```

Then open `http://127.0.0.1:3000` in your browser.

## Environment Variables

- **GOOGLE_SHEETS_SPREADSHEET_ID** (required): The target spreadsheet ID.
- **GOOGLE_SERVICE_ACCOUNT_EMAIL** (required): Service account email for Sheets access.
- **GOOGLE_PRIVATE_KEY** (required): Service account private key (keep quotes and `\n`).
- **JWT_SECRET** (required): Secret used to sign JWT tokens.
- **APP_USERS** (required): JSON array of approved users, each with `username`, `password` or `passwordHash`, and `displayName`.
- **ALLOWED_ORIGIN** (optional): CORS restriction used by the API layer (e.g. `https://your-app.vercel.app` or `http://127.0.0.1:3000` for local dev).

## Storage layout

The spreadsheet must contain tabs named:

- `settings`
- `turns`
- `treatment_notes`

## Deployment

This project is set up to deploy on Vercel using Google Sheets as the backend.

Typical deployment flow:

1. Create a Google Cloud service account and download its JSON key.
2. Share your spreadsheet with the service account email as **Editor**.
3. Add environment variables in Vercel (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `JWT_SECRET`, `APP_USERS`, and optionally `ALLOWED_ORIGIN`).
4. Deploy the repo to Vercel (via Git integration or `vercel` CLI).
5. Log in with one of the configured users and start tracking.

## Project Structure

```bash
spread-turn-tracker/
├── api/
│   ├── lib/
│   │   ├── auth.js           # JWT verification, CORS helpers
│   │   └── sheets.js         # Google Sheets client + helpers
│   ├── login.js              # Authentication endpoint
│   ├── verify.js             # Token verification
│   ├── settings.js           # User settings CRUD
│   ├── turns.js              # Turn logging CRUD
│   └── treatment-notes.js    # Treatment notes CRUD
├── index.html                # Main HTML
├── styles.css                # All styling
├── app.js                    # Frontend application logic
├── server.js                 # Local dev server
├── package.json              # Dependencies
├── vercel.json               # Vercel configuration
├── .env.example              # Environment variable template
└── README.md                 # This file
```

## Why I Built It

This project is a good example of the kind of software I like building:

- small, useful tools that solve real problems
- simple interfaces that are easy for non-technical users
- practical database-backed workflows
- mobile-first utility apps
- lightweight systems that are easy to deploy and maintain

## Future Improvements

Potential next steps:

- richer appointment timeline and calendar-style views
- exportable treatment history (CSV, PDF, or similar)
- reminders or notifications around due turns and visits
- more detailed reporting around turn cadence and visit history
- role-based access instead of shared household-style access

## Notes

This is a personal utility app built for orthodontic tracking workflow support. It is not medical software and does not replace professional care instructions or clinical judgment.

## License

Add the license you want to use for this repository (for example, MIT, Apache 2.0, or another standard open-source license).

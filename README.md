# Spreader Turn Tracker

A simple, mobile-first web app for tracking orthodontic expander turns. Perfect for families who need to track turns every other day and ensure they don't miss any appointments.

## Features

- **Dual Counter Tracking**: Track top and bottom expander turns separately (default: 27 top, 23 bottom)
- **Interval Enforcement**: Prevents logging turns too early (default: every 2 days)
- **Progress Visualization**: Visual progress bars and remaining turn counts
- **Status Indicators**: Clear Ready/Wait/Complete status with next due date
- **History Log**: View the last 10 logged turns with optional notes
- **Settings Panel**: Customize child name, install date, interval days, totals, and tracking mode
- **Local Storage**: All data stored in your browser - no backend required, completely private
- **Mobile-First Design**: Optimized for iPhone and Android devices
- **Offline Capable**: Works without an internet connection after initial load

## What It Does

The app helps families track orthodontic expander turns by:

1. **Tracking Progress**: Two counters track turns for top and bottom expanders separately
2. **Enforcing Schedule**: Prevents logging turns too early (every other day by default)
3. **Showing Status**: Displays when the next turn is due and whether you're ready to log
4. **Recording History**: Keeps a log of all turns with optional notes
5. **Flexible Settings**: Adjust totals, intervals, and whether to log top/bottom together or separately

The orthodontist typically completes the first turn on install day, so the app starts with both counters at 1.

## Running Locally

### Option 1: Open Directly (Simplest)

Simply open `index.html` in your web browser:

1. Navigate to the project folder
2. Double-click `index.html` or right-click and select "Open with" your preferred browser

**Note**: Some browsers may have restrictions on localStorage when opening files directly. If you encounter issues, use Option 2.

### Option 2: Local Server (Recommended)

Using a local server ensures all features work correctly and allows testing on mobile devices on your network.

#### Python 3

```bash
# Navigate to the project directory
cd spread-turn-tracker

# Start the server
python -m http.server 5173

# Or for Python 2
python -m SimpleHTTPServer 5173
```

Then open: `http://localhost:5173`

#### Node.js

```bash
# Install http-server globally (one time)
npm install -g http-server

# Navigate to the project directory
cd spread-turn-tracker

# Start the server
http-server -p 5173
```

Then open: `http://localhost:5173`

#### PHP

```bash
# Navigate to the project directory
cd spread-turn-tracker

# Start the server
php -S localhost:5173
```

Then open: `http://localhost:5173`

### Testing on Mobile

If running a local server, you can test on your phone:

1. Find your computer's local IP address:
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **Mac/Linux**: `ifconfig` or `ip addr` (look for inet address)
2. On your phone, open: `http://YOUR_IP_ADDRESS:5173`
   - Make sure your phone and computer are on the same Wi-Fi network

## Deployment to GitHub Pages

GitHub Pages is free, fast, and perfect for simple static web apps like this one. Follow these steps:

### Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right, then "New repository"
3. Name your repository (e.g., `spread-turn-tracker`)
4. Choose **Public** (required for free GitHub Pages) or **Private** (requires GitHub Pro/Team)
5. **Do NOT** initialize with README, .gitignore, or license (we already have files)
6. Click "Create repository"

### Step 2: Push Your Code

If you haven't initialized git yet:

```bash
# Navigate to the project directory
cd spread-turn-tracker

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Spreader Turn Tracker app"

# Add your GitHub repository as remote (replace USERNAME and REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

If you already have git initialized:

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Click **Save**

### Step 4: Access Your App

GitHub will provide your app URL. It will be:

```
https://USERNAME.github.io/REPO_NAME/
```

For example: `https://johndoe.github.io/spread-turn-tracker/`

**Note**: It may take a few minutes for the site to be available after enabling Pages. You'll see a green checkmark when it's ready.

### Updating Your App

To update your deployed app:

```bash
# Make your changes to the files
# Then commit and push
git add .
git commit -m "Update app"
git push
```

Changes will be live within a few minutes.

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

## Data & Privacy

**All data is stored locally in your browser's localStorage.** This means:

- ✅ **No server required**: Everything runs in your browser
- ✅ **Completely private**: Your data never leaves your device
- ✅ **No accounts needed**: No sign-up or login required
- ✅ **Works offline**: After the initial load, the app works without internet

**Important Notes**:

- Data is stored per browser/device. If you use the app on multiple devices, each will have separate data.
- Clearing browser data will delete your progress. Consider exporting important data if needed.
- If you want to sync across devices, you'll need a version with a backend (future enhancement).

## Browser Compatibility

The app works on all modern browsers:

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (iOS 12+, macOS 10.14+)
- ✅ Samsung Internet

**Minimum Requirements**:
- JavaScript enabled
- localStorage support (all modern browsers)
- CSS Grid support (all modern browsers)

## Troubleshooting

### Data Not Saving

- Make sure cookies/localStorage are enabled in your browser settings
- Try using a local server instead of opening the file directly
- Check browser console for errors (F12 → Console)

### Buttons Not Working

- Make sure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

### Can't Deploy to GitHub Pages

- Make sure your repository is set to **Public** (or you have GitHub Pro/Team for private repos)
- Verify you selected the correct branch (`main` or `master`)
- Wait a few minutes after enabling Pages - it can take time to build

### Mobile Issues

- Make sure you're using Safari on iOS or Chrome on Android for "Add to Home Screen"
- Test the URL in your mobile browser first before adding to home screen
- Clear browser cache if the app doesn't update after changes

## File Structure

```
spread-turn-tracker/
├── index.html      # Main HTML structure
├── styles.css      # All styling
├── app.js          # Application logic and state management
└── README.md       # This file
```

## License

This is a simple family utility app. Feel free to use, modify, and share as needed.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review browser console for errors
3. Ensure all files are present and properly linked

---

**Made with ❤️ for families tracking orthodontic progress**

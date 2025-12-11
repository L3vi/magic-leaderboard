# Data Synchronization Guide

This explains how data flows between your local files and Firebase, and when to use which command.

## The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                   archived-data/                            │
│  master-leaderboard.json ←→ firebase-snapshot.json          │
│  (Your "source of truth")    (Current Firebase state)       │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
        [upload-to-firebase]        [download-from-firebase]
               ↓                              ↑
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  FIREBASE (Live Database)                  │
│                                                             │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                  [app reads/writes here]
                              │
                        API requests from
                        frontend + backend
```

## Files Explained

### `archived-data/master-leaderboard.json`
- **Your source of truth** for what should be in the database
- Contains:
  - Players list
  - All historical sessions (e.g., 2025-May, 2025-December)
  - Games for each session
- **When to edit this:**
  - You want to add/remove games
  - You want to fix historical data
  - You're adding a new season
- **After editing:** Run `npm run upload-to-firebase` to sync changes

### `archived-data/firebase-snapshot.json`
- **A snapshot of what's currently in Firebase**
- Created by: `npm run download-from-firebase`
- **Use this for:**
  - Verifying what got uploaded
  - Recovering from accidental changes (restore from this file)
  - Documenting Firebase state at a point in time
- **Don't edit this manually** - it's auto-generated

### `backend/data/players.json` & `backend/data/games.json`
- **Fallback files** if Firebase is down
- Auto-created by: `npm run download-from-firebase`
- Used by: API endpoints when Firebase unavailable
- **Don't edit manually** - always regenerate after uploading

## The Workflow

### Scenario 1: You edited `master-leaderboard.json` locally

```bash
# 1. Upload your changes to Firebase
npm run upload-to-firebase

# 2. Verify it worked
npm run download-from-firebase

# 3. Inspect the snapshot to confirm
cat archived-data/firebase-snapshot.json | jq .

# 4. Copy fallback files to frontend
cp backend/data/{players,games}.json frontend/src/data/

# 5. Test the app
npm run dev
```

### Scenario 2: Firebase got corrupted, use your backup

```bash
# 1. Restore from snapshot (or master-leaderboard.json)
npm run upload-to-firebase

# 2. Verify it worked
npm run download-from-firebase

# 3. Copy fallback files
cp backend/data/{players,games}.json frontend/src/data/

# 4. Test the app
npm run dev
```

### Scenario 3: You want to see what's currently in Firebase

```bash
# Download a fresh snapshot
npm run download-from-firebase

# View it
cat archived-data/firebase-snapshot.json | jq .
```

### Scenario 4: New game created in the app

```
Frontend → API request → Backend saves to Firebase ✓
Firebase → npm run download-from-firebase → backup created
local files → copy to frontend → next session loads it
```

## Command Reference

| Command | Direction | Source | Destination |
|---------|-----------|--------|-------------|
| `npm run upload-to-firebase` | → | `master-leaderboard.json` | Firebase |
| `npm run download-from-firebase` | ← | Firebase | `firebase-snapshot.json` + fallback files |

## Key Points to Remember

1. **`master-leaderboard.json` is your source of truth**
   - Edit this when you want to change what's in the database
   - Then run `upload-to-firebase`

2. **`firebase-snapshot.json` is auto-generated**
   - Don't edit this, it gets overwritten
   - Use it to see current Firebase state
   - Can restore from it in emergencies

3. **Always sync fallback files after uploading**
   ```bash
   npm run upload-to-firebase
   npm run download-from-firebase
   cp backend/data/{players,games}.json frontend/src/data/
   ```

4. **Test after syncing**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

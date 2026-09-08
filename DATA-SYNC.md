# Data Synchronization Guide

This explains how data flows between your local files and Firebase, and when to use which command.

## ⚠️ Read this before uploading

`npm run upload-to-firebase` (= `npm run restore`, `backend/src/restore.ts`) is an
**additive, overwrite** restore:

- Docs present in your file **replace** the live doc. Docs absent from your file
  are **never deleted**.
- `players` and `sessions` are written with `{ merge: true }`, so live fields the
  file doesn't carry (e.g. `commanderArt` preferences) survive.
- **Game docs are written without `merge`** — a game in your file fully replaces
  the live game doc of the same id.
- So uploading a **stale** master file overwrites live games that were entered in
  the app after your file was last downloaded.

The script protects you, if you let it:

- It downloads the current Firebase state to a timestamped backup under
  `archived-data/` before writing anything.
- It prints a diff of what will be overwritten/added and lists live docs absent
  from the file.
- `--dry-run` prints that diff and exits **without writing**.

**Safe procedure:**

```bash
cd backend
npm run download-from-firebase          # refresh archived-data/firebase-snapshot.json
npm run restore -- --dry-run            # read the diff. Actually read it.
npm run restore                         # only if the diff is what you expect
```

To add just new data without touching anything else, build a minimal file
(new players + the one new session) and upload only that:

```bash
cd backend && npm run restore -- --file=/abs/path/to/new-data.json
```

> **Command location:** `upload-to-firebase`, `restore`, and
> `download-from-firebase` are **backend** scripts. Run them from `backend/`, or
> from the repo root with `--prefix backend`. They do not exist as root scripts.
> Only `backup-firebase`, `sync-data`, `dev`, `build`, and `deploy` are root scripts.

> **Scope:** restore writes `players`, `sessions`, and `sessions/*/games` only.
> A commander upload never touches `cube-events` (backed up separately in
> `archived-data/cube-events-snapshot.json`).

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

## The Workflow

### Scenario 1: You edited `master-leaderboard.json` locally

```bash
# 1. Upload your changes to Firebase
npm run upload-to-firebase

# 2. Verify it worked
npm run download-from-firebase

# 3. Inspect the snapshot to confirm
cat archived-data/firebase-snapshot.json | jq .

# 4. Sync frontend data and test
npm run dev
```

### Scenario 2: Firebase got corrupted, use your backup

```bash
# 1. Restore from snapshot (or master-leaderboard.json)
npm run upload-to-firebase

# 2. Verify it worked
npm run download-from-firebase

# 3. Test the app
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
| `npm run download-from-firebase` | ← | Firebase | `firebase-snapshot.json` |
| `npm run dev` (frontend) | → | `master-leaderboard.json` | `frontend/src/data/` |

## Key Points to Remember

1. **`master-leaderboard.json` is your source of truth**
   - Edit this when you want to change what's in the database
   - Then run `npm run upload-to-firebase`

2. **`firebase-snapshot.json` is auto-generated**
   - Don't edit this, it gets overwritten
   - Use it to see current Firebase state
   - Can restore from it in emergencies

3. **Frontend syncs data automatically**
   - `npm run dev` and `npm run build` automatically sync frontend data from `master-leaderboard.json`
   - No need for manual copying

4. **Single source of truth workflow**
   ```bash
   # Edit the master file
   vim archived-data/master-leaderboard.json
   
   # Upload to Firebase
   npm run upload-to-firebase
   
   # Verify it worked
   npm run download-from-firebase
   
   # Inspect the snapshot
   cat archived-data/firebase-snapshot.json | jq .
   
   # Frontend syncs automatically when you run dev
   npm run dev
   ```

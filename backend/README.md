# Backend

Express + TypeScript API for Magic Leaderboard.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start server:
   ```bash
   npm run dev
   ```

## Available Commands

### Development
- `npm run dev` - Start development server with hot reload

### Backup & Restore

#### Backup (Download from Firebase)
```bash
npm run backup              # Download to firebase-snapshot.json
npm run backup-firebase     # Download to master-leaderboard.json with timestamp
npm run download-from-firebase  # Alias for backup
```

#### Restore (Upload to Firebase)
```bash
npm run restore             # Upload from master-leaderboard.json (default)
npm run restore -- --file=path/to/file.json  # Upload from custom file
npm run upload-to-firebase  # Alias for restore
```

## Project Structure

```
src/
├── app.ts              # Express app setup
├── firebase.ts         # Firebase configuration
├── types.ts            # Shared TypeScript interfaces
├── firebaseUtils.ts    # Shared Firebase operations
├── backup.ts           # Download from Firebase
├── restore.ts          # Upload to Firebase
├── downloadFromFirebase.ts  # Download with fallback files
├── api/                # API route handlers
│   ├── games.ts
│   ├── players.ts
│   └── artPreferences.ts
├── scripts/
│   └── backup-master.ts    # Master backup with versioning
└── archived-scripts/   # Legacy scripts (not used)
    ├── importMasterData.ts
    ├── migrateOldData.ts
    ├── setupSessions.ts
    ├── seedSession.ts
    └── README.md
```

## Architecture Notes

- All Firebase operations go through `firebaseUtils.ts`
- Type definitions centralized in `types.ts`
- Backup scripts are lightweight wrappers around `firebaseUtils`
- Data flows: Firebase → Local JSON → Frontend

See [CLEANUP.md](../CLEANUP.md) in the root for recent refactoring details.

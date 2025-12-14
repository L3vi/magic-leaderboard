# Archived Backend Scripts

These scripts are not currently used in the active application. They were kept for reference and historical purposes.

## Scripts

- **importMasterData.ts** - Duplicate of restore.ts, use `npm run restore` instead
- **migrateOldData.ts** - Old data migration script for legacy Firebase project
- **setupSessions.ts** - Old session setup script, data management now handled by app
- **seedSession.ts** - Old data seeding script, no longer maintained

## To Restore Functionality

All data operations are now centralized:
- **Backup:** `npm run backup-firebase`
- **Download:** `npm run download-from-firebase`
- **Restore/Upload:** `npm run restore`

See main backend README for current usage patterns.

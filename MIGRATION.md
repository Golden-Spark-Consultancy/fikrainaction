# Migration — fikraInAction

## What changed

Legacy editorial posts live in `blogPosts/{slug}`.

Target model:

- `posts/{postId}` — shared metadata
- `postLocales/{postId}_{locale}` — localized title, slug, content, status, SEO
- `slugReservations` — uniqueness

Legacy documents are **not deleted**. Readers fall back to `blogPosts` when new collections are empty.

## Backup before production migration

```bash
gcloud config set project fikra-e47d9
gcloud firestore export gs://YOUR_BACKUP_BUCKET/fikra-$(date +%Y%m%d)
```

## Dry run

Without `gcloud` on Windows, use a Firebase service-account JSON (never commit it):

```powershell
# After downloading the key from Firebase Console → Project settings → Service accounts
npm run migrate:dry-run -- --credentials $env:USERPROFILE\.secrets\fikra-e47d9.json
```

Or with Application Default Credentials:

```bash
gcloud auth application-default login
gcloud config set project fikra-e47d9
npm run migrate:dry-run
```

## Apply (idempotent)

```powershell
npm run migrate -- --credentials $env:USERPROFILE\.secrets\fikra-e47d9.json
```

Re-running skips documents already marked `migratedFrom: blogPosts`.

## Validate

1. Compare counts: `blogPosts` published vs `postLocales` where locale=en.
2. Spot-check `/en/blog/{slug}` for migrated slugs.
3. Confirm slug reservations exist.
4. Keep legacy fields until verified for at least one release cycle.

## Rollback / recovery

1. Stop writing to `posts` / `postLocales` if a bad migration is detected.
2. Restore Firestore export to a new database or overwrite carefully.
3. Public site continues to read `blogPosts` when new docs are missing.

## Seed demonstration content

Does not overwrite real content:

```bash
npm run seed:dry-run
npm run seed
```

## Emulator testing

```bash
npm run firebase:emulators
# in another shell with emulator env:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrate
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
```

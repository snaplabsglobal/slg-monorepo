# Recycle Bin Auto-Cleanup Cron

## Endpoint

- **URL**: `GET /api/cron/cleanup-recycle-bin`
- **Auth**: `Authorization: Bearer <CRON_SECRET>`

## Behavior

1. Selects transactions where `deleted_at` is older than 30 days.
2. Optionally deletes attachment files from R2 (when configured).
3. Permanently deletes those rows from `transactions`.

## Environment

- `CRON_SECRET`: Required. Set a secret and pass it in the `Authorization: Bearer <CRON_SECRET>` header.
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: Required for DB access (service role bypasses RLS).

## Vercel Cron

In `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-recycle-bin",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Schedule `0 2 * * *` = daily at 2:00 AM (project timezone).

## Response

- `200`: `{ success: true, deleted_count: number }` or `{ success: true, deleted_count: 0 }`
- `401`: Missing or invalid `CRON_SECRET`
- `500`: DB/config error

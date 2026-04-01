# Build List

What we want to build next, roughly in priority order.

1. Teacher guidance / how-to pages (teachers first, then students)
2. Notifications — quiz published, results released, join request approved
3. MyTeacher messaging (teacher ↔ student within classes)
4. RLS policies — tighten all tables before go-live
5. `teacher_ref` column on `teacher_bank_items` — optional teacher-defined reference code per question. Surface in bank editor, bank list, CSV import/export, and teacher-api (create/update). Lets teachers tag questions with their own IDs for cross-referencing.

## Schema Issues to Investigate
- **payments.created_at** — admin payments page (`admin/payments.html` line 637) tries to display `p.created_at` but that column doesn't exist in the live DB. Will show as blank/undefined in the timeline section.
- **users.last_login_utc** — column exists in DB but nothing writes to it. Either wire it up (e.g. update on login) or drop it.
- **users.username** — column exists in DB but no code references it. Drop if not planned.

## Intentionally Deferred
- Sequential runner mode

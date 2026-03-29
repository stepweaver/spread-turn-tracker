# Migrating from v1 (legacy app) to v2

The legacy app stored a single shared tracker per **canonical `users` row** (first user in the `users` table) with `settings`, `turns`, and `treatment_notes` keyed by that `user_id`. V2 models **households**, **patients**, **treatment_plans**, **turn_logs**, and **treatment_notes** with **Supabase Auth** users and **RLS**.

## Conceptual mapping

| v1 | v2 |
|----|-----|
| `users` (custom bcrypt table) | `auth.users` + `profiles` |
| N/A | `households` (create one shared household) |
| N/A | `household_members` (`owner` / `caregiver` / `viewer`) |
| `settings.child_name` | `patients.name` |
| `settings.*` (totals, schedule, install) | `treatment_plans` (one active row per patient) |
| `turns` | `turn_logs` (`patient_id`, `household_id`, `created_by` = profile id) |
| `treatment_notes` | `treatment_notes` (same pattern) |

## Suggested one-time SQL (outline)

Run after v2 migrations and after **Supabase Auth** accounts exist for each caregiver.

1. Create a **household** row.
2. Insert **`household_members`** linking each `profiles.id` (matches `auth.users.id`) to that household with the right `role`.
3. Insert **`patients`** (`household_id`, `name` from legacy `settings.child_name`).
4. Insert **`treatment_plans`** from legacy `settings` (`top_total`, `bottom_total`, `install_date`, `schedule_type`, `interval_days`, `is_active = true`).
5. Copy **`turns`** → **`turn_logs`**: map `date`, `arch`, `note`; set `patient_id`, `household_id`; set `created_by` to the **owner** profile id (or a chosen caregiver).
6. Copy **`treatment_notes`** similarly.

Then freeze or drop legacy tables when you are satisfied.

## Known v1 issues superseded in v2

- Settings API used `user_id: userId` where `userId` was undefined on insert ([`api/settings.js`](../api/settings.js)).
- Shared writes used **service role** and **first-user** anchoring ([`api/lib/shared.js`](../api/lib/shared.js)); v2 uses **anon key + RLS** and household membership.

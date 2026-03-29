-- Spread Turn Tracker v2 — core schema + RLS

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_self_or_household"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.household_members hm1
      join public.household_members hm2
        on hm1.household_id = hm2.household_id
      where hm1.user_id = auth.uid() and hm2.user_id = profiles.id
    )
  );

create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Household',
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

create policy "households_select_member"
  on public.households for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id and hm.user_id = auth.uid()
    )
  );

create policy "households_update_owner_caregiver"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = households.id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  )
  with check (true);

-- ---------------------------------------------------------------------------
-- household_members
-- ---------------------------------------------------------------------------
create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'caregiver', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

alter table public.household_members enable row level security;

create policy "household_members_select_same_household"
  on public.household_members for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
    )
  );

create policy "household_members_insert_owner"
  on public.household_members for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

create policy "household_members_update_owner"
  on public.household_members for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

create policy "household_members_delete_owner"
  on public.household_members for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = household_members.household_id
        and hm.user_id = auth.uid()
        and hm.role = 'owner'
    )
  );

-- ---------------------------------------------------------------------------
-- patients
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.patients enable row level security;

create policy "patients_select_member"
  on public.patients for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = patients.household_id and hm.user_id = auth.uid()
    )
  );

create policy "patients_insert_write_role"
  on public.patients for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = patients.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "patients_update_write_role"
  on public.patients for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = patients.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "patients_delete_write_role"
  on public.patients for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = patients.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

-- ---------------------------------------------------------------------------
-- treatment_plans
-- ---------------------------------------------------------------------------
create table public.treatment_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  top_total integer not null check (top_total between 1 and 999),
  bottom_total integer not null check (bottom_total between 1 and 999),
  install_date date,
  schedule_type text not null check (schedule_type in ('every_n_days', 'twice_per_week')),
  interval_days integer not null default 2 check (interval_days between 1 and 365),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index treatment_plans_one_active_per_patient
  on public.treatment_plans (patient_id)
  where is_active = true;

alter table public.treatment_plans enable row level security;

create policy "treatment_plans_select_member"
  on public.treatment_plans for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_plans.household_id and hm.user_id = auth.uid()
    )
  );

create policy "treatment_plans_insert_write_role"
  on public.treatment_plans for insert
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_plans.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "treatment_plans_update_write_role"
  on public.treatment_plans for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_plans.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "treatment_plans_delete_write_role"
  on public.treatment_plans for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_plans.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

-- ---------------------------------------------------------------------------
-- turn_logs
-- ---------------------------------------------------------------------------
create table public.turn_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  date date not null,
  arch text not null check (arch in ('top', 'bottom')),
  note text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index turn_logs_unique_daily_arch
  on public.turn_logs (patient_id, date, arch);

create index turn_logs_patient_date_idx
  on public.turn_logs (patient_id, date desc, created_at desc);

alter table public.turn_logs enable row level security;

create policy "turn_logs_select_member"
  on public.turn_logs for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = turn_logs.household_id and hm.user_id = auth.uid()
    )
  );

create policy "turn_logs_insert_write_role"
  on public.turn_logs for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.household_members hm
      where hm.household_id = turn_logs.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "turn_logs_update_write_role"
  on public.turn_logs for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = turn_logs.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "turn_logs_delete_write_role"
  on public.turn_logs for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = turn_logs.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

-- ---------------------------------------------------------------------------
-- treatment_notes
-- ---------------------------------------------------------------------------
create table public.treatment_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  date date not null,
  note text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index treatment_notes_patient_date_idx
  on public.treatment_notes (patient_id, date desc, created_at desc);

alter table public.treatment_notes enable row level security;

create policy "treatment_notes_select_member"
  on public.treatment_notes for select
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_notes.household_id and hm.user_id = auth.uid()
    )
  );

create policy "treatment_notes_insert_write_role"
  on public.treatment_notes for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_notes.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "treatment_notes_update_write_role"
  on public.treatment_notes for update
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_notes.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

create policy "treatment_notes_delete_write_role"
  on public.treatment_notes for delete
  using (
    exists (
      select 1 from public.household_members hm
      where hm.household_id = treatment_notes.household_id
        and hm.user_id = auth.uid()
        and hm.role in ('owner', 'caregiver')
    )
  );

-- ---------------------------------------------------------------------------
-- Consistency: household_id matches patient
-- ---------------------------------------------------------------------------
create or replace function public.enforce_patient_household_turn_logs()
returns trigger
language plpgsql
as $$
declare
  ph uuid;
begin
  select household_id into ph from public.patients where id = new.patient_id;
  if ph is distinct from new.household_id then
    raise exception 'turn_logs.household_id must match patient.household_id';
  end if;
  return new;
end;
$$;

create trigger tr_turn_logs_patient_household
  before insert or update on public.turn_logs
  for each row execute function public.enforce_patient_household_turn_logs();

create or replace function public.enforce_patient_household_treatment_notes()
returns trigger
language plpgsql
as $$
declare
  ph uuid;
begin
  select household_id into ph from public.patients where id = new.patient_id;
  if ph is distinct from new.household_id then
    raise exception 'treatment_notes.household_id must match patient.household_id';
  end if;
  return new;
end;
$$;

create trigger tr_treatment_notes_patient_household
  before insert or update on public.treatment_notes
  for each row execute function public.enforce_patient_household_treatment_notes();

create or replace function public.enforce_plan_patient_household()
returns trigger
language plpgsql
as $$
declare
  ph uuid;
begin
  select household_id into ph from public.patients where id = new.patient_id;
  if ph is distinct from new.household_id then
    raise exception 'treatment_plans.household_id must match patient.household_id';
  end if;
  return new;
end;
$$;

create trigger tr_treatment_plans_patient_household
  before insert or update on public.treatment_plans
  for each row execute function public.enforce_plan_patient_household();

-- ---------------------------------------------------------------------------
-- updated_at helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tr_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

create trigger tr_treatment_plans_updated_at
  before update on public.treatment_plans
  for each row execute function public.set_updated_at();

create trigger tr_treatment_notes_updated_at
  before update on public.treatment_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: new user → profile
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Bootstrap first household (no existing membership)
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_household(household_name text default 'Household')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
  pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'User already belongs to a household';
  end if;

  insert into public.households (name)
  values (coalesce(nullif(trim(household_name), ''), 'Household'))
  returning id into hid;

  insert into public.household_members (household_id, user_id, role)
  values (hid, auth.uid(), 'owner');

  insert into public.patients (household_id, name)
  values (hid, 'Child')
  returning id into pid;

  insert into public.treatment_plans (
    household_id,
    patient_id,
    top_total,
    bottom_total,
    install_date,
    schedule_type,
    interval_days,
    is_active
  )
  values (hid, pid, 27, 23, null, 'every_n_days', 2, true);

  return hid;
end;
$$;

revoke all on function public.bootstrap_household(text) from public;
grant execute on function public.bootstrap_household(text) to authenticated;

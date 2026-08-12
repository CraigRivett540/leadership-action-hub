-- Shared team dashboard for Helping Heroes / Community Assist
-- All signed-in staff see the same data (not per-user silos).

create table if not exists staff_profiles (
  id text primary key,
  auth_user_id text,
  name text not null,
  app_role text not null check (app_role in ('admin', 'staff')),
  title text not null default '',
  email text not null unique,
  phone text not null default '',
  organisation text not null default 'hh' check (organisation in ('hh', 'ca', 'both')),
  location text not null default '',
  specialties text not null default '',
  bio text not null default '',
  start_date text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists team_groups (
  id text primary key,
  name text not null,
  description text not null default '',
  organisation text not null default 'both' check (organisation in ('hh', 'ca', 'both')),
  purpose text not null default '',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id text not null references team_groups(id) on delete cascade,
  staff_id text not null references staff_profiles(id) on delete cascade,
  primary key (group_id, staff_id)
);

create table if not exists actions (
  id text primary key,
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'closed')),
  due_date text,
  created_at text not null,
  created_by text not null references staff_profiles(id),
  assignee_id text not null,
  action_type text not null check (action_type in ('task', 'request', 'todo')),
  organisation text not null default 'hh' check (organisation in ('hh', 'ca', 'both')),
  files_json text not null default '[]'
);

create table if not exists action_notes (
  id text primary key,
  action_id text not null references actions(id) on delete cascade,
  author_id text not null references staff_profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists review_items (
  id text primary key,
  title text not null,
  content text not null default '',
  audience text not null default 'all',
  created_at text not null,
  created_by text not null references staff_profiles(id),
  organisation text not null default 'both' check (organisation in ('hh', 'ca', 'both'))
);

create table if not exists app_meta (
  key text primary key,
  value text not null
);

create index if not exists actions_status_idx on actions (status);
create index if not exists actions_assignee_idx on actions (assignee_id);
create index if not exists action_notes_action_idx on action_notes (action_id);
create index if not exists staff_profiles_email_idx on staff_profiles (email);

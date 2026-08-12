-- Temporary PIN feedback pins (testing tool) — screen coordinates for precision notes.

create table if not exists pin_issues (
  id text primary key,
  title text not null,
  description text not null default '',
  severity text not null default 'medium',
  status text not null default 'open',
  organisation text not null default 'both',
  reported_by text not null,
  feedback text not null default '',
  x_pct double precision not null default 50,
  y_pct double precision not null default 50,
  target_hint text not null default '',
  page_path text not null default '/',
  created_at text not null,
  updated_at text not null
);

create index if not exists pin_issues_status_idx on pin_issues (status);

import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  ActionItem,
  ActionType,
  Group,
  OrgKey,
  ReviewItem,
  StaffProfile,
} from "@/lib/types";

export const CEO_EMAIL = "craig@helpingheroes.com.au";
export const CEO_NAME = "Craig Rivett";
export const ADMIN_ID = "admin";
export const LAURA_ID = "s_laura";
export const LAURA_EMAIL = "laura@helpingheroes.com.au";
const LEADERSHIP_GROUP_ID = "g_leadership";

type StaffRow = {
  id: string;
  auth_user_id: string | null;
  name: string;
  app_role: "admin" | "staff";
  title: string;
  email: string;
  phone: string;
  organisation: OrgKey;
  location: string;
  specialties: string;
  bio: string;
  start_date: string;
  active: boolean;
};

function mapStaff(r: StaffRow): StaffProfile {
  return {
    id: r.id,
    name: r.name,
    role: r.app_role,
    title: r.title,
    email: r.email,
    phone: r.phone,
    organisation: r.organisation,
    location: r.location,
    specialties: r.specialties,
    bio: r.bio,
    startDate: r.start_date,
    active: r.active,
  };
}

async function ensureSchema() {
  const sql = await getSql();
  const statements = [
    `create table if not exists staff_profiles (
      id text primary key,
      auth_user_id text,
      name text not null,
      app_role text not null,
      title text not null default '',
      email text not null unique,
      phone text not null default '',
      organisation text not null default 'hh',
      location text not null default '',
      specialties text not null default '',
      bio text not null default '',
      start_date text not null default '',
      active boolean not null default true,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists team_groups (
      id text primary key,
      name text not null,
      description text not null default '',
      organisation text not null default 'both',
      purpose text not null default '',
      is_system boolean not null default false,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists group_members (
      group_id text not null references team_groups(id) on delete cascade,
      staff_id text not null references staff_profiles(id) on delete cascade,
      primary key (group_id, staff_id)
    )`,
    `create table if not exists actions (
      id text primary key,
      title text not null,
      description text not null default '',
      status text not null default 'open',
      due_date text,
      created_at text not null,
      created_by text not null,
      assignee_id text not null,
      action_type text not null,
      organisation text not null default 'hh',
      files_json text not null default '[]'
    )`,
    `create table if not exists action_notes (
      id text primary key,
      action_id text not null references actions(id) on delete cascade,
      author_id text not null,
      body text not null,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists review_items (
      id text primary key,
      title text not null,
      content text not null default '',
      audience text not null default 'all',
      created_at text not null,
      created_by text not null,
      organisation text not null default 'both'
    )`,
    `create table if not exists app_meta (
      key text primary key,
      value text not null
    )`,
    `alter table actions drop constraint if exists actions_action_type_check`,
    `alter table actions add constraint actions_action_type_check check (action_type in ('task', 'request', 'todo', 'personal_task', 'personal_request', 'family'))`,
    `create index if not exists actions_status_idx on actions (status)`,
    `create index if not exists actions_assignee_idx on actions (assignee_id)`,
    `create index if not exists action_notes_action_idx on action_notes (action_id)`,
    `create index if not exists staff_profiles_email_idx on staff_profiles (email)`,
  ];
  for (const statement of statements) {
    try {
      await sql.query(statement);
    } catch (err) {
      console.warn("[ensureSchema] skipped:", String(err).slice(0, 120));
    }
  }
}

async function ensureCeoProfile() {
  const sql = await getSql();
  // Insert only if missing — never overwrite email/name the CEO set in Staff profiles
  await sql`
    insert into staff_profiles (
      id, auth_user_id, name, app_role, title, email, phone, organisation,
      location, specialties, bio, start_date, active
    ) values (
      ${ADMIN_ID}, ${null}, ${CEO_NAME}, ${"admin"}, ${"Chief Executive Officer"},
      ${CEO_EMAIL}, ${"1300 500 834"}, ${"both"}, ${"National"},
      ${"Executive leadership"},
      ${"CEO of Helping Heroes Rehabilitation Service and Community Assist."},
      ${"2014-01-01"}, ${true}
    )
    on conflict (id) do update set
      app_role = ${"admin"},
      active = ${true}
  `;
}

async function ensureLauraProfile() {
  const sql = await getSql();
  // Always keep Laura Rivett (Director) on the roster with leadership access
  await sql`
    insert into staff_profiles (
      id, auth_user_id, name, app_role, title, email, phone, organisation,
      location, specialties, bio, start_date, active
    ) values (
      ${LAURA_ID}, ${null}, ${"Laura Rivett"}, ${"admin"}, ${"Director"},
      ${LAURA_EMAIL}, ${""}, ${"both"}, ${"National"},
      ${"Director · operational leadership"},
      ${"Director — full leadership access with the CEO."},
      ${"2016-01-01"}, ${true}
    )
    on conflict (id) do update set
      name = ${"Laura Rivett"},
      app_role = ${"admin"},
      title = ${"Director"},
      email = ${LAURA_EMAIL},
      organisation = ${"both"},
      location = ${"National"},
      specialties = ${"Director · operational leadership"},
      active = ${true}
  `;
  // Clear any duplicate row that might block her email
  await sql`
    delete from staff_profiles
    where lower(email) = lower(${LAURA_EMAIL}) and id <> ${LAURA_ID}
  `;
  try {
    await sql`
      insert into group_members (group_id, staff_id)
      values (${"g_leadership"}, ${LAURA_ID})
      on conflict do nothing
    `;
  } catch {
    /* group may not exist yet */
  }
}

/**
 * Force CEO password to Helpingheroes1 and sync login email with staff profile.
 * Safe to call without auth (login page warm-up).
 */
async function ensureCeoLoginPassword() {
  const sql = await getSql();
  const password = "Helpingheroes1";
  const hash = await hashPassword(password);
  const now = new Date().toISOString();

  // Prefer current staff profile email (what CEO set in Staff profiles)
  const profile = await sql<{ email: string; name: string; auth_user_id: string | null }>`
    select email, name, auth_user_id from staff_profiles where id = ${ADMIN_ID} limit 1
  `;
  const loginEmail = (profile[0]?.email || CEO_EMAIL).trim().toLowerCase();
  const loginName = profile[0]?.name || CEO_NAME;

  // Find existing auth user by linked id, then by email (any previous email)
  let uid = profile[0]?.auth_user_id ?? null;
  if (uid) {
    const check = await sql<{ id: string }>`select id from "user" where id = ${uid} limit 1`;
    if (!check[0]) uid = null;
  }
  if (!uid) {
    const byEmail = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${loginEmail} limit 1
    `;
    uid = byEmail[0]?.id ?? null;
  }
  if (!uid) {
    // last resort: any user previously linked / default CEO email
    const byDefault = await sql<{ id: string }>`
      select id from "user" where lower(email) = lower(${CEO_EMAIL}) limit 1
    `;
    uid = byDefault[0]?.id ?? null;
  }
  if (!uid) {
    uid = `user_${ADMIN_ID}`;
    await sql`
      insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      values (
        ${uid}, ${loginName}, ${loginEmail}, ${true},
        ${now}::timestamptz, ${now}::timestamptz
      )
      on conflict (id) do update set
        email = excluded.email,
        name = excluded.name,
        "updatedAt" = excluded."updatedAt"
    `;
  } else {
    // Keep auth email in sync with staff profile email
    await sql`
      update "user"
      set email = ${loginEmail}, name = ${loginName}, "updatedAt" = ${now}::timestamptz
      where id = ${uid}
    `;
  }

  const accounts = await sql<{ id: string }>`
    select id from "account"
    where "userId" = ${uid} and "providerId" = ${"credential"}
    limit 1
  `;
  if (accounts[0]) {
    await sql`
      update "account"
      set password = ${hash},
          "accountId" = ${loginEmail},
          "updatedAt" = ${now}::timestamptz
      where id = ${accounts[0].id}
    `;
  } else {
    const accId = `cred_admin_${String(uid).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
    await sql`
      insert into "account" (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      ) values (
        ${accId}, ${loginEmail}, ${"credential"}, ${uid}, ${hash},
        ${now}::timestamptz, ${now}::timestamptz
      )
      on conflict (id) do update set
        password = excluded.password,
        "accountId" = excluded."accountId",
        "updatedAt" = excluded."updatedAt"
    `;
  }

  await sql`
    update staff_profiles set auth_user_id = ${uid} where id = ${ADMIN_ID}
  `;
}

async function ensureLeadershipGroupForEveryone() {
  const sql = await getSql();
  await sql`
    insert into team_groups (id, name, description, organisation, purpose, is_system)
    values (
      ${LEADERSHIP_GROUP_ID},
      ${"Leadership (All)"},
      ${"Whole leadership and staff group across both organisations."},
      ${"both"},
      ${"Organisation-wide actions and requirements"},
      ${true}
    )
    on conflict (id) do update set
      name = ${"Leadership (All)"},
      description = ${"Whole leadership and staff group across both organisations."},
      purpose = ${"Organisation-wide actions and requirements"},
      is_system = ${true},
      organisation = ${"both"}
  `;
  const people = await sql<{ id: string }>`
    select id from staff_profiles where active = true
  `;
  for (const person of people) {
    await sql`
      insert into group_members (group_id, staff_id)
      values (${LEADERSHIP_GROUP_ID}, ${person.id})
      on conflict do nothing
    `;
  }
}

async function clearTestData() {
  const sql = await getSql();
  for (const gid of ["g_hh_clinical", "g_ca_ndis"]) {
    await sql`delete from group_members where group_id = ${gid}`;
    await sql`delete from team_groups where id = ${gid}`;
  }
  for (const aid of ["a1", "a2", "a3", "a4", "a5"]) {
    await sql`delete from action_notes where action_id = ${aid}`;
    await sql`delete from actions where id = ${aid}`;
  }
  await sql`delete from action_notes where id = ${"n1"}`;
  await sql`delete from action_notes where id = ${"n2"}`;
  await sql`delete from review_items where id = ${"r1"}`;
  await sql`delete from review_items where id = ${"r2"}`;
  await sql`delete from review_items where title like ${"%Board Pack%"}`;
  await sql`delete from review_items where title like ${"%documentation standards%"}`;
  await ensureLeadershipGroupForEveryone();
}


/** Canonical work emails for login (keep in sync with staff instruction email). */
const CANONICAL_STAFF_EMAILS: Record<string, string> = {
  [ADMIN_ID]: "craig@helpingheroes.com.au",
  [LAURA_ID]: "laura@helpingheroes.com.au",
  s_evi: "evi@communityassist.com.au",
  s_elise: "elise@communityassist.com.au",
  s_akal: "akal@helpingheroes.com.au",
  s_paige: "paige@crconsulting.net.au",
  s_jess: "jessica@helpingheroes.com.au",
};

/** Force staff profile emails to the approved login addresses. */
async function ensureCorrectStaffEmails() {
  const sql = await getSql();
  for (const [id, email] of Object.entries(CANONICAL_STAFF_EMAILS)) {
    await sql`
      update staff_profiles
      set email = ${email}
      where id = ${id}
    `;
  }
}

async function ensureSeeded() {
  await ensureSchema();
  const sql = await getSql();
  await ensureCeoProfile();
  await ensureLauraProfile();
  await ensureCorrectStaffEmails();
  await ensureCeoLoginPassword();

  const meta = await sql<{ value: string }>`select value from app_meta where key = ${"seeded"}`;
  if (meta[0]?.value === "1") {
    await ensureLauraProfile();
    await ensureCorrectStaffEmails();
    await ensureCeoLoginPassword();
    await clearTestData();
    return;
  }

  const staffSeed: StaffProfile[] = [
    {
      id: ADMIN_ID,
      name: CEO_NAME,
      role: "admin",
      title: "Chief Executive Officer",
      email: CEO_EMAIL,
      phone: "1300 500 834",
      organisation: "both",
      location: "National",
      specialties: "Executive leadership",
      bio: "CEO of Helping Heroes Rehabilitation Service and Community Assist.",
      startDate: "2014-01-01",
      active: true,
    },
    {
      id: LAURA_ID,
      name: "Laura Rivett",
      role: "admin",
      title: "Director",
      email: LAURA_EMAIL,
      phone: "",
      organisation: "both",
      location: "National",
      specialties: "Director · operational leadership",
      bio: "Director — full leadership access with the CEO.",
      startDate: "2016-01-01",
      active: true,
    },
    {
      id: "s_evi",
      name: "Evi Ackland",
      role: "staff",
      title: "Rehabilitation Consultant",
      email: "evi@communityassist.com.au",
      phone: "",
      organisation: "hh",
      location: "South Australia",
      specialties: "Veteran rehabilitation, psychosocial support",
      bio: "",
      startDate: "2022-03-01",
      active: true,
    },
    {
      id: "s_elise",
      name: "Elise Gurney",
      role: "staff",
      title: "Rehabilitation Consultant",
      email: "elise@communityassist.com.au",
      phone: "",
      organisation: "hh",
      location: "South Australia",
      specialties: "Injury management, vocational support",
      bio: "",
      startDate: "2021-06-15",
      active: true,
    },
    {
      id: "s_akal",
      name: "Akal Dalby",
      role: "staff",
      title: "Support Coordinator",
      email: "akal@helpingheroes.com.au",
      phone: "",
      organisation: "ca",
      location: "South Australia",
      specialties: "NDIS support coordination, community access",
      bio: "",
      startDate: "2023-01-10",
      active: true,
    },
    {
      id: "s_paige",
      name: "Paige Banning",
      role: "staff",
      title: "Rehabilitation Consultant",
      email: "paige@crconsulting.net.au",
      phone: "",
      organisation: "both",
      location: "Queensland",
      specialties: "Medical management, allied health liaison",
      bio: "",
      startDate: "2020-09-01",
      active: true,
    },
    {
      id: "s_jess",
      name: "Jessica Goodsell",
      role: "staff",
      title: "Team Lead",
      email: "jessica@helpingheroes.com.au",
      phone: "",
      organisation: "both",
      location: "South Australia",
      specialties: "Clinical leadership, quality & compliance",
      bio: "",
      startDate: "2019-02-18",
      active: true,
    },
  ];

  for (const s of staffSeed) {
    await sql`
      insert into staff_profiles (
        id, auth_user_id, name, app_role, title, email, phone, organisation,
        location, specialties, bio, start_date, active
      ) values (
        ${s.id}, ${null}, ${s.name}, ${s.role}, ${s.title}, ${s.email},
        ${s.phone}, ${s.organisation}, ${s.location}, ${s.specialties}, ${s.bio},
        ${s.startDate}, ${s.active}
      )
      on conflict (id) do update set
        -- preserve email (and other fields staff/CEO edited in profiles)
        app_role = excluded.app_role,
        active = excluded.active
    `;
  }

  await ensureLeadershipGroupForEveryone();
  await sql`
    insert into app_meta (key, value) values (${"seeded"}, ${"1"})
    on conflict (key) do update set value = ${"1"}
  `;
}

async function loadBundle() {
  await ensureSeeded();
  const sql = await getSql();

  const staffRows = await sql<StaffRow>`
    select id, auth_user_id, name, app_role, title, email, phone, organisation,
           location, specialties, bio, start_date, active
    from staff_profiles
    order by case when app_role = 'admin' then 0 else 1 end, name
  `;
  const groupRows = await sql<{
    id: string;
    name: string;
    description: string;
    organisation: OrgKey;
    purpose: string;
    is_system: boolean;
  }>`select id, name, description, organisation, purpose, is_system from team_groups order by name`;

  const memberRows = await sql<{ group_id: string; staff_id: string }>`
    select group_id, staff_id from group_members
  `;
  const membersByGroup = new Map<string, string[]>();
  for (const m of memberRows) {
    const list = membersByGroup.get(m.group_id) ?? [];
    list.push(m.staff_id);
    membersByGroup.set(m.group_id, list);
  }

  const actionRows = await sql<{
    id: string;
    title: string;
    description: string;
    status: "open" | "closed";
    due_date: string | null;
    created_at: string;
    created_by: string;
    assignee_id: string;
    action_type: ActionType;
    organisation: OrgKey;
    files_json: string;
  }>`
    select id, title, description, status, due_date, created_at, created_by,
           assignee_id, action_type, organisation, files_json
    from actions
    order by due_date nulls last, created_at desc
  `;

  const noteRows = await sql<{
    id: string;
    action_id: string;
    author_id: string;
    body: string;
    created_at: string;
  }>`
    select id, action_id, author_id, body, created_at::text as created_at
    from action_notes
    order by created_at
  `;
  const notesByAction = new Map<string, ActionItem["notes"]>();
  for (const n of noteRows) {
    const list = notesByAction.get(n.action_id) ?? [];
    list.push({
      id: n.id,
      text: n.body,
      authorId: n.author_id,
      createdAt: n.created_at,
    });
    notesByAction.set(n.action_id, list);
  }

  const reviewRows = await sql<{
    id: string;
    title: string;
    content: string;
    audience: string;
    created_at: string;
    created_by: string;
    organisation: OrgKey;
  }>`
    select id, title, content, audience, created_at, created_by, organisation
    from review_items
    order by created_at desc
  `;

  return {
    staff: staffRows.map(mapStaff),
    groups: groupRows.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      organisation: g.organisation,
      purpose: g.purpose,
      memberIds: membersByGroup.get(g.id) ?? [],
      isSystem: g.is_system,
    })),
    actions: actionRows.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status,
      dueDate: a.due_date,
      createdAt: a.created_at,
      createdBy: a.created_by,
      assigneeId: a.assignee_id,
      type: a.action_type,
      organisation: a.organisation,
      notes: notesByAction.get(a.id) ?? [],
      files: (() => {
        try {
          return JSON.parse(a.files_json) as { name: string; size: number }[];
        } catch {
          return [];
        }
      })(),
    })),
    reviews: reviewRows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      audience: r.audience,
      createdAt: r.created_at,
      createdBy: r.created_by,
      organisation: r.organisation,
    })),
  };
}

async function staffIdForAuthUser(userId: string) {
  const sql = await getSql();
  const byAuth = await sql<{ id: string }>`
    select id from staff_profiles where auth_user_id = ${userId} limit 1
  `;
  if (byAuth[0]) return byAuth[0].id;

  const userRows = await sql<{ email: string }>`
    select email from "user" where id = ${userId} limit 1
  `;
  const email = userRows[0]?.email?.trim().toLowerCase();
  if (!email) return null;

  const byEmail = await sql<{ id: string }>`
    select id from staff_profiles where lower(email) = ${email} limit 1
  `;
  if (byEmail[0]) {
    await sql`
      update staff_profiles set auth_user_id = ${userId} where id = ${byEmail[0].id}
    `;
    return byEmail[0].id;
  }
  return null;
}

async function requireAdmin(userId: string) {
  await ensureSeeded();
  const staffId = await staffIdForAuthUser(userId);
  if (!staffId) throw new Error("Not linked to a staff profile");
  const sql = await getSql();
  const rows = await sql<{ app_role: string }>`
    select app_role from staff_profiles where id = ${staffId} limit 1
  `;
  if (rows[0]?.app_role !== "admin") {
    throw new Error("Only leadership (CEO or Director) can manage staff and groups");
  }
}


/** Public warm-up: seed staff + set CEO password before anyone signs in. */
export const prepareLogin = createServerFn({ method: "GET" }).handler(async () => {
  await ensureSeeded();
  await ensureCeoLoginPassword();
  return { ok: true as const };
});

export const bootstrapDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const bundle = await loadBundle();
    const myStaffId = await staffIdForAuthUser(context.userId);
    return { ...bundle, myStaffId };
  });

export const saveStaffProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: StaffProfile) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const email = data.email.trim().toLowerCase();
    const name = data.name.trim();
    if (!email) throw new Error("Staff email is required");
    if (!name) throw new Error("Staff name is required");

    if (data.id === ADMIN_ID) {
      data = {
        ...data,
        id: ADMIN_ID,
        role: "admin",
        email,
        name: name || CEO_NAME,
      };
    } else if (data.id === LAURA_ID) {
      data = {
        ...data,
        id: LAURA_ID,
        role: "admin",
        email,
        name: name || "Laura Rivett",
        title: data.title.trim() || "Director",
      };
    } else {
      data = {
        ...data,
        role: "staff",
        email,
        name,
      };
    }
    const sql = await getSql();
    await ensureSchema();

    // Capture previous auth link + email for sync
    const prev = await sql<{ auth_user_id: string | null; email: string }>`
      select auth_user_id, email from staff_profiles where id = ${data.id} limit 1
    `;

    await sql`
      insert into staff_profiles (
        id, name, app_role, title, email, phone, organisation,
        location, specialties, bio, start_date, active
      ) values (
        ${data.id}, ${data.name}, ${data.role}, ${data.title}, ${data.email},
        ${data.phone}, ${data.organisation}, ${data.location}, ${data.specialties},
        ${data.bio}, ${data.startDate}, ${data.active}
      )
      on conflict (id) do update set
        name = excluded.name,
        app_role = excluded.app_role,
        title = excluded.title,
        email = excluded.email,
        phone = excluded.phone,
        organisation = excluded.organisation,
        location = excluded.location,
        specialties = excluded.specialties,
        bio = excluded.bio,
        start_date = excluded.start_date,
        active = excluded.active
    `;

    // Keep auth login email in sync with staff profile email
    const authUid = prev[0]?.auth_user_id;
    if (authUid) {
      const now = new Date().toISOString();
      try {
        await sql`
          update "user"
          set email = ${data.email}, name = ${data.name}, "updatedAt" = ${now}::timestamptz
          where id = ${authUid}
        `;
        await sql`
          update "account"
          set "accountId" = ${data.email}, "updatedAt" = ${now}::timestamptz
          where "userId" = ${authUid} and "providerId" = ${"credential"}
        `;
      } catch (err) {
        console.warn("[saveStaffProfile] auth email sync", err);
      }
    }

    // CEO password stays Helpingheroes1 after profile edits
    if (data.id === ADMIN_ID) {
      await ensureCeoLoginPassword();
    }
    // keep leadership membership in sync
    try {
      await sql`
        insert into group_members (group_id, staff_id)
        values (${LEADERSHIP_GROUP_ID}, ${data.id})
        on conflict do nothing
      `;
    } catch {
      /* ignore */
    }
    return { ok: true };
  });

export const removeStaffProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await requireAdmin(context.userId);
    if (id === ADMIN_ID) throw new Error("Cannot delete the CEO profile");
    if (id === LAURA_ID) throw new Error("Cannot delete the Director profile");
    const sql = await getSql();
    await sql`delete from staff_profiles where id = ${id}`;
    return { ok: true };
  });

export const saveGroupRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Group) => data)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await ensureSchema();
    await sql`
      insert into team_groups (id, name, description, organisation, purpose, is_system)
      values (${data.id}, ${data.name}, ${data.description}, ${data.organisation}, ${data.purpose}, ${Boolean(data.isSystem)})
      on conflict (id) do update set
        name = excluded.name,
        description = excluded.description,
        organisation = excluded.organisation,
        purpose = excluded.purpose
    `;
    await sql`delete from group_members where group_id = ${data.id}`;
    let members = data.memberIds.includes(ADMIN_ID)
      ? [...data.memberIds]
      : [ADMIN_ID, ...data.memberIds];
    if (data.id === LEADERSHIP_GROUP_ID && !members.includes(LAURA_ID)) {
      members = [...members, LAURA_ID];
    }
    for (const mid of members) {
      await sql`
        insert into group_members (group_id, staff_id)
        values (${data.id}, ${mid})
        on conflict do nothing
      `;
    }
    return { ok: true };
  });

export const removeGroupRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{ is_system: boolean }>`
      select is_system from team_groups where id = ${id}
    `;
    if (rows[0]?.is_system) throw new Error("Cannot delete a system group");
    await sql`delete from team_groups where id = ${id}`;
    return { ok: true };
  });

export const saveActionRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: ActionItem) => data)
  .handler(async ({ context, data }) => {
    const staffId = await staffIdForAuthUser(context.userId);
    if (!staffId) throw new Error("Not linked to a staff profile");
    const sql = await getSql();
    await ensureSchema();
    await sql`
      insert into actions (
        id, title, description, status, due_date, created_at, created_by,
        assignee_id, action_type, organisation, files_json
      ) values (
        ${data.id}, ${data.title}, ${data.description}, ${data.status}, ${data.dueDate},
        ${data.createdAt}, ${data.createdBy}, ${data.assigneeId}, ${data.type},
        ${data.organisation}, ${JSON.stringify(data.files ?? [])}
      )
      on conflict (id) do update set
        title = excluded.title,
        description = excluded.description,
        status = excluded.status,
        due_date = excluded.due_date,
        assignee_id = excluded.assignee_id,
        action_type = excluded.action_type,
        organisation = excluded.organisation,
        files_json = excluded.files_json
    `;
    return { ok: true };
  });

export const toggleActionRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const staffId = await staffIdForAuthUser(context.userId);
    if (!staffId) throw new Error("Not linked to a staff profile");
    const sql = await getSql();
    const rows = await sql<{ status: string }>`
      select status from actions where id = ${id} limit 1
    `;
    if (!rows[0]) throw new Error("Action not found");
    const next = rows[0].status === "open" ? "closed" : "open";
    await sql`update actions set status = ${next} where id = ${id}`;
    return { ok: true, status: next };
  });

export const addActionNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { actionId: string; text: string; noteId: string; authorId: string }) => data)
  .handler(async ({ context, data }) => {
    const staffId = await staffIdForAuthUser(context.userId);
    if (!staffId) throw new Error("Not linked to a staff profile");
    const sql = await getSql();
    await sql`
      insert into action_notes (id, action_id, author_id, body)
      values (${data.noteId}, ${data.actionId}, ${data.authorId || staffId}, ${data.text})
      on conflict (id) do nothing
    `;
    return { ok: true };
  });

export const saveReviewRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: ReviewItem) => data)
  .handler(async ({ context, data }) => {
    const staffId = await staffIdForAuthUser(context.userId);
    if (!staffId) throw new Error("Not linked to a staff profile");
    const sql = await getSql();
    await ensureSchema();
    await sql`
      insert into review_items (id, title, content, audience, created_at, created_by, organisation)
      values (
        ${data.id}, ${data.title}, ${data.content}, ${data.audience},
        ${data.createdAt}, ${data.createdBy}, ${data.organisation}
      )
      on conflict (id) do update set
        title = excluded.title,
        content = excluded.content,
        audience = excluded.audience,
        organisation = excluded.organisation
    `;
    return { ok: true };
  });

export const removeReviewRecord = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`delete from review_items where id = ${id}`;
    return { ok: true };
  });

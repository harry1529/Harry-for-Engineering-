-- =====================================================
-- Mentor Harry for Engineering — database setup (Stage 1)
-- Paste this WHOLE file into Supabase > SQL Editor > Run.
-- It is safe to read; every block is commented.
-- =====================================================

-- ---------- 1. TABLES ----------

create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,              -- used in the web address, e.g. 'cse'
  name        text not null,                     -- short name, e.g. 'CSE'
  full_name   text,                              -- e.g. 'Computer Science & Engineering'
  icon        text default '🎓',
  description text,
  position    int  not null default 0,           -- sort order
  published   boolean not null default false,    -- only published rows are public
  created_at  timestamptz not null default now()
);

create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  semester    int  not null check (semester between 1 and 8),
  code        text,                              -- optional subject code
  name        text not null,
  description text,
  position    int  not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.units (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  unit_number int  not null check (unit_number between 1 and 10),
  title       text not null,
  description text,
  notes_path  text,                              -- file path inside the 'notes' bucket
  iq_path     text,                              -- Important Questions PDF (optional)
  pyq_path    text,                              -- Previous Year Questions PDF (optional)
  position    int  not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (subject_id, unit_number)
);

-- Notes sent by visitors through the "Contribute notes" form
create table if not exists public.submissions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 100),
  email      text check (email is null or char_length(email) <= 200),
  branch     text check (branch is null or char_length(branch) <= 100),
  subject    text check (subject is null or char_length(subject) <= 150),
  unit       text check (unit is null or char_length(unit) <= 150),
  link       text check (link is null or (char_length(link) <= 500 and link ~* '^https?://')),
  message    text check (message is null or char_length(message) <= 2000),
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

-- ---------- 2. SECURITY (Row Level Security) ----------
-- Turning RLS on means: nobody can do anything unless a policy allows it.

alter table public.branches    enable row level security;
alter table public.subjects    enable row level security;
alter table public.units       enable row level security;
alter table public.submissions enable row level security;

-- Public visitors may only READ published content.
drop policy if exists "Public reads published branches" on public.branches;
create policy "Public reads published branches" on public.branches
  for select using (published = true);

drop policy if exists "Public reads published subjects" on public.subjects;
create policy "Public reads published subjects" on public.subjects
  for select using (published = true);

drop policy if exists "Public reads published units" on public.units;
create policy "Public reads published units" on public.units
  for select using (published = true);

-- Visitors may ADD a submission (always as 'pending'), but cannot read,
-- change or delete any. Reading submissions comes with the admin portal (Stage 2).
drop policy if exists "Anyone can submit notes" on public.submissions;
create policy "Anyone can submit notes" on public.submissions
  for insert to anon, authenticated
  with check (status = 'pending');

-- There are NO insert/update/delete policies for branches, subjects or units.
-- That means the public cannot change them. Admin-only write policies
-- are added in Stage 2.

-- ---------- 3. FILE STORAGE (PDF bucket) ----------
-- Public bucket (so students can open PDFs), PDF files only, max 20 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notes', 'notes', true, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = true,
      file_size_limit = 20971520,
      allowed_mime_types = array['application/pdf'];
-- No upload policy is created, so the public cannot upload.
-- Admin upload rights are added in Stage 2.

-- ---------- 4. SAMPLE DATA: 1 branch, 1 semester, 2 subjects ----------
-- Run this block only once. Running it twice will fail on the 'cse' slug (that is fine).
do $$
declare
  b_id uuid;
  s_ds uuid;
  s_dm uuid;
begin
  insert into public.branches (slug, name, full_name, icon, description, position, published)
  values ('cse', 'CSE', 'Computer Science & Engineering', '💻',
          'Programming, data structures, algorithms, databases, operating systems and more.', 1, true)
  returning id into b_id;

  insert into public.subjects (branch_id, semester, name, description, position, published)
  values (b_id, 3, 'Data Structures',
          'Arrays, stacks, queues, linked lists, trees, graphs, sorting and hashing.', 1, true)
  returning id into s_ds;

  insert into public.subjects (branch_id, semester, name, description, position, published)
  values (b_id, 3, 'Discrete Structures',
          'Sets, logic, algebraic structures, graph theory and combinatorics.', 2, true)
  returning id into s_dm;

  insert into public.units (subject_id, unit_number, title, description, position, published) values
    (s_ds, 1, 'Introduction and Arrays',        'Algorithms, complexity, arrays and basic operations.', 1, true),
    (s_ds, 2, 'Stacks and Queues',              'Stack and queue operations, applications, circular and priority queues.', 2, true),
    (s_ds, 3, 'Linked Lists',                   'Singly, doubly and circular linked lists with operations.', 3, true),
    (s_ds, 4, 'Trees',                          'Binary trees, BST, AVL trees, traversals and heaps.', 4, true),
    (s_ds, 5, 'Graphs, Sorting and Hashing',    'Graph representation, BFS and DFS, sorting algorithms and hash tables.', 5, true),
    (s_dm, 1, 'Sets, Relations and Functions',  'Set operations, relations, equivalence and functions.', 1, true),
    (s_dm, 2, 'Propositional Logic',            'Propositions, truth tables, normal forms and inference.', 2, true),
    (s_dm, 3, 'Algebraic Structures',           'Groups, rings, fields and lattices.', 3, true),
    (s_dm, 4, 'Graph Theory',                   'Graph types, paths, trees, planarity and colouring.', 4, true),
    (s_dm, 5, 'Combinatorics',                  'Counting principles, permutations, combinations and recurrence relations.', 5, true);
end $$;

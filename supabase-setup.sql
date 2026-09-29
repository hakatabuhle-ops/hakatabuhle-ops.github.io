create table if not exists public.portfolio_profile (
  id integer primary key check (id = 1),
  name text not null,
  study_stage text not null,
  qualification text not null,
  university text not null,
  location text not null default '',
  tagline text not null,
  about_lead text not null,
  about_body text not null,
  about_note text not null default '',
  role_title text not null default '',
  contact_email text not null default '',
  github_url text not null default '',
  linkedin_url text not null default '',
  other_url text not null default '',
  resume_path text not null default '',
  resume_name text not null default ''
);

alter table public.portfolio_profile add column if not exists role_title text not null default '';
alter table public.portfolio_profile add column if not exists contact_email text not null default '';
alter table public.portfolio_profile add column if not exists github_url text not null default '';
alter table public.portfolio_profile add column if not exists linkedin_url text not null default '';
alter table public.portfolio_profile add column if not exists other_url text not null default '';
alter table public.portfolio_profile add column if not exists resume_path text not null default '';
alter table public.portfolio_profile add column if not exists resume_name text not null default '';

insert into public.portfolio_profile (
  id, name, study_stage, qualification, university, location,
  tagline, about_lead, about_body, about_note, role_title
) values (
  1,
  'Buhle Hakata',
  'ICT student',
  'Information and Communication Technology',
  'Mangosuthu University of Technology',
  'Durban, South Africa',
  'I enjoy learning how technology works and building my skills through coursework and projects. I''m growing my knowledge in ICT and documenting what I learn here.',
  'I''m Buhle, an Information and Communication Technology student at Mangosuthu University of Technology.',
  'I''m building my knowledge one lesson and one project at a time. This portfolio is a growing record of what I learn and make during my studies.',
  'New here, and excited for what''s next.',
  'Information and Communication Technology Student'
) on conflict (id) do nothing;

update public.portfolio_profile
set study_stage = case when study_stage = 'First-year ICT student' then 'ICT student' else study_stage end,
    role_title = case when role_title = 'Web Developer & ICT Student' then 'Information and Communication Technology Student' else role_title end,
    tagline = case
      when tagline = 'Curious about technology. Learning by building. This is where I share my journey, my projects, and the skills I''m growing along the way.'
      then 'I enjoy learning how technology works and building my skills through coursework and projects. I''m growing my knowledge in ICT and documenting what I learn here.'
      when tagline = 'I enjoy learning how technology works and building my skills through coursework and projects. I''m growing my knowledge in ICT and documenting what I learn here.'
      then tagline
      when tagline = 'I build websites and keep growing my skills in web development and ICT. Explore my projects to see what I create and what I''m learning.'
      then 'I enjoy learning how technology works and building my skills through coursework and projects. I''m growing my knowledge in ICT and documenting what I learn here.'
      else tagline
    end,
    about_lead = case
      when about_lead = 'I''m Buhle, a first-year student at Mangosuthu University of Technology, studying Information and Communication Technology.'
      then 'I''m Buhle, an Information and Communication Technology student at Mangosuthu University of Technology.'
      else about_lead
    end,
    about_body = case
      when about_body = 'I''m at the beginning of my journey in tech, building my knowledge one lesson and one project at a time. This portfolio is a growing record of what I learn and make during my studies.'
      then 'I''m building my knowledge one lesson and one project at a time. This portfolio is a growing record of what I learn and make during my studies.'
      else about_body
    end
where id = 1
  and (study_stage = 'First-year ICT student'
    or role_title = 'Web Developer & ICT Student'
    or tagline = 'Curious about technology. Learning by building. This is where I share my journey, my projects, and the skills I''m growing along the way.'
    or tagline = 'I build websites and keep growing my skills in web development and ICT. Explore my projects to see what I create and what I''m learning.'
    or about_lead = 'I''m Buhle, a first-year student at Mangosuthu University of Technology, studying Information and Communication Technology.'
    or about_body = 'I''m at the beginning of my journey in tech, building my knowledge one lesson and one project at a time. This portfolio is a growing record of what I learn and make during my studies.');

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null default 'Project',
  date text,
  link text,
  github_url text,
  demo_url text,
  tech_stack text[] not null default '{}',
  features text[] not null default '{}',
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now()
);

alter table public.portfolio_projects add column if not exists github_url text;
alter table public.portfolio_projects add column if not exists demo_url text;
alter table public.portfolio_projects add column if not exists tech_stack text[] not null default '{}';
alter table public.portfolio_projects add column if not exists features text[] not null default '{}';

create table if not exists public.portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('skill', 'credential', 'experience')),
  category text not null default '',
  title text not null,
  organization text not null default '',
  date text not null default '',
  description text not null default '',
  link text not null default '',
  created_at timestamptz not null default now()
);

alter table public.portfolio_profile enable row level security;
alter table public.portfolio_projects enable row level security;
alter table public.portfolio_entries enable row level security;

create or replace function public.is_portfolio_owner()
returns boolean
language sql
stable
as $$
  select (select auth.uid()) = '47a18a0e-0390-4cdd-ad17-6cff5c14ea2e'::uuid
$$;

revoke all on function public.is_portfolio_owner() from public, anon;
grant execute on function public.is_portfolio_owner() to authenticated;

drop policy if exists "Public can read portfolio profile" on public.portfolio_profile;
create policy "Public can read portfolio profile"
  on public.portfolio_profile for select to anon, authenticated using (true);

drop policy if exists "Signed-in owner can update portfolio profile" on public.portfolio_profile;
create policy "Signed-in owner can update portfolio profile"
  on public.portfolio_profile for update to authenticated
  using (public.is_portfolio_owner()) with check (public.is_portfolio_owner());

drop policy if exists "Public can read portfolio projects" on public.portfolio_projects;
create policy "Public can read portfolio projects"
  on public.portfolio_projects for select to anon, authenticated using (true);

drop policy if exists "Signed-in owner can add portfolio projects" on public.portfolio_projects;
create policy "Signed-in owner can add portfolio projects"
  on public.portfolio_projects for insert to authenticated with check (public.is_portfolio_owner());

drop policy if exists "Signed-in owner can update portfolio projects" on public.portfolio_projects;
create policy "Signed-in owner can update portfolio projects"
  on public.portfolio_projects for update to authenticated
  using (public.is_portfolio_owner()) with check (public.is_portfolio_owner());

drop policy if exists "Signed-in owner can remove portfolio projects" on public.portfolio_projects;
create policy "Signed-in owner can remove portfolio projects"
  on public.portfolio_projects for delete to authenticated using (public.is_portfolio_owner());

drop policy if exists "Public can read portfolio entries" on public.portfolio_entries;
create policy "Public can read portfolio entries"
  on public.portfolio_entries for select to anon, authenticated using (true);

drop policy if exists "Signed-in owner can add portfolio entries" on public.portfolio_entries;
create policy "Signed-in owner can add portfolio entries"
  on public.portfolio_entries for insert to authenticated with check (public.is_portfolio_owner());

drop policy if exists "Signed-in owner can update portfolio entries" on public.portfolio_entries;
create policy "Signed-in owner can update portfolio entries"
  on public.portfolio_entries for update to authenticated
  using (public.is_portfolio_owner()) with check (public.is_portfolio_owner());

drop policy if exists "Signed-in owner can remove portfolio entries" on public.portfolio_entries;
create policy "Signed-in owner can remove portfolio entries"
  on public.portfolio_entries for delete to authenticated using (public.is_portfolio_owner());

insert into storage.buckets (id, name, public, file_size_limit)
values ('portfolio-files', 'portfolio-files', true, 10485760)
on conflict (id) do update set public = true, file_size_limit = 10485760;

drop policy if exists "Public can read portfolio attachments" on storage.objects;
create policy "Public can read portfolio attachments"
  on storage.objects for select to anon, authenticated using (bucket_id = 'portfolio-files');

drop policy if exists "Signed-in owner can upload portfolio attachments" on storage.objects;
create policy "Signed-in owner can upload portfolio attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-files' and public.is_portfolio_owner());

drop policy if exists "Signed-in owner can update portfolio attachments" on storage.objects;
create policy "Signed-in owner can update portfolio attachments"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-files' and public.is_portfolio_owner())
  with check (bucket_id = 'portfolio-files' and public.is_portfolio_owner());

drop policy if exists "Signed-in owner can delete portfolio attachments" on storage.objects;
create policy "Signed-in owner can delete portfolio attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-files' and public.is_portfolio_owner());

grant select on public.portfolio_profile, public.portfolio_projects, public.portfolio_entries to anon, authenticated;
grant update on public.portfolio_profile to authenticated;
grant insert, update, delete on public.portfolio_projects to authenticated;
grant insert, update, delete on public.portfolio_entries to authenticated;

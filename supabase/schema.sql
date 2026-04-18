create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'balcony-submissions',
  'balcony-submissions',
  false,
  524288000,
  array['application/zip']
)
on conflict (id) do nothing;

create table if not exists public.mockup_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submission_type text not null check (submission_type in ('builder', 'zip-upload')),
  project_name text,
  bucket_name text not null,
  storage_path text not null,
  original_filename text not null,
  file_size_bytes bigint,
  included_venues text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  email_sent boolean not null default false
);

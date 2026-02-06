# Supabase Setup for Indecisive Eater

## 1. SQL Schema
Run this in the [Supabase SQL Editor](https://supabase.com/dashboard/project/aziufmyjitgfjdmevqzk/sql):

```sql
-- 1. Create Table (If you haven't already/deleted it)
create table matches (
  id text primary key,
  host_name text,
  guest_name text,
  host_food text,
  guest_food text,
  host_move text,
  guest_move text,
  status text default 'waiting',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- OR --

-- 2. Update Table (If it already exists from V1)
alter table matches add column host_name text;
alter table matches add column guest_name text;
```

## 2. Permissions (RLS)
If your app gives "Permission Denied" errors, you need to open up access.
Run this SQL:

```sql
-- Enable RLS (Good practice)
alter table matches enable row level security;

-- Allow ANYONE to create/join/update games (for this public demo)
create policy "Public Access" 
on matches 
for all 
using (true) 
with check (true);
```

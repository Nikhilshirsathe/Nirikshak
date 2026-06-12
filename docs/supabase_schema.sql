-- Users are handled automatically by Supabase Auth

-- Stores each uploaded file per user
create table uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  total_records int default 0,
  flagged_count int default 0,
  created_at timestamptz default now()
);

-- Stores prediction results per upload
create table predictions (
  id uuid default gen_random_uuid() primary key,
  upload_id uuid references uploads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  account_source text,
  destination text,
  amount float default 0,
  risk_score float default 0,
  probability float default 0,
  category text,
  status text,
  velocity_flag text,
  row_index int,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table uploads enable row level security;
alter table predictions enable row level security;

-- RLS Policies: users can only see their own data
create policy "Users see own uploads" on uploads
  for all using (auth.uid() = user_id);

create policy "Users see own predictions" on predictions
  for all using (auth.uid() = user_id);

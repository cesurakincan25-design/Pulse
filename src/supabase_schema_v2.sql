-- =============================================
-- Pulse v2 — Supabase SQL Şeması
-- Supabase Dashboard > SQL Editor'a yapıştır
-- =============================================

-- 1. OYUNCULAR (gerçek kişiler — Eren, Aley, Nes...)
create table public.players (
  id uuid references auth.users on delete cascade primary key,
  username     text unique not null,
  display_name text not null,
  avatar_url   text,
  bio          text,
  is_approved  boolean default false,
  role         text default 'member',  -- 'admin' | 'member'
  created_at   timestamptz default now()
);

-- 2. KARAKTERler & SAYFALAR (oyuncunun birden fazla olabilir)
--    char_type: 'character' | 'page'
create table public.characters (
  id          uuid default gen_random_uuid() primary key,
  player_id   uuid references public.players(id) on delete cascade,
  name        text not null,
  tagline     text,
  bio         text,
  avatar_url  text,
  banner_url  text,
  tags        text[] default '{}',
  char_type   text default 'character',
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- 3. GÖNDERİLER
create table public.posts (
  id           uuid default gen_random_uuid() primary key,
  player_id    uuid references public.players(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  content      text,
  image_url    text,
  post_type    text default 'post',  -- 'post' | 'rp' | 'ooc' | 'lore'
  parent_id    uuid references public.posts(id) on delete cascade,
  likes_count  int default 0,
  comments_count int default 0,
  created_at   timestamptz default now()
);

-- 4. BEĞENİLER
create table public.likes (
  id           uuid default gen_random_uuid() primary key,
  post_id      uuid references public.posts(id) on delete cascade,
  player_id    uuid references public.players(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  created_at   timestamptz default now(),
  unique(post_id, player_id)
);

-- 5. TAKİP (karakter → karakter)
create table public.follows (
  follower_id  uuid references public.characters(id) on delete cascade,
  following_id uuid references public.characters(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

-- 6. MESAJLAR
create table public.conversations (
  id         uuid default gen_random_uuid() primary key,
  updated_at timestamptz default now()
);

create table public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  character_id    uuid references public.characters(id) on delete cascade,
  primary key (conversation_id, character_id)
);

create table public.messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  character_id    uuid references public.characters(id) on delete cascade,
  content         text not null,
  is_read         boolean default false,
  created_at      timestamptz default now()
);

-- 7. BİLDİRİMLER
create table public.notifications (
  id                   uuid default gen_random_uuid() primary key,
  target_character_id  uuid references public.characters(id) on delete cascade,
  actor_character_id   uuid references public.characters(id) on delete cascade,
  type                 text not null,  -- 'like' | 'comment' | 'follow' | 'mention'
  post_id              uuid references public.posts(id) on delete cascade,
  is_read              boolean default false,
  created_at           timestamptz default now()
);

-- 8. DAVETİYELER
create table public.invites (
  id         uuid default gen_random_uuid() primary key,
  code       text unique not null default substring(md5(random()::text), 1, 8),
  note       text,
  created_by uuid references public.players(id),
  used_by    uuid references public.players(id),
  used_at    timestamptz,
  expires_at timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now()
);

-- =============================================
-- TRİGGERLAR
-- =============================================

-- Yeni kayıt → otomatik player profili
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.players (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1), split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Beğeni sayacı
create or replace function update_likes_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set likes_count = likes_count - 1 where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;
create trigger trg_likes after insert or delete on likes for each row execute procedure update_likes_count();

-- Yorum sayacı
create or replace function update_comments_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' and new.parent_id is not null then
    update posts set comments_count = comments_count + 1 where id = new.parent_id;
  elsif TG_OP = 'DELETE' and old.parent_id is not null then
    update posts set comments_count = comments_count - 1 where id = old.parent_id;
  end if;
  return null;
end;
$$ language plpgsql;
create trigger trg_comments after insert or delete on posts for each row execute procedure update_comments_count();

-- Beğeni bildirimi
create or replace function notify_on_like() returns trigger as $$
declare
  post_owner uuid;
begin
  select character_id into post_owner from posts where id = new.post_id;
  if post_owner is not null and post_owner != new.character_id then
    insert into notifications(target_character_id, actor_character_id, type, post_id)
    values (post_owner, new.character_id, 'like', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_like_notif after insert on likes for each row execute procedure notify_on_like();

-- =============================================
-- RLS (küçük topluluk için opsiyonel ama güvenlik için iyi)
-- =============================================

alter table public.players enable row level security;
alter table public.characters enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.invites enable row level security;

-- Herkese okuma
create policy "public_read_players"    on public.players    for select using (true);
create policy "public_read_characters" on public.characters for select using (true);
create policy "public_read_posts"      on public.posts      for select using (true);
create policy "public_read_likes"      on public.likes      for select using (true);

-- Kendi verisi yazma
create policy "own_player"    on public.players    for all using (auth.uid() = id);
create policy "own_character" on public.characters for all using (auth.uid() = player_id);
create policy "own_post"      on public.posts      for all using (auth.uid() = player_id);
create policy "own_like"      on public.likes      for all using (auth.uid() = player_id);
create policy "own_notif"     on public.notifications for all using (
  auth.uid() in (select player_id from characters where id = target_character_id)
);

-- Mesajlar
create policy "message_members" on public.messages for all using (
  auth.uid() in (
    select c.player_id from conversation_members cm
    join characters c on c.id = cm.character_id
    where cm.conversation_id = messages.conversation_id
  )
);

-- Davetiyeler: adminler yönetir
create policy "invite_read"   on public.invites for select using (true);
create policy "invite_insert" on public.invites for insert with check (
  auth.uid() in (select id from players where role = 'admin')
);
create policy "invite_delete" on public.invites for delete using (
  auth.uid() in (select id from players where role = 'admin')
);

-- =============================================
-- STORAGE BUCKET'LAR
-- Dashboard > Storage > New bucket:
-- • avatars     (public: true)
-- • post-media  (public: true)
-- Her bucket'a policy: authenticated kullanıcılar upload yapabilir
-- =============================================

-- =============================================
-- İLK ADMİN KULLANICI
-- Kayıt olduktan sonra bu SQL'i çalıştır:
-- UPDATE players SET role = 'admin', is_approved = true WHERE username = 'senin_kullanici_adin';
-- =============================================

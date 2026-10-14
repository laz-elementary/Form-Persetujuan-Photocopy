-- =========================================================
-- E-PHOTOCOPY V3 - INTEGRATED WORKFLOW
-- Guru -> Kepsek/Wakasek -> Lacak Status -> Resource -> Selesai
-- =========================================================

-- 1) ROLE STAFF: tambahkan WAKASEK
alter table public.staff_access
  drop constraint if exists staff_access_role_check;

alter table public.staff_access
  add constraint staff_access_role_check
  check (role in ('GURU','KEPSEK','WAKASEK','ADMIN','RESOURCE'));

-- 2) KOLOM REVISI + GOOGLE DRIVE
alter table public.photocopy_requests
  add column if not exists revision_notes text,
  add column if not exists revision_requested_at timestamptz,
  add column if not exists revision_requested_by text,
  add column if not exists revision_count integer not null default 0,
  add column if not exists resubmitted_at timestamptz,
  add column if not exists drive_file_id text,
  add column if not exists drive_file_url text,
  add column if not exists drive_uploaded_at timestamptz;

-- 3) STATUS: izinkan PERLU_REVISI
-- Hapus check status lama bila ada. Blok ini hanya menyentuh check constraint
-- pada photocopy_requests yang definisinya merujuk kolom status.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.photocopy_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format(
      'alter table public.photocopy_requests drop constraint if exists %I',
      c.conname
    );
  end loop;
end $$;

alter table public.photocopy_requests
  add constraint photocopy_requests_status_check
  check (
    status in (
      'MENUNGGU',
      'PERLU_REVISI',
      'DISETUJUI',
      'DITOLAK',
      'SEDANG_DICETAK',
      'SELESAI'
    )
  );

create index if not exists idx_photocopy_requests_status
  on public.photocopy_requests(status);

create index if not exists idx_photocopy_requests_target_date
  on public.photocopy_requests(target_date);

-- =========================================================
-- HELPER: JUMLAH PENDING UNTUK BADGE HEADER
-- =========================================================
create or replace function public.staff_pending_count()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count bigint;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select role into v_role
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role not in ('KEPSEK','WAKASEK','ADMIN','RESOURCE') then
    raise exception 'Access denied';
  end if;

  select count(*) into v_count
  from public.photocopy_requests
  where status = 'MENUNGGU';

  return v_count;
end;
$$;

revoke all on function public.staff_pending_count() from public;
grant execute on function public.staff_pending_count() to authenticated;

-- =========================================================
-- PORTAL PERSETUJUAN: KEPSEK + WAKASEK SAMA HAK KEPUTUSAN
-- ADMIN HANYA BACA
-- =========================================================
create or replace function public.approval_portal_list_requests()
returns setof public.photocopy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select role into v_role
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role not in ('KEPSEK','WAKASEK','ADMIN') then
    raise exception 'Access denied';
  end if;

  return query
  select *
  from public.photocopy_requests
  order by submitted_at desc;
end;
$$;

revoke all on function public.approval_portal_list_requests() from public;
grant execute on function public.approval_portal_list_requests() to authenticated;

create or replace function public.review_photocopy_request(
  p_request_id text,
  p_action text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_status text;
  v_action text := upper(trim(coalesce(p_action, '')));
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select role, name into v_role, v_name
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role not in ('KEPSEK','WAKASEK') then
    raise exception 'Hanya Kepala Sekolah atau Wakil Kepala Sekolah yang dapat memberikan keputusan';
  end if;

  select status into v_status
  from public.photocopy_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'Pengajuan tidak ditemukan';
  end if;

  if v_status <> 'MENUNGGU' then
    raise exception 'Pengajuan ini sudah memiliki keputusan atau belum dikirim ulang';
  end if;

  if v_action = 'APPROVE' then
    update public.photocopy_requests
    set
      status = 'DISETUJUI',
      reviewed_at = now(),
      reviewed_by = coalesce(v_name, auth.jwt() ->> 'email'),
      approval_notes = nullif(trim(coalesce(p_notes, '')), ''),
      rejection_reason = null
    where id = p_request_id;

  elsif v_action = 'REVISE' then
    if trim(coalesce(p_notes, '')) = '' then
      raise exception 'Catatan revisi wajib diisi';
    end if;

    update public.photocopy_requests
    set
      status = 'PERLU_REVISI',
      reviewed_at = now(),
      reviewed_by = coalesce(v_name, auth.jwt() ->> 'email'),
      revision_notes = trim(p_notes),
      revision_requested_at = now(),
      revision_requested_by = coalesce(v_name, auth.jwt() ->> 'email'),
      revision_count = coalesce(revision_count, 0) + 1,
      approval_notes = null,
      rejection_reason = null
    where id = p_request_id;

  elsif v_action = 'REJECT' then
    if trim(coalesce(p_notes, '')) = '' then
      raise exception 'Alasan penolakan wajib diisi';
    end if;

    update public.photocopy_requests
    set
      status = 'DITOLAK',
      reviewed_at = now(),
      reviewed_by = coalesce(v_name, auth.jwt() ->> 'email'),
      rejection_reason = trim(p_notes),
      approval_notes = null
    where id = p_request_id;

  else
    raise exception 'Aksi tidak valid. Gunakan APPROVE, REVISE, atau REJECT';
  end if;
end;
$$;

revoke all on function public.review_photocopy_request(text,text,text) from public;
grant execute on function public.review_photocopy_request(text,text,text) to authenticated;

-- =========================================================
-- GURU: CEK & KIRIM ULANG REVISI
-- =========================================================
create or replace function public.teacher_revision_check(
  p_request_id text,
  p_teacher_email text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.photocopy_requests
    where id = p_request_id
      and status = 'PERLU_REVISI'
      and lower(trim(coalesce(teacher_email, ''))) =
          lower(trim(coalesce(p_teacher_email, '')))
  );
$$;

revoke all on function public.teacher_revision_check(text,text) from public;
grant execute on function public.teacher_revision_check(text,text) to anon, authenticated;

-- Hapus versi lama bila ada.
drop function if exists public.teacher_resubmit_revision(
  text,text,text,text,integer,integer,integer,text,text,text,text,date,text,text,text,text,text
);

drop function if exists public.teacher_resubmit_revision(
  text,text,text,text,integer,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text
);

create function public.teacher_resubmit_revision(
  p_request_id text,
  p_teacher_email text,
  p_subject_class text,
  p_title text,
  p_pages_count integer,
  p_copies_count integer,
  p_total_sheets integer,
  p_paper_size text,
  p_color_option text,
  p_print_side text,
  p_urgency text,
  p_target_date date,
  p_notes text,
  p_file_name text default null,
  p_file_size text default null,
  p_file_type text default null,
  p_file_url text default null,
  p_drive_file_id text default null,
  p_drive_file_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_email text;
begin
  select status, teacher_email
  into v_status, v_email
  from public.photocopy_requests
  where id = p_request_id
  for update;

  if v_status is null then
    raise exception 'Pengajuan tidak ditemukan';
  end if;

  if lower(trim(coalesce(v_email, ''))) <>
     lower(trim(coalesce(p_teacher_email, ''))) then
    raise exception 'Email guru tidak sesuai dengan pengajuan';
  end if;

  if v_status <> 'PERLU_REVISI' then
    raise exception 'Pengajuan ini tidak sedang dalam status PERLU_REVISI';
  end if;

  update public.photocopy_requests
  set
    subject_class = trim(p_subject_class),
    title = trim(p_title),
    pages_count = p_pages_count,
    copies_count = p_copies_count,
    total_sheets = p_total_sheets,
    paper_size = p_paper_size,
    color_option = p_color_option,
    print_side = p_print_side,
    urgency = p_urgency,
    target_date = p_target_date,
    notes = p_notes,
    file_name = coalesce(p_file_name, file_name),
    file_size = coalesce(p_file_size, file_size),
    file_type = coalesce(p_file_type, file_type),
    file_url = coalesce(p_file_url, file_url),
    drive_file_id = coalesce(p_drive_file_id, drive_file_id),
    drive_file_url = coalesce(p_drive_file_url, drive_file_url),
    drive_uploaded_at = case
      when p_drive_file_id is not null then now()
      else drive_uploaded_at
    end,
    status = 'MENUNGGU',
    resubmitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    approval_notes = null,
    rejection_reason = null
  where id = p_request_id;
end;
$$;

revoke all on function public.teacher_resubmit_revision(
  text,text,text,text,integer,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text
) from public;

grant execute on function public.teacher_resubmit_revision(
  text,text,text,text,integer,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text
) to anon, authenticated;

-- =========================================================
-- LACAK STATUS PUBLIK: TANPA EMAIL & TANPA URL FILE
-- =========================================================
drop function if exists public.list_photocopy_request_history();

create function public.list_photocopy_request_history()
returns table (
  id text,
  teacher_name text,
  subject_class text,
  title text,
  pages_count integer,
  copies_count integer,
  total_sheets integer,
  paper_size text,
  color_option text,
  print_side text,
  urgency text,
  target_date date,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  approval_notes text,
  rejection_reason text,
  printed_at timestamptz,
  printed_by text,
  completed_at timestamptz,
  revision_notes text,
  revision_requested_at timestamptz,
  revision_requested_by text,
  revision_count integer,
  resubmitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    id,
    teacher_name,
    subject_class,
    title,
    pages_count,
    copies_count,
    total_sheets,
    paper_size,
    color_option,
    print_side,
    urgency,
    target_date,
    status,
    submitted_at,
    reviewed_at,
    reviewed_by,
    approval_notes,
    rejection_reason,
    printed_at,
    printed_by,
    completed_at,
    revision_notes,
    revision_requested_at,
    revision_requested_by,
    revision_count,
    resubmitted_at
  from public.photocopy_requests
  order by submitted_at desc;
$$;

revoke all on function public.list_photocopy_request_history() from public;
grant execute on function public.list_photocopy_request_history() to anon, authenticated;

-- =========================================================
-- RESOURCE: OTOMATIS MELIHAT YANG DISETUJUI + REKAP SELESAI
-- ADMIN JUGA BOLEH MASUK SEBAGAI BACKUP
-- =========================================================
create or replace function public.resource_list_decided_requests()
returns setof public.photocopy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select role into v_role
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role not in ('RESOURCE','ADMIN') then
    raise exception 'Access denied';
  end if;

  return query
  select *
  from public.photocopy_requests
  where status in ('DISETUJUI','SEDANG_DICETAK','SELESAI')
  order by submitted_at desc;
end;
$$;

revoke all on function public.resource_list_decided_requests() from public;
grant execute on function public.resource_list_decided_requests() to authenticated;

create or replace function public.resource_update_print_status(
  p_request_id text,
  p_new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_current_status text;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select role, name into v_role, v_name
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role not in ('RESOURCE','ADMIN') then
    raise exception 'Access denied';
  end if;

  select status into v_current_status
  from public.photocopy_requests
  where id = p_request_id
  for update;

  if v_current_status is null then
    raise exception 'Request not found';
  end if;

  if p_new_status = 'SEDANG_DICETAK' then
    if v_current_status <> 'DISETUJUI' then
      raise exception 'Hanya pengajuan DISETUJUI yang dapat mulai dicetak';
    end if;

    update public.photocopy_requests
    set
      status = 'SEDANG_DICETAK',
      printed_at = now(),
      printed_by = coalesce(v_name, auth.jwt() ->> 'email')
    where id = p_request_id;

  elsif p_new_status = 'SELESAI' then
    if v_current_status <> 'SEDANG_DICETAK' then
      raise exception 'Hanya pengajuan SEDANG_DICETAK yang dapat diselesaikan';
    end if;

    update public.photocopy_requests
    set
      status = 'SELESAI',
      completed_at = now()
    where id = p_request_id;

  else
    raise exception 'Status cetak tidak valid';
  end if;
end;
$$;

revoke all on function public.resource_update_print_status(text,text) from public;
grant execute on function public.resource_update_print_status(text,text) to authenticated;

-- =========================================================
-- ADMIN: MONITOR SEMUA DATA
-- =========================================================
create or replace function public.admin_list_photocopy_requests()
returns setof public.photocopy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Login required';
  end if;

  select role into v_role
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role <> 'ADMIN' then
    raise exception 'Access denied';
  end if;

  return query
  select *
  from public.photocopy_requests
  order by submitted_at desc;
end;
$$;

revoke all on function public.admin_list_photocopy_requests() from public;
grant execute on function public.admin_list_photocopy_requests() to authenticated;

-- =========================================================
-- SELESAI
-- =========================================================

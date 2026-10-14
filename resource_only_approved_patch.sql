-- =========================================================
-- E-PHOTOCOPY: RESOURCE HANYA MELIHAT PENGAJUAN YANG SUDAH ACC
-- Status yang masuk Resource:
-- DISETUJUI -> SEDANG_DICETAK -> SELESAI
-- MENUNGGU / PERLU_REVISI / DITOLAK tidak masuk Portal Resource.
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

  select role
  into v_role
  from public.staff_access
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;

  if v_role is null or v_role not in ('RESOURCE', 'ADMIN') then
    raise exception 'Access denied';
  end if;

  return query
  select *
  from public.photocopy_requests
  where status in (
    'DISETUJUI',
    'SEDANG_DICETAK',
    'SELESAI'
  )
  order by
    case status
      when 'DISETUJUI' then 1
      when 'SEDANG_DICETAK' then 2
      when 'SELESAI' then 3
      else 4
    end,
    target_date asc nulls last,
    submitted_at desc;
end;
$$;

revoke all
on function public.resource_list_decided_requests()
from public;

grant execute
on function public.resource_list_decided_requests()
to authenticated;

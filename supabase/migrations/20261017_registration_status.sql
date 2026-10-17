-- السكرتير يسجّل البيانات الشخصية (pending_medical)، والدكتور يكمل ويعمل Save & Confirm (confirmed)
alter table public.patients
  add column if not exists registration_status text not null default 'confirmed'
    check (registration_status in ('pending_medical','confirmed')),
  add column if not exists confirmed_by uuid references auth.users(id),
  add column if not exists confirmed_at timestamptz;

-- الصفوف القديمة تفضل 'confirmed' (default). الصفوف الجديدة بيبعتها الكلاينت 'pending_medical'.

create or replace function public.enforce_patient_confirmation()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    if new.registration_status = 'confirmed' and coalesce(caller_role,'') not in ('doctor','admin') then
      new.registration_status := 'pending_medical';
      new.confirmed_by := null; new.confirmed_at := null;
    end if;
  elsif new.registration_status is distinct from old.registration_status
        and new.registration_status = 'confirmed'
        and coalesce(caller_role,'') not in ('doctor','admin') then
    raise exception 'فقط الطبيب أو الأدمن يمكنه تأكيد الملف';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_patient_confirmation on public.patients;
create trigger trg_enforce_patient_confirmation
  before insert or update on public.patients
  for each row execute function public.enforce_patient_confirmation();

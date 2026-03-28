create extension if not exists pgcrypto;

create or replace function public.generate_trainer_uid()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'ST-' || lpad(floor(random() * 100000)::text, 5, '0');

    exit when not exists (
      select 1
      from public.trainers
      where id = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.trainers
  alter column id set default public.generate_trainer_uid();

comment on function public.generate_trainer_uid()
is 'Generates a unique SafeTech trainer UID such as ST-04231.';

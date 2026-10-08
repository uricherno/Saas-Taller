-- ════════════════════════════════════════════════════════════════════════════
-- Stock de repuestos sobre la lista de precios.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261011.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--
-- QUÉ HACE
--   precios.stock         → cantidad en el taller. NULL = no se controla stock
--                           de ese ítem (por ejemplo, la mano de obra).
--   precios.stock_minimo  → por debajo (o igual) de esto, aviso de stock bajo.
--   items_orden.stock_descontado → cuánto de esa línea ya se descontó.
--
-- CUÁNDO SE DESCUENTA
--   Un presupuesto todavía no usa repuestos. Se descuenta cuando la orden está
--   "en proceso", "terminado" o "entregado". Si la orden vuelve a presupuesto,
--   se cancela, se quita la línea o se cambia la cantidad, la base devuelve o
--   ajusta la diferencia sola. Lo hace la base (security definer): el mecánico
--   no puede editar la lista de precios, pero sí cargar repuestos en la orden.
-- ════════════════════════════════════════════════════════════════════════════

begin;

alter table public.precios
  add column if not exists stock        numeric(12, 2),
  add column if not exists stock_minimo numeric(12, 2) check (stock_minimo is null or stock_minimo >= 0);

alter table public.items_orden
  add column if not exists stock_descontado numeric(12, 2) not null default 0;

create index if not exists precios_stock_bajo_idx on public.precios (taller_id)
  where stock is not null and stock_minimo is not null and stock <= stock_minimo;

-- Lleva el stock de la lista al valor que corresponde según las líneas de una orden.
create or replace function public.sincronizar_stock_orden(p_orden_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usa boolean;
  i     record;
  v_deseado numeric;
begin
  select o.estado in ('en_proceso', 'terminado', 'entregado') into v_usa
  from public.ordenes_trabajo o where o.id = p_orden_id;
  if v_usa is null then
    return; -- la orden ya no existe (se está borrando)
  end if;

  for i in
    select it.id, it.taller_id, it.precio_id, it.cantidad, it.stock_descontado, p.stock
    from public.items_orden it
    left join public.precios p on p.id = it.precio_id and p.taller_id = it.taller_id
    where it.orden_id = p_orden_id
    for update of it
  loop
    -- Si el ítem no controla stock (o se desvinculó de la lista), no se descuenta nada.
    v_deseado := case when v_usa and i.precio_id is not null and i.stock is not null then i.cantidad else 0 end;

    if v_deseado <> i.stock_descontado then
      if i.precio_id is not null then
        update public.precios
        set stock = stock - (v_deseado - i.stock_descontado)
        where id = i.precio_id and taller_id = i.taller_id and stock is not null;
      end if;
      update public.items_orden set stock_descontado = v_deseado where id = i.id;
    end if;
  end loop;
end;
$$;

revoke execute on function public.sincronizar_stock_orden(uuid) from public, anon, authenticated;

-- stock_descontado solo lo escribe la base: lo que mande la app se ignora.
-- (pg_trigger_depth() = 1 → el cambio viene de afuera, no de estas funciones.)
create or replace function public.items_proteger_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.stock_descontado := 0;
  elsif pg_trigger_depth() = 1 then
    new.stock_descontado := old.stock_descontado;
  end if;
  return new;
end;
$$;

drop trigger if exists items_proteger_stock on public.items_orden;
create trigger items_proteger_stock
  before insert or update on public.items_orden
  for each row execute function public.items_proteger_stock();

-- Líneas: alta, cambio de cantidad o de ítem, y baja (devuelve lo descontado).
create or replace function public.items_stock_trg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.stock_descontado <> 0 and old.precio_id is not null then
      update public.precios
      set stock = stock + old.stock_descontado
      where id = old.precio_id and taller_id = old.taller_id and stock is not null;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.precio_id is distinct from new.precio_id and old.stock_descontado <> 0 then
    -- Cambió el ítem de la lista: devolver lo del ítem anterior y empezar de cero.
    if old.precio_id is not null then
      update public.precios
      set stock = stock + old.stock_descontado
      where id = old.precio_id and taller_id = old.taller_id and stock is not null;
    end if;
    update public.items_orden set stock_descontado = 0 where id = new.id;
  end if;

  perform public.sincronizar_stock_orden(new.orden_id);
  return new;
end;
$$;

drop trigger if exists items_stock on public.items_orden;
create trigger items_stock
  after insert or delete or update of cantidad, precio_id on public.items_orden
  for each row execute function public.items_stock_trg();

-- Orden: cambio de estado.
create or replace function public.ordenes_stock_trg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.estado is distinct from new.estado then
    perform public.sincronizar_stock_orden(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_stock on public.ordenes_trabajo;
create trigger ordenes_stock
  after update of estado on public.ordenes_trabajo
  for each row execute function public.ordenes_stock_trg();

-- Ítems con stock bajo (la API no puede comparar dos columnas, la vista sí).
-- security_invoker: respeta el RLS de quien consulta.
create or replace view public.precios_stock_bajo
with (security_invoker = true)
as
select p.id, p.taller_id, p.codigo, p.descripcion, p.stock, p.stock_minimo
from public.precios p
where p.activo and p.stock is not null and p.stock_minimo is not null and p.stock <= p.stock_minimo;

revoke all on public.precios_stock_bajo from anon;
grant select on public.precios_stock_bajo to authenticated;

commit;

notify pgrst, 'reload schema';

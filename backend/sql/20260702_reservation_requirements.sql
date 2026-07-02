-- Campos necesarios para persistir observaciones y requisitos seleccionables de una solicitud de viaje.
-- Ejecutar una sola vez en el SQL editor de Supabase si estas columnas todavía no existen.
alter table public."solicitudViaje"
  add column if not exists observaciones text,
  add column if not exists restricciones text[] not null default '{}';

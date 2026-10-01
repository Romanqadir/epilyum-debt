-- Corrects the device name: Pelovra -> Pelvora.
--
-- The model name is stored as text in three places on a sale: the `devices`
-- list, the `gift_devices` subset, and the `device_qty` map's key. A check
-- constraint also pins the allowed names, so it has to come off before the
-- rows can hold the new spelling and go back on afterwards.
--
-- Run this once in Supabase -> SQL Editor. It is safe to run twice: rows that
-- already say Pelvora are simply not matched.

begin;

alter table public.sales drop constraint if exists devices_are_known;

update public.sales
set
  devices      = array_replace(devices,      'Pelovra', 'Pelvora'),
  gift_devices = array_replace(gift_devices, 'Pelovra', 'Pelvora'),
  device_qty   = case
                   when device_qty ? 'Pelovra'
                     then (device_qty - 'Pelovra')
                          || jsonb_build_object('Pelvora', device_qty -> 'Pelovra')
                   else device_qty
                 end
where devices @> array['Pelovra']
   or gift_devices @> array['Pelovra']
   or device_qty ? 'Pelovra';

alter table public.sales add constraint devices_are_known check (devices <@ array[
  'Epilyum Hair Removal','Epilyum Axisone CO2','Epilyum Axisone & Thulium',
  'Epilyum Pictron11','Epilyum IPL Revive','Epilyum Thermilif',
  'Epilyum Thermiq','Epilyum AI Reveal','Epilyum Cryolipolysis','RF',
  'Pelvora','Cervera','UPS','Hydra']::text[]);

commit;

notify pgrst, 'reload schema';

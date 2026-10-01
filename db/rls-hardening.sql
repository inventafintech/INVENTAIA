-- db/rls-hardening.sql — Endurecimiento RLS para INVENTA.AI
-- Ejecutar en Supabase Dashboard → SQL Editor (proyecto de producción).
--
-- Modelo de seguridad (verificado 2026-09-30):
--  - TODO el acceso a datos pasa por el servidor Next.js (401 via requireWorkspace).
--  - CERO uso del cliente browser: ningún componente importa @/utils/supabase/client.
--  - El servidor usa SUPABASE_SERVICE_ROLE_KEY (bypassa RLS tras verificar sesión).
-- Por tanto: RLS debe NEGAR TODO a anon/authenticated directos. Sin políticas
-- permisivas no hay bypass posible aunque una key se filtre.
--
-- Seguro de aplicar: la app no usa Supabase Auth (sesiones propias) ni Realtime
-- con anon key. Si algo dejara de leer, revisar que su ruta use createClient()
-- de @/utils/supabase/server (service_role).

-- 1) Activar RLS en todas las tablas de negocio y sistema.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_accuracy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_savings_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prevented_stockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

-- 2) Revocar acceso directo del rol anon (defensa en profundidad; RLS sin
-- políticas ya niega todo, esto cierra también sin-RLS por si una tabla nueva
-- se crea sin RLS).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 3) Lectura pública mínima: NINGUNA por defecto. Si algún día se necesita un
-- endpoint público (ej. catálogo), crear política explícita por tabla, p. ej.:
--   CREATE POLICY "public_catalog_read" ON products
--     FOR SELECT TO anon USING (status = 'active');
-- Hoy: sin políticas = denegado. service_role (servidor) no se ve afectado.

-- 4) Verificación post-aplicación (deben devolver 0 filas con la anon key):
--   SELECT * FROM products LIMIT 1;
--   SELECT * FROM users LIMIT 1;
-- Y con service_role deben seguir devolviendo datos.

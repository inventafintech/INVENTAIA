# Walkthrough: Integraciones Reales Enterprise (Zero Mocks)

Se ha transformado el módulo de **Integraciones & Conectores ERP** (`/dashboard/integraciones`) en una plataforma real de nivel enterprise, eliminando el 100% de datos mock, contadores falsos y estados simulados.

---

## 1. Regla de Estados Reales

- **Si una integración no tiene credenciales válidas en BD:**
  - Muestra estrictamente: **`Pendiente de configuración`** (con badge ámbar/neutral).
  - En **SAP S/4HANA**: Muestra exactamente: **`Conector disponible. Instancia SAP no configurada.`**
  - **PROHIBIDO:** No se muestra `Activo`, `Conectado` ni `Sincronizado` salvo que exista una conexión y tokens reales en base de datos.
  - El contador de KPIs muestra `0 / 6 Integraciones Activas` de forma verídica.

---

## 2. Base de Datos Enterprise y Persistencia

Se crearon las tablas en [db/schema.sql](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/db/schema.sql) y el repositorio [src/lib/db.ts](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/src/lib/db.ts):

| Tabla | Propósito |
| :--- | :--- |
| `integrations` | Registro de proveedores (`shopify`, `mercadolibre`, `whatsapp`, `sap`, `amazon`, `sunat`), configuración y estado (`pending_configuration`, `configured`, `active`, `error`). |
| `oauth_tokens` | Almacenamiento seguro de `access_token`, `refresh_token`, `shop_domain`, `scope` y `expires_at`. |
| `sync_jobs` | Registro de ejecuciones de sincronización con `job_type`, `status` y tiempos. |
| `sync_results` | Conteo real de entidades conciliadas (`products`, `orders`, `inventory`, `sales`, `stock`). |
| `integration_logs` | Auditoría con campos obligatorios: `fecha`, `usuario`, `integracion`, `nivel`, `accion`, `resultado`, `errores` e `ip`. |

---

## 3. Conectores y APIs Oficiales Implementados

### 1. Shopify Plus (`/api/integraciones/shopify/*`)
- **OAuth 2.0 Real:**
  - `/api/integraciones/shopify/auth`: Redirección oficial con `client_id`, `scope` (`read_products,read_orders,read_inventory,write_inventory`), `redirect_uri` y `state`.
  - `/api/integraciones/shopify/callback`: Intercambio de código por `access_token` permanente con `https://{shop}/admin/oauth/access_token`.
- **Sincronización Real (`/api/integraciones/shopify/sync`):**
  - Si no está configurado: Retorna 400 y registra en logs: *"Sincronización rechazada: No existen credenciales activas para Shopify. Estado: Pendiente de configuración."*
  - Si está configurado: Consulta en vivo a Shopify Admin API `/products.json`, `/orders.json` e `/inventory_levels.json`, persistiendo los registros en base de datos.

### 2. Mercado Libre (`/api/integraciones/mercadolibre/*`)
- **OAuth 2.0 Real:**
  - `/api/integraciones/mercadolibre/auth`: Redirección oficial a `https://auth.mercadolibre.com.ar/authorization`.
  - `/api/integraciones/mercadolibre/callback`: Intercambio de `code` por `access_token` y `refresh_token`.
- **Sincronización Real (`/api/integraciones/mercadolibre/sync`):**
  - Consulta en vivo a `/users/{user_id}/items/search` (publicaciones), `/orders/search` (ventas) y `/items?ids=...` (stock disponible), guardando resultados en BD.

### 3. WhatsApp Business (`/api/integraciones/whatsapp/send`)
- **Meta WhatsApp Cloud API v19.0 Real:**
  - Envía peticiones HTTP POST reales a `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages` con `Bearer {WHATSAPP_ACCESS_TOKEN}`.
  - Si no está configurado: Retorna 400 y registra en logs: *"Credenciales de Meta WhatsApp Cloud API no configuradas. El conector se encuentra en estado Pendiente de configuración."*
  - Formulario en la interfaz para probar envíos reales a números de teléfono móviles con respuesta inmediata del servidor de Meta.

### 4. SAP S/4HANA (`/api/integraciones/sap/sync`)
- **Conector REST / OData v4:**
  - Conexión a servicios SAP `API_PRODUCT_SRV` (Catálogo de Materiales MM) y `API_BUSINESS_PARTNER` (Socios Comerciales SD).
  - Si no existe instancia SAP configurada: Retorna 400 con el mensaje exacto: **`"Conector disponible. Instancia SAP no configurada."`** y lo registra en logs.

---

## 4. Botón "Sincronizar" y Registro de Auditoría

Al hacer clic en **Sincronizar**:
1. Llama a la API oficial en el backend.
2. Si no hay credenciales, rechaza la operación con error real y detalle técnico.
3. Actualiza la base de datos con el intento y registra un log con:
   - `fecha`
   - `usuario`
   - `integración`
   - `resultado`
   - `errores`
4. Refresca automáticamente las pestañas **Live Event Logs** y **Registro de Auditoría**, reflejando la operación real.

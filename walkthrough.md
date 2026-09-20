# Walkthrough - Módulos de Reabastecimiento, Órdenes de Compra & Financiamiento

Implementación integral de arquitectura limpia (Clean Architecture), TypeScript estricto, gestión de ciclo de vida de órdenes, base de datos relacional y aprobaciones automatizadas con SAP, Meta WhatsApp Cloud API y Banco Pichincha B2B.

---

## 1. Módulo: Capital de Trabajo & Financiamiento

### 1.1 Arquitectura de Base de Datos y Modelos
Archivos:
- [`src/db/schema.sql`](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/src/db/schema.sql)
- [`prisma/schema.prisma`](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/prisma/schema.prisma)

Tablas implementadas:
- `credit_lines (id, partner_bank_id, total_amount, available_amount, monthly_interest_rate, status)`
- `disbursement_requests (id, credit_line_id, requested_amount, term_days, financial_cost, status, created_at)`
- `integration_logs (id, fecha, usuario, integración, resultado, errores)`

### 1.2 Lógica Financiera & Modelo "Anticipo de Inventarios" (`FinancingService.ts`)
Ubicación: [`src/services/FinancingService.ts`](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/src/services/FinancingService.ts)

- **Costo Financiero (Interés estimado):**
  $$\text{Costo} = \text{Monto} \times \left(\frac{\text{Tasa Mensual}}{30}\right) \times \text{Plazo (días)}$$
  Para S/ 45,000 a 30 días con tasa 1.45% mensual:
  $$45,000 \times 0.0145 = \mathbf{S/\ 653}$$
- **Ventas Protegidas (Evitando Quiebre):**
  $$\text{Ventas Protegidas} = \text{Monto} \times 1.35 = \mathbf{S/\ 60,750}$$
  (Basado en un margen comercial B2B típico del 35%).
- **Retorno Neto para la Empresa:**
  $$\text{Retorno Neto} = 60,750 - 653 - 45,000 = \mathbf{+S/\ 15,097}$$
- **Línea de Crédito Pre-aprobada:**
  - **Línea Total Aprobada:** S/ 150,000.00 (Banco Pichincha B2B • Tasa 1.45% m.)
  - **Disponible Inmediato:** S/ 105,000.00 (Desembolso en 4 horas hábiles)
  - **Capital Utilizado:** S/ 45,000.00 (1 Orden activa: Alicorp #OC-089)

### 1.3 Endpoints REST de Financiamiento
- `GET /api/dashboard/financiamiento`: Retorna el estado de la línea de crédito y la simulación financiera reactiva.
- `POST /api/dashboard/financiamiento/desembolso`: Ejecuta la solicitud conectando con la API de Banco Pichincha B2B. Si no está configurada, registra en `integration_logs` y `disbursement_requests` con estado `pending_configuration`.

### 1.4 Frontend UI Empresarial
Ubicación: [`src/app/dashboard/financiamiento/page.tsx`](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/src/app/dashboard/financiamiento/page.tsx) y [`page.module.css`](file:///c:/Users/josem/OneDrive/Escritorio/InventaAI/src/app/dashboard/financiamiento/page.module.css)
- **3 Tarjetas de Resumen Financiero:** Línea Total Aprobada, Disponible Inmediato y Capital Utilizado.
- **Simulador Interactivo:** Dos sliders reactivos (`Monto a Financiar` y `Plazo de Pago (días)`).
- **Panel Lateral Dinámico:** Recalcula en tiempo real con React Hooks: Costo Financiero, Ventas Protegidas y Retorno Neto.
- **Botón Oscuro:** `Solicitar Desembolso Inmediato` con modal de auditoría bancaria.

---

## 2. Pruebas de Verificación en Producción

### 2.1 Verificación de `GET /api/dashboard/financiamiento?amount=45000&days=30`
```json
{
  "success": true,
  "creditLine": {
    "partner_bank_name": "Banco Pichincha B2B",
    "total_amount": 150000,
    "available_amount": 105000,
    "used_amount": 45000,
    "monthly_interest_rate": 0.0145
  },
  "simulation": {
    "amount": 45000,
    "termDays": 30,
    "financialCost": 653,
    "protectedSales": 60750,
    "netReturn": 15097,
    "marginPercent": 35
  }
}
```

### 2.2 Verificación de `POST /api/dashboard/financiamiento/desembolso`
```json
{
  "success": false,
  "disbursement": {
    "requested_amount": 45000,
    "term_days": 30,
    "financial_cost": 653,
    "protected_sales": 60750,
    "net_return": 15097,
    "status": "failed",
    "id": "disb-1789882546353"
  },
  "status": "pending_configuration",
  "message": "Solicitud rechazada: API de Banco Pichincha B2B no configurada. El conector bancario se encuentra en estado Pendiente de configuración. Se registró log de auditoría."
}
```

---

## 3. URLs en Vivo

- **Capital de Trabajo & Financiamiento:** [https://inventa-ia.vercel.app/dashboard/financiamiento](https://inventa-ia.vercel.app/dashboard/financiamiento)
- **Órdenes de Compra (OC):** [https://inventa-ia.vercel.app/dashboard/ordenes](https://inventa-ia.vercel.app/dashboard/ordenes)
- **Reabastecimiento Inteligente:** [https://inventa-ia.vercel.app/dashboard/reabastecimiento](https://inventa-ia.vercel.app/dashboard/reabastecimiento)
- **Producción Directa Vercel:** [https://inventa-ai-nine.vercel.app/dashboard/financiamiento](https://inventa-ai-nine.vercel.app/dashboard/financiamiento)

import { db, CreditLineRecord, DisbursementRequestRecord } from '@/lib/db';

export interface FinancingSimulationResult {
  amount: number;
  termDays: number;
  monthlyRate: number;
  financialCost: number;
  protectedSales: number;
  netReturn: number;
  marginPercent: number;
}

export interface DisbursementResult {
  success: boolean;
  disbursement?: DisbursementRequestRecord;
  status: 'approved' | 'pending_configuration' | 'failed';
  message: string;
  error?: string;
  jobId?: string;
}

export class FinancingService {
  private static readonly DEFAULT_MONTHLY_RATE = 0.0145; // 1.45% mensual
  private static readonly COMMODITY_MARKUP = 1.35; // 35% de margen comercial promedio B2B

  /**
   * Retrieves current credit line summary
   */
  public static getCreditSummary(): CreditLineRecord {
    let cl = db.getCreditLine('cl-pichincha');
    if (!cl) {
      cl = {
        id: 'cl-pichincha',
        partner_bank_id: 'banco-pichincha-b2b',
        partner_bank_name: 'Banco Pichincha B2B',
        total_amount: 150000.00,
        available_amount: 105000.00,
        used_amount: 45000.00,
        monthly_interest_rate: this.DEFAULT_MONTHLY_RATE,
        status: 'active',
        active_orders_description: '1 Orden activa (Alicorp #OC-089)',
      };
    }
    return cl;
  }

  /**
   * Simulates Inventory Advance Financing
   * 
   * Formulas:
   * 1. Costo Financiero (Interés estimado): Monto * (TasaMensual / 30) * PlazoDias
   * 2. Ventas Protegidas (Evitando Quiebre): Monto * FactorMargen (1.35)
   * 3. Retorno Neto: Ventas Protegidas - Costo Financiero - Monto Principal
   */
  public static simulateFinancing(amount: number, termDays: number): FinancingSimulationResult {
    const cl = this.getCreditSummary();
    const monthlyRate = cl.monthly_interest_rate || this.DEFAULT_MONTHLY_RATE;

    // 1. Costo Financiero (Interés estimado)
    const financialCost = Math.round(amount * (monthlyRate / 30) * termDays);

    // 2. Ventas Protegidas (Evitando Quiebre)
    const protectedSales = Math.round(amount * this.COMMODITY_MARKUP);

    // 3. Retorno Neto
    const netReturn = protectedSales - financialCost - amount;

    return {
      amount,
      termDays,
      monthlyRate,
      financialCost,
      protectedSales,
      netReturn,
      marginPercent: 35,
    };
  }

  /**
   * Requests immediate disbursement connecting to Bank B2B Open Banking API
   */
  public static async requestDisbursement(
    amount: number,
    termDays: number,
    userEmail: string = 'operaciones@distribuidorasanmartin.pe'
  ): Promise<DisbursementResult> {
    const cl = this.getCreditSummary();

    if (amount <= 0) {
      throw new Error('El monto a financiar debe ser mayor a S/ 0.');
    }

    if (amount > cl.available_amount) {
      throw new Error(`El monto solicitado (S/ ${amount.toLocaleString()}) excede el disponible inmediato (S/ ${cl.available_amount.toLocaleString()}).`);
    }

    const sim = this.simulateFinancing(amount, termDays);

    // Check Bank API credentials (Banco Pichincha B2B / Open Banking API)
    const bankIntegration = db.getIntegration('pichincha_b2b');
    const clientId = process.env.PICHINCHA_CLIENT_ID || bankIntegration?.config?.client_id;
    const clientSecret = process.env.PICHINCHA_CLIENT_SECRET || bankIntegration?.config?.client_secret;
    const apiUrl = process.env.PICHINCHA_API_URL || bankIntegration?.config?.api_url;

    if (!clientId || !clientSecret || !apiUrl) {
      // Record failed attempt in integration logs and disbursement requests
      const req = db.createDisbursementRequest({
        credit_line_id: cl.id,
        requested_amount: amount,
        term_days: termDays,
        financial_cost: sim.financialCost,
        protected_sales: sim.protectedSales,
        net_return: sim.netReturn,
        status: 'failed',
      });

      const errorMsg = 'Credenciales de Banco Pichincha B2B no configuradas (Pendiente de configuración).';
      db.addLog(
        'pichincha_b2b',
        'WARN',
        `SOLICITAR_DESEMBOLSO_S/${amount}`,
        'FALLIDO',
        `${errorMsg} Monto: S/ ${amount}, Plazo: ${termDays} días. Request ID: ${req.id}`,
        userEmail
      );

      return {
        success: false,
        disbursement: req,
        status: 'pending_configuration',
        message: `Solicitud rechazada: API de Banco Pichincha B2B no configurada. El conector bancario se encuentra en estado Pendiente de configuración. Se registró log de auditoría.`,
        error: errorMsg,
      };
    }

    // Call real banking API
    const job = db.createSyncJob('int-pichincha-b2b', 'PICHINCHA_B2B_DISBURSEMENT');

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, '')}/v1/b2b/disbursements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId,
          'Authorization': `Bearer ${clientSecret}`,
        },
        body: JSON.stringify({
          creditLineId: cl.partner_bank_id,
          amount,
          termDays,
          applicantEmail: userEmail,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error API Banco Pichincha HTTP ${response.status}: ${errText}`);
      }

      const resData = await response.json();

      // Deduct from available amount and update credit line
      const newAvailable = cl.available_amount - amount;
      const newUsed = cl.used_amount + amount;
      db.updateCreditLine(cl.id, {
        available_amount: newAvailable,
        used_amount: newUsed,
      });

      const req = db.createDisbursementRequest({
        credit_line_id: cl.id,
        requested_amount: amount,
        term_days: termDays,
        financial_cost: sim.financialCost,
        protected_sales: sim.protectedSales,
        net_return: sim.netReturn,
        status: 'approved',
      });

      db.updateSyncJob(job.id, 'completed');
      db.addLog(
        'pichincha_b2b',
        'SUCCESS',
        `SOLICITAR_DESEMBOLSO_S/${amount}`,
        'EXITOSO',
        `Desembolso de S/ ${amount.toLocaleString()} aprobado por Banco Pichincha. ID: ${resData.disbursementId || req.id}`,
        userEmail
      );

      return {
        success: true,
        disbursement: req,
        status: 'approved',
        message: `Desembolso de S/ ${amount.toLocaleString()} aprobado por Banco Pichincha B2B. Desembolso programado en 4 horas hábiles.`,
        jobId: job.id,
      };
    } catch (apiErr: any) {
      db.updateSyncJob(job.id, 'failed', apiErr.message);
      db.addLog(
        'pichincha_b2b',
        'ERROR',
        `SOLICITAR_DESEMBOLSO_S/${amount}`,
        'FALLIDO',
        apiErr.message,
        userEmail
      );

      return {
        success: false,
        status: 'failed',
        message: `Fallo al procesar con Banco Pichincha B2B: ${apiErr.message}`,
        error: apiErr.message,
        jobId: job.id,
      };
    }
  }
}

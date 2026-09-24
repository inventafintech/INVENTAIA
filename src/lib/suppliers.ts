export interface SupplierDTO {
  id: string;
  ref: string;
  name: string;
  branch: string;
  address: string;
  city: string;
  status: string;
  country: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  type: 'corporate' | 'traditional';
}

/** Normaliza una fila de suppliers a DTO (contact_info JSONB, sin DDL). */
export function toDTO(s: any): SupplierDTO {
  const ci = (s.contact_info as Record<string, any>) || {};
  return {
    id: s.id,
    ref: ci.ref || s.id.toUpperCase(),
    name: s.name,
    branch: ci.branch || '',
    address: ci.address || '',
    city: ci.city || '',
    status: ci.status || 'Confiable',
    country: ci.country || '',
    email: ci.email || '',
    phone: ci.phone || '',
    leadTimeDays: Number(s.lead_time_days) || 0,
    type: s.integration_type === 'corporate' ? 'corporate' : 'traditional',
  };
}

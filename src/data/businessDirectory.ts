/**
 * Directorio comercial: fuente única de datos para Clientes, Proveedores,
 * Ubicaciones y Sucursales. Estas entidades aún no tienen tablas en Supabase,
 * por lo que las páginas de ENTIDADES y el buscador global (/api/search)
 * consumen estos mismos arreglos (cero duplicación, cero drift).
 *
 * Cuando existan tablas (clients, branches, locations), este módulo debe
 * reemplazarse por consultas a Supabase manteniendo la misma forma.
 */

export interface ClientEntry {
  id: string;
  name: string;
  ruc: string;
  canal: string;
  activeOrders: number;
  creditLine: string;
  paymentTerms: string;
  status: string;
}

export interface SupplierEntry {
  id: string;
  name: string;
  ruc: string;
  leadTime: number;
  reliability: number;
  activeOrders: number;
  contact: string;
  status: string;
}

export interface LocationEntry {
  id: string;
  name: string;
  code: string;
  zone: string;
  capacity: string;
  occupation: string;
  status: string;
  skus: number;
  // Campos del directorio canónico (módulo Ubicaciones)
  ref: string;
  statusKey: 'disponible' | 'entrante' | 'cuarentena' | 'desecho';
  storageType: string;
  branch: string;
  description: string;
  area: string;
}

export interface BranchEntry {
  id: string;
  name: string;
  company: string;
  ruc: string;
  sunatCode: string;
  address: string;
  status: string;
}

export const CLIENTS: ClientEntry[] = [
  { id: 'CLI-01', name: 'Supermercados Peruanos S.A.', ruc: '20100070970', canal: 'Moderna / Retail', activeOrders: 14, creditLine: 'S/ 250,000', paymentTerms: 'Factura 30d', status: 'Activo' },
  { id: 'CLI-02', name: 'Cencosud Retail Perú S.A.', ruc: '20109072177', canal: 'Moderna / Retail', activeOrders: 9, creditLine: 'S/ 180,000', paymentTerms: 'Factura 45d', status: 'Activo' },
  { id: 'CLI-03', name: 'Tiendas Mass / InRetail', ruc: '20512808034', canal: 'Hard Discount', activeOrders: 22, creditLine: 'S/ 120,000', paymentTerms: 'Factura 15d', status: 'Activo' },
  { id: 'CLI-04', name: 'Distribuidora Mayorista El Sol', ruc: '20498112340', canal: 'Tradicional', activeOrders: 5, creditLine: 'S/ 60,000', paymentTerms: 'Contado', status: 'Activo' },
  { id: 'CLI-05', name: 'Minimarkets Pronto Express', ruc: '20601248991', canal: 'Conveniencia', activeOrders: 3, creditLine: 'S/ 35,000', paymentTerms: 'Factura 7d', status: 'Al día' },
];

export const SUPPLIERS_DIRECTORY: SupplierEntry[] = [
  { id: 'SUP-01', name: 'Alicorp S.A.A.', ruc: '20100055237', leadTime: 3, reliability: 98.4, activeOrders: 3, contact: 'ventas.corp@alicorp.com.pe', status: 'Confiable' },
  { id: 'SUP-02', name: 'Costeño Alimentos S.A.C.', ruc: '20256845112', leadTime: 4, reliability: 96.2, activeOrders: 2, contact: 'pedidos@costeno.com.pe', status: 'Confiable' },
  { id: 'SUP-03', name: 'Cartavio S.A.A.', ruc: '20131822831', leadTime: 5, reliability: 94.0, activeOrders: 1, contact: 'comercial@cartavio.com.pe', status: 'Confiable' },
  { id: 'SUP-04', name: 'Leche Gloria S.A.', ruc: '20100190797', leadTime: 2, reliability: 99.1, activeOrders: 4, contact: 'logistica@gloria.com.pe', status: 'Excelente' },
  { id: 'SUP-05', name: 'Kimberly-Clark Perú S.R.L.', ruc: '20297071221', leadTime: 6, reliability: 89.5, activeOrders: 1, contact: 'atencion@kcc.com', status: 'En Observación' },
];

export const LOCATIONS: LocationEntry[] = [
  { id: 'LOC-04', name: 'Almacén principal', code: 'LOC-00004', zone: 'Sucursal Principal', capacity: '—', occupation: '—', status: 'Disponible', skus: 0, ref: 'LOC-00004', statusKey: 'disponible', storageType: 'General', branch: 'Sucursal Principal', description: 'Ubicación predeterminada del almacén', area: 'Nave A' },
  { id: 'LOC-03', name: 'Muelle de recepción', code: 'LOC-00003', zone: 'Sucursal Principal', capacity: '—', occupation: '—', status: 'Entrante', skus: 0, ref: 'LOC-00003', statusKey: 'entrante', storageType: 'Recepción', branch: 'Sucursal Principal', description: 'Ubicación generada por el sistema', area: 'Muelle 1' },
  { id: 'LOC-02', name: 'Cuarentena de devoluciones', code: 'LOC-00002', zone: 'Sucursal Principal', capacity: '—', occupation: '—', status: 'Cuarentena', skus: 0, ref: 'LOC-00002', statusKey: 'cuarentena', storageType: 'Cuarentena', branch: 'Sucursal Principal', description: 'Ubicación de cuarentena general', area: 'Zona C' },
  { id: 'LOC-01', name: 'Desecho / eliminación', code: 'LOC-00001', zone: 'Sucursal Principal', capacity: '—', occupation: '—', status: 'Desecho', skus: 0, ref: 'LOC-00001', statusKey: 'desecho', storageType: 'Desecho', branch: 'Sucursal Principal', description: 'Ubicación generada por el sistema', area: 'Zona D' },
];

export const BRANCHES: BranchEntry[] = [
  {
    id: 'SUC-01',
    name: 'Sede Lima Central',
    company: 'INVENTA LOGISTICS PERU S.A.C.',
    ruc: '20609876543',
    sunatCode: '0001 (Principal)',
    address: 'Av. Elmer Faucett 2850, Callao, Lima',
    status: 'Activa 24/7',
  },
];

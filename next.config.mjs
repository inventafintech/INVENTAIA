/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: 'web',
  async rewrites() {
    return [
      { source: '/panel/resumen', destination: '/dashboard' },
      { source: '/panel/:path*', destination: '/dashboard' },
      { source: '/entidades/productos', destination: '/inventario' },
      { source: '/entidades/sucursal', destination: '/ajustes' },
      { source: '/entidades/ubicaciones', destination: '/inventario' },
      { source: '/entidades/:path*', destination: '/dashboard' },
      { source: '/inventario/actual', destination: '/inventario' },
      { source: '/inventario/ajustes', destination: '/inventario' },
      { source: '/inventario/recibos', destination: '/ordenes' },
      { source: '/inventario/despachos', destination: '/ordenes' },
      { source: '/inventario/importaciones', destination: '/ordenes' },
      { source: '/complementos/disponibles', destination: '/integraciones' },
      { source: '/complementos/planes', destination: '/financiamiento' },
      { source: '/configuracion/general', destination: '/ajustes' },
      { source: '/configuracion/categorias', destination: '/inventario' },
      { source: '/configuracion/alertas', destination: '/ajustes' },
      { source: '/ayuda/:path*', destination: '/soporte' },
    ];
  },
};

export default nextConfig;

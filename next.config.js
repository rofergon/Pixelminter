/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Aquí puedes añadir otras configuraciones específicas de tu proyecto
    images: {
      domains: ['basepaint.xyz', 'pixelminter.xyz', 'localhost'], // Añade 'localhost' o el dominio de tu aplicación
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    async headers() {
      return [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          ],
        },
      ];
    },
    async rewrites() {
      return [
        {
          source: '/api/proxy-image',
          destination: '/api/proxy-image',
        },
      ];
    },
    // Añade esta línea
    publicRuntimeConfig: {
      staticFolder: '/public',
    },
  }
  
  module.exports = nextConfig
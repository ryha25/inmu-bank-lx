/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'kysely',
    '@better-auth/kysely-adapter',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    unoptimized: true,
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'better-auth',
    '@better-auth/core',
    '@better-auth/drizzle-adapter',
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

import { resolve } from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.14"],
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@pikorua/shared'],
  turbopack: {
    // Point to the monorepo root so Turbopack can resolve hoisted packages
    // (pnpm shamefully-hoist places next/ at root node_modules, not apps/web)
    root: resolve(import.meta.dirname, '../..'),
  },
}

export default nextConfig

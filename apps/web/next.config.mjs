const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["192.168.1.14"],
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@pikorua/shared'],
}
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'maps.googleapis.com' }],
  },
}

module.exports = nextConfig

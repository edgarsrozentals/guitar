/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true,
  },
  ...(isDev
    ? {
        async rewrites() {
          const backend = process.env.BACKEND_URL || 'http://localhost:4568'
          return [
            { source: '/api/:path*', destination: `${backend}/api/:path*` },
            { source: '/audio/:path*', destination: `${backend}/audio/:path*` },
            { source: '/stems/:path*', destination: `${backend}/stems/:path*` },
            {
              source: '/lyrics/:path*',
              destination: `${backend}/lyrics/:path*`,
            },
          ]
        },
      }
    : { output: 'export' }),
  transpilePackages: ['@lib/ui'],
}

// eslint-disable-next-line no-undef
module.exports = nextConfig

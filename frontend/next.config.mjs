/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add rewrites to proxy API requests to the backend during development
  async rewrites() {
    return [
      {
        source: '/api/:path*', // Match any path starting with /api/
        destination: 'http://localhost:5001/api/:path*', // Proxy to backend on port 5001
      },
    ];
  },
};

export default nextConfig;

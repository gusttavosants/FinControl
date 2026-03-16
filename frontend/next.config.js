/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Development: use localhost, Production: use Render
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://fincontrol-mgrk.onrender.com"
        : "http://localhost:8000");
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

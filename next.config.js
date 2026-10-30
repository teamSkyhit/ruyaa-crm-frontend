const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  images: {
    unoptimized: true,
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules"],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    const isDevelopment = process.env.NODE_ENV === "development";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

    // Allow the backend API origin plus Razorpay and R2
    const connectSrc = [
      "'self'",
      apiUrl,
      "https://*.razorpay.com",
      "https://api.razorpay.com",
      "https://*.r2.cloudflarestorage.com",
      "https://*.r2.dev",
      ...(isDevelopment ? ["ws://localhost:*", "http://localhost:*"] : []),
    ].join(" ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              `default-src 'self' 'unsafe-inline' data: blob:`,
              `connect-src ${connectSrc}`,
              `img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.r2.dev https://*.cloudflare.com https:`,
              `frame-src https://*.razorpay.com`,
              isDevelopment
                ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com`
                : `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com`,
            ].join("; "),
          },
          ...(isDevelopment || process.env.CORS_ORIGINS
            ? [
                {
                  key: "Access-Control-Allow-Origin",
                  value: process.env.CORS_ORIGINS || "*",
                },
                {
                  key: "Access-Control-Allow-Methods",
                  value: "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                },
                {
                  key: "Access-Control-Allow-Headers",
                  value: "Content-Type, Authorization",
                },
                { key: "Access-Control-Allow-Credentials", value: "true" },
              ]
            : []),
        ],
      },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.API_BASE_URL || "http://localhost:8001";
    const rules = [
      {
        source: "/proxy/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
    if (process.env.NEXT_PUBLIC_USE_API_PROXY === "true") {
      rules.push({
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      });
    }
    return rules;
  },
};

module.exports = nextConfig;

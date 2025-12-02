const nextConfig = {
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.hbs$/,
      use: [
        {
          loader: "handlebars-loader",
          options: {
            strict: true,
            noEscape: true,
            helperDirs: [resolve(helperDirName)],
          },
        },
      ],
    });

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "golob-travel-agency.vercel.app",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "www.airplane-pictures.net",
      },
      {
        protocol: "https",
        hostname: "image-cdn.didatravel.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, ""),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Pathname",
            value: "/:path*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
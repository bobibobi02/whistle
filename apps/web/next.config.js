/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  distDir: '.next',

  // Keep your snapshot tweak
  webpack(config) {
    config.snapshot = { ...config.snapshot, managedPaths: [] };
    return config;
  },

  // Optional but harmless even if you don't use next/image.
  // If you ever switch to <Image>, this lets remote images load.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // domains: ['res.cloudinary.com', 'i.imgur.com', 'your-bucket.supabase.co'],
  },

  async redirects() {
    return [
      // Old/alternate routes → canonical create page your navbar uses
      { source: '/create-subforum', destination: '/new-post', permanent: true },
      { source: '/create-subreddit', destination: '/new-post', permanent: true },
      { source: '/create-post', destination: '/new-post', permanent: true },
    ];
  },
};

module.exports = nextConfig;

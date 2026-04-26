const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Single-question practice was removed in favor of the mock-exam flow.
      // Old paths now permanently redirect to the mock hall so existing
      // bookmarks, search results, and inbound links keep working.
      { source: "/practice", destination: "/mock", permanent: true },
      { source: "/practice/:path*", destination: "/mock", permanent: true },
    ];
  },
};

export default nextConfig;

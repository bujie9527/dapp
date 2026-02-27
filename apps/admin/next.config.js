/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker 内用 next start 启动，不用 standalone，避免 static 404
};

module.exports = nextConfig;

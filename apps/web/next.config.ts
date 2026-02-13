import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nadfun/shared', '@nadfun/db'],
};

export default nextConfig;

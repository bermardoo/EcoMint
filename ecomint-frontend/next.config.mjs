/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {}, 
  
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      asyncWebAssembly: true,
    };
    
    config.optimization.moduleIds = 'named';
    
    return config;
  },
};

export default nextConfig;
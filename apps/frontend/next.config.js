//@ts-check

const nextConfig = {
  output: 'standalone',
  experimental: {
    externalDir: true
  },
  transpilePackages: [
    '@auth-client',
    '@database',
    '@event-bus',
    '@namviek/core',
    '@task-runner',
    '@ui-components'
  ],
  /** @param {any} config */
  webpack: config => {
    config.resolve.alias.canvas = false
    return config
  }
}

module.exports = nextConfig

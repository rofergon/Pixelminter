module.exports = {
  plugins: {
    'postcss-import': {
      // Keep remote font imports intact to avoid fetches at build time.
      filter: (url) => !url.startsWith('http')
    },
    tailwindcss: {},
    autoprefixer: {}
  }
}

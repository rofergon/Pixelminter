const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
  // Añade las fallbacks para los polyfills
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify"),
    "url": require.resolve("url"),
    "buffer": require.resolve("buffer/") // Añadido para Buffer
  };

  // Añade el plugin para proporcionar process/browser y Buffer
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'], // Añadido para Buffer
    }),
  );

  // Configura el alias '@' para resolver la carpeta 'src'
  config.resolve.alias['@'] = path.resolve(__dirname, 'src');

  // Añade la configuración para `worker-loader`
  config.module.rules.push({
    test: /\.worker\.js$/,
    use: {
      loader: 'worker-loader',
      options: {
        filename: '[name].worker.js',
      },
    },
  });

  return config;
};
// Configuración de PostCSS que sobrescribe la configuración por defecto de react-scripts
// Esto deshabilita postcss-normalize que requiere @csstools/normalize.css
module.exports = {
  plugins: [
    // No incluimos postcss-normalize aquí para evitar el error
    require('postcss-flexbugs-fixes'),
    require('postcss-preset-env')({
      autoprefixer: {
        flexbox: 'no-2009',
      },
      stage: 3,
    }),
  ],
};

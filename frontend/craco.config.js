// Configuración CRACO para sobrescribir la configuración de react-scripts
// Esto nos permite deshabilitar postcss-normalize que causa problemas

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Buscar todas las reglas que usan postcss-loader
      const processRules = (rules) => {
        rules.forEach(rule => {
          if (rule.oneOf) {
            processRules(rule.oneOf);
          } else if (rule.use && Array.isArray(rule.use)) {
            rule.use.forEach((use, index) => {
              if (use.loader && typeof use.loader === 'string' && use.loader.includes('postcss-loader')) {
                // En react-scripts, los plugins están directamente en use.options.plugins
                if (use.options && use.options.plugins && Array.isArray(use.options.plugins)) {
                  // Filtrar postcss-normalize
                  use.options.plugins = use.options.plugins.filter(
                    plugin => {
                      // Si es un string
                      if (typeof plugin === 'string') {
                        return plugin !== 'postcss-normalize';
                      }
                      // Si es un array [nombre, opciones]
                      if (Array.isArray(plugin) && plugin[0] === 'postcss-normalize') {
                        return false;
                      }
                      return true;
                    }
                  );
                }
              }
            });
          }
        });
      };

      if (webpackConfig.module && webpackConfig.module.rules) {
        processRules(webpackConfig.module.rules);
      }

      return webpackConfig;
    },
  },
};

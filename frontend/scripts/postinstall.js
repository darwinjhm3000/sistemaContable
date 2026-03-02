// Script para copiar @csstools/normalize.css a las ubicaciones donde postcss-normalize lo busca
// Esto resuelve el problema de postcss-normalize que no encuentra el módulo

const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'node_modules', '@csstools', 'normalize.css');

// Ubicación 1: react-scripts/node_modules/@csstools/normalize.css
const targetDir1 = path.join(__dirname, '..', 'node_modules', 'react-scripts', 'node_modules', '@csstools');
const targetPath1 = path.join(targetDir1, 'normalize.css');

// Ubicación 2: postcss-normalize/node_modules/@csstools/normalize.css (más importante)
const targetDir2 = path.join(__dirname, '..', 'node_modules', 'postcss-normalize', 'node_modules', '@csstools');
const targetPath2 = path.join(targetDir2, 'normalize.css');

function copyPackage(source, targetDir, targetPath) {
  if (fs.existsSync(source)) {
    // Crear el directorio si no existe
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copiar el directorio completo
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    fs.cpSync(source, targetPath, { recursive: true });
    return true;
  }
  return false;
}

if (fs.existsSync(sourcePath)) {
  let copied = 0;

  if (copyPackage(sourcePath, targetDir1, targetPath1)) {
    console.log('✅ @csstools/normalize.css copiado a react-scripts/node_modules');
    copied++;
  }

  if (copyPackage(sourcePath, targetDir2, targetPath2)) {
    console.log('✅ @csstools/normalize.css copiado a postcss-normalize/node_modules');
    copied++;
  }

  if (copied === 0) {
    console.warn('⚠️  No se pudo copiar @csstools/normalize.css');
  }
} else {
  console.warn('⚠️  @csstools/normalize.css no encontrado en node_modules');
}

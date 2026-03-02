const sql = require('mssql');

// Leer configuración del archivo de configuración del backend
const fs = require('fs');
const path = require('path');

let config;
try {
  const configPath = path.join(__dirname, 'src', 'config.ts');
  // Si es TypeScript, intentar leer el .js compilado
  const configJsPath = path.join(__dirname, 'dist', 'config.js');
  if (fs.existsSync(configJsPath)) {
    delete require.cache[require.resolve(configJsPath)];
    const configModule = require(configJsPath);
    config = configModule.default || configModule.config || configModule;
  } else {
    // Configuración por defecto
    config = {
      user: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'TuPassword123!',
      server: process.env.DB_SERVER || 'localhost',
      database: process.env.DB_NAME || 'MiBaseDeContabilidad',
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
  }
} catch (error) {
  // Configuración por defecto si no se puede leer
  config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'TuPassword123!',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'MiBaseDeContabilidad',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };
}

async function verificarEstructura() {
  try {
    const pool = await sql.connect(config);

    console.log('🔍 Verificando estructura de la tabla Facturas...\n');

    // Obtener todas las columnas de la tabla Facturas
    const result = await pool.request().query(`
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Facturas'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('📋 Columnas en la tabla Facturas:');
    console.log('='.repeat(80));
    result.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE}${length} ${nullable}${defaultValue}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`Total de columnas: ${result.recordset.length}\n`);

    // Verificar campos DIAN específicos
    const camposDIAN = ['CUFE', 'QRCode', 'AmbienteDIAN', 'TipoDocumentoElectronico', 'EstadoValidacionDIAN'];
    console.log('🔍 Verificación de campos DIAN:');
    camposDIAN.forEach(campo => {
      const existe = result.recordset.some(col => col.COLUMN_NAME === campo);
      console.log(`  ${campo.padEnd(30)} ${existe ? '✅ Existe' : '❌ NO EXISTE'}`);
    });

    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarEstructura();


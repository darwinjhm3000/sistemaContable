const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  server: process.env.DB_SERVER || 'DESKTOP-PTP75MU',
  database: process.env.DB_DATABASE || 'MiBaseDeContabilidad',
  user: process.env.DB_USER || 'sistema_contable',
  password: process.env.DB_PASSWORD || 'SistemaContable2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function ejecutarScript() {
  let pool;
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔧 Ejecutando script de creación de tabla Empresa');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a la base de datos');
    console.log(`   Servidor: ${dbConfig.server}`);
    console.log(`   Base de datos: ${dbConfig.database}`);
    console.log('');

    const scriptPath = path.join(__dirname, '..', 'database', 'crear-tabla-empresa.sql');
    const script = fs.readFileSync(scriptPath, 'utf8');

    // Dividir el script en lotes por GO
    const lotes = script.split(/\bGO\b/gi).filter(lote => lote.trim());

    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i].trim();
      if (lote) {
        try {
          await pool.request().query(lote);
          console.log(`✅ Lote ${i + 1}/${lotes.length} ejecutado`);
        } catch (error) {
          // Algunos errores son esperados (tabla ya existe, etc.)
          if (error.message.includes('ya existe') || error.message.includes('already exists')) {
            console.log(`⚠️  Lote ${i + 1}: ${error.message.split('\n')[0]}`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Script ejecutado correctamente');
    console.log('═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('');
    console.error('❌ Error al ejecutar el script:');
    console.error(`   ${error.message}`);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

ejecutarScript();


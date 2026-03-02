// Script para ejecutar el SQL de creación de tabla Vendedores
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: process.env.DB_SERVER || 'DESKTOP-PTP75MU',
  database: process.env.DB_DATABASE || 'MiBaseDeContabilidad',
  user: process.env.DB_USER || 'sistema_contable',
  password: process.env.DB_PASSWORD || 'SistemaContable2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function ejecutarScript() {
  let pool;
  try {
    console.log('🔌 Conectando a la base de datos...');
    pool = await sql.connect(config);
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'crear-tabla-vendedores.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir por GO y ejecutar cada parte
    // Usar una expresión regular más robusta para dividir por GO
    const partes = sqlContent.split(/\r?\n\s*GO\s*\r?\n/gi);

    for (let i = 0; i < partes.length; i++) {
      let parte = partes[i].trim();

      // Limpiar comentarios al inicio y líneas vacías
      parte = parte.replace(/^[\s\n\r]*--.*$/gm, '').trim();

      if (parte && parte.length > 0 && !parte.match(/^[\s\n\r]*$/)) {
        try {
          await pool.request().query(parte);
          console.log(`✅ Parte ${i + 1}/${partes.length} ejecutada`);
        } catch (error) {
          // Ignorar errores de "ya existe" o similares
          const errorMsg = error.message || error.toString();
          if (errorMsg.includes('ya existe') ||
              errorMsg.includes('already exists') ||
              errorMsg.includes('already has') ||
              errorMsg.includes('There is already')) {
            console.log(`⚠️  Parte ${i + 1}: ${errorMsg.split('\n')[0]}`);
          } else {
            console.error(`❌ Error en parte ${i + 1}:`, errorMsg);
            throw error;
          }
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Script de Vendedores ejecutado exitosamente');
    console.log('═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('❌ Error al ejecutar el script:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

ejecutarScript();


const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const dbConfig = {
  server: 'localhost',
  database: 'MiBaseDeContabilidad',
  user: 'sistema_contable',
  password: 'SistemaContable2024!',
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
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, '..', 'database', 'actualizar-restriccion-tipo-terceros.sql');
    console.log(`📄 Leyendo archivo: ${sqlFilePath}`);

    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir el script por comandos GO
    const partes = sqlScript.split(/^\s*GO\s*$/gim).filter(parte => parte.trim().length > 0);

    console.log(`📝 Ejecutando ${partes.length} partes del script...\n`);

    for (let i = 0; i < partes.length; i++) {
      const parte = partes[i].trim();

      // Ignorar comentarios y líneas vacías
      if (!parte || parte.startsWith('--') || parte.length === 0) {
        continue;
      }

      try {
        console.log(`⏳ Ejecutando parte ${i + 1}/${partes.length}...`);
        await pool.request().query(parte);
        console.log(`✅ Parte ${i + 1} ejecutada exitosamente\n`);
      } catch (error) {
        console.error(`❌ Error en parte ${i + 1}:`, error.message);
        // Continuar con las siguientes partes
      }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Script ejecutado exitosamente');
    console.log('═══════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

ejecutarScript();


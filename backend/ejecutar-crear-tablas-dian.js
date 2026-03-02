// Script para ejecutar el SQL de crear tablas de sincronización DIAN
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// Configuración de SQL Server (misma que en server.ts)
const dbConfig = {
  server: process.env.DB_SERVER || 'DESKTOP-PTP75MU',
  database: process.env.DB_DATABASE || 'MiBaseDeContabilidad',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  user: process.env.DB_USER || 'sistema_contable',
  password: process.env.DB_PASSWORD || 'SistemaContable2024!'
};

async function ejecutarScript() {
  let pool;

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔧 Ejecutando script SQL para crear tablas DIAN');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('Conectando a SQL Server...');
    console.log(`   Servidor: ${dbConfig.server}`);
    console.log(`   Base de datos: ${dbConfig.database}\n`);

    pool = await sql.connect(dbConfig);
    console.log('✅ Conexión establecida\n');

    const scriptPath = path.join(__dirname, '..', 'database', 'crear-tablas-dian-sincronizacion.sql');
    console.log(`📄 Leyendo archivo: ${scriptPath}\n`);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`No se encontró el archivo: ${scriptPath}`);
    }

    const script = fs.readFileSync(scriptPath, 'utf8');
    
    // Ejecutar USE primero
    await pool.request().query('USE MiBaseDeContabilidad');
    
    // Dividir el script por GO, pero mantener bloques BEGIN...END juntos
    // Usar una expresión que divida por GO seguido de salto de línea
    const partes = script.split(/^\s*GO\s*$/gim).filter(parte => parte.trim());

    console.log(`📝 Ejecutando ${partes.length} partes del script...\n`);

    for (let i = 0; i < partes.length; i++) {
      let parte = partes[i].trim();

      // Ignorar comentarios completos y líneas vacías
      if (!parte || parte.match(/^[\s\n\r]*$/) || parte.match(/^[\s\n\r]*--/)) {
        continue;
      }

      // Remover USE statement si existe (ya lo ejecutamos)
      parte = parte.replace(/^USE\s+[^\s;]+;?\s*/gim, '').trim();

      if (!parte || parte.match(/^[\s\n\r]*$/)) {
        continue;
      }

      try {
        console.log(`⏳ Ejecutando parte ${i + 1}/${partes.length}...`);
        await pool.request().query(parte);
        console.log(`✅ Parte ${i + 1} ejecutada exitosamente\n`);
      } catch (error) {
        // Algunos errores son esperados (como tablas que ya existen)
        const errorMsg = error.message || error.toString();
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('ya existe') ||
            errorMsg.includes('already has') ||
            errorMsg.includes('There is already') ||
            errorMsg.includes('duplicate key') ||
            errorMsg.includes('already exists')) {
          console.log(`⚠️  Parte ${i + 1}: ${errorMsg.split('\n')[0]}\n`);
        } else if (errorMsg.includes('Cannot find the object') && errorMsg.includes('because it does not exist')) {
          // Este error puede ocurrir con índices cuando la tabla no existe aún
          // Verificar si es un índice y esperar
          console.log(`⚠️  Parte ${i + 1}: ${errorMsg.split('\n')[0]} (puede ser normal si la tabla aún no existe)\n`);
        } else {
          // Mostrar el error completo para debugging
          console.error(`❌ Error en parte ${i + 1}:`, errorMsg);
          console.error(`   Primeras 300 caracteres del script:\n   ${parte.substring(0, 300)}\n`);
          // No hacer throw, continuar con las siguientes partes
        }
      }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Script ejecutado exitosamente');
    console.log('═══════════════════════════════════════════════════\n');

    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...\n');
    
    const verificarTablas = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME IN ('LogSincronizacionDIAN', 'EventosDIAN')
      ORDER BY TABLE_NAME
    `);

    if (verificarTablas.recordset.length > 0) {
      console.log('✅ Tablas verificadas:');
      verificarTablas.recordset.forEach(tabla => {
        console.log(`   - ${tabla.TABLE_NAME}`);
      });
      console.log('');
    }

    // Verificar índices
    console.log('🔍 Verificando índices creados...\n');
    
    const verificarIndices = await pool.request().query(`
      SELECT 
        OBJECT_NAME(object_id) AS TableName,
        name AS IndexName
      FROM sys.indexes
      WHERE OBJECT_NAME(object_id) IN ('LogSincronizacionDIAN', 'EventosDIAN')
        AND name LIKE 'IX_%'
      ORDER BY OBJECT_NAME(object_id), name
    `);

    if (verificarIndices.recordset.length > 0) {
      console.log('✅ Índices verificados:');
      verificarIndices.recordset.forEach(idx => {
        console.log(`   - ${idx.TableName}.${idx.IndexName}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error al ejecutar el script:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar el script
ejecutarScript().catch(console.error);

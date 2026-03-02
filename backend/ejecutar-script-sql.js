// Script para ejecutar el SQL de agregar código de barras
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
    console.log('🔧 Ejecutando script SQL para agregar CodigoBarras');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('Conectando a SQL Server...');
    console.log(`   Servidor: ${dbConfig.server}`);
    console.log(`   Base de datos: ${dbConfig.database}\n`);

    pool = await sql.connect(dbConfig);
    console.log('✅ Conexión establecida\n');

    // Verificar si la columna ya existe
    console.log('Verificando si la columna CodigoBarras ya existe...');
    const verificarColumna = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Productos' AND COLUMN_NAME = 'CodigoBarras'
    `);

    if (verificarColumna.recordset.length > 0) {
      console.log('⚠️  La columna CodigoBarras ya existe. No es necesario agregarla.\n');
    } else {
      console.log('La columna no existe. Agregándola...\n');

      // Agregar columna CodigoBarras
      await pool.request().query(`
        ALTER TABLE Productos
        ADD CodigoBarras NVARCHAR(100) NULL
      `);
      console.log('✅ Columna CodigoBarras agregada exitosamente');

      // Crear índice
      await pool.request().query(`
        CREATE INDEX IX_Productos_CodigoBarras
        ON Productos(CodigoBarras)
        WHERE CodigoBarras IS NOT NULL
      `);
      console.log('✅ Índice IX_Productos_CodigoBarras creado');
    }

    // Verificar que la columna fue creada
    console.log('\nVerificando que la columna existe...');
    const verificarResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Productos' AND COLUMN_NAME = 'CodigoBarras'
    `);

    if (verificarResult.recordset.length > 0) {
      const columna = verificarResult.recordset[0];
      console.log('✅ Columna CodigoBarras verificada:');
      console.log(`   Tipo: ${columna.DATA_TYPE}(${columna.CHARACTER_MAXIMUM_LENGTH || 'N/A'})`);
      console.log(`   Nullable: ${columna.IS_NULLABLE}`);
    } else {
      console.log('❌ La columna CodigoBarras no se encontró después de la ejecución');
    }

    // Verificar índice
    console.log('\nVerificando índice...');
    const indiceResult = await pool.request().query(`
      SELECT name, type_desc, is_unique
      FROM sys.indexes
      WHERE object_id = OBJECT_ID('Productos') AND name = 'IX_Productos_CodigoBarras'
    `);

    if (indiceResult.recordset.length > 0) {
      const indice = indiceResult.recordset[0];
      console.log('✅ Índice IX_Productos_CodigoBarras verificado:');
      console.log(`   Tipo: ${indice.type_desc}`);
      console.log(`   Único: ${indice.is_unique ? 'Sí' : 'No'}`);
    } else {
      console.log('⚠️  El índice no se encontró');
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ Script ejecutado exitosamente');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error al ejecutar el script:');
    console.error(`   ${error.message}`);

    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }

    if (error.number) {
      console.error(`   Número de error SQL: ${error.number}`);
    }

    // Si el error es que la columna ya existe, no es crítico
    if (error.message && error.message.includes('already exists')) {
      console.log('\n⚠️  La columna o índice ya existe. Esto es normal si ya se ejecutó el script antes.');
    } else {
      process.exit(1);
    }
  } finally {
    if (pool) {
      await pool.close();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar
ejecutarScript();


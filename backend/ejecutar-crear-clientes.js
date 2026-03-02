// Script para ejecutar el SQL de crear tabla Clientes
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
    console.log('🔧 Ejecutando script SQL para crear tabla Clientes');
    console.log('═══════════════════════════════════════════════════\n');

    console.log('Conectando a SQL Server...');
    console.log(`   Servidor: ${dbConfig.server}`);
    console.log(`   Base de datos: ${dbConfig.database}\n`);

    pool = await sql.connect(dbConfig);
    console.log('✅ Conexión establecida\n');

    console.log('Ejecutando comandos SQL...\n');

    // Ejecutar comandos uno por uno de manera controlada

    // 1. Crear tabla Clientes
    console.log('1. Creando tabla Clientes...');
    try {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Clientes]') AND type in (N'U'))
        BEGIN
          CREATE TABLE Clientes (
            IdCliente INT IDENTITY(1,1) PRIMARY KEY,
            IdTercero INT NOT NULL UNIQUE,
            CodigoCliente NVARCHAR(50) NULL UNIQUE,
            Telefono NVARCHAR(20),
            Celular NVARCHAR(20),
            Email NVARCHAR(100),
            Ciudad NVARCHAR(100),
            Departamento NVARCHAR(100),
            TipoPersona NVARCHAR(1) NOT NULL DEFAULT 'J' CHECK (TipoPersona IN ('N', 'J')),
            RegimenTributario NVARCHAR(50),
            CondicionPago NVARCHAR(20) DEFAULT 'Contado',
            LimiteCredito DECIMAL(18, 2) DEFAULT 0,
            SaldoActual DECIMAL(18, 2) DEFAULT 0,
            Descuento DECIMAL(5, 2) DEFAULT 0,
            Observaciones NVARCHAR(1000),
            Activo BIT NOT NULL DEFAULT 1,
            FechaCreacion DATETIME DEFAULT GETDATE(),
            FechaModificacion DATETIME DEFAULT GETDATE(),
            FOREIGN KEY (IdTercero) REFERENCES Terceros(IdTercero) ON DELETE CASCADE
          );
        END
      `);
      console.log('   ✅ Tabla Clientes creada o ya existe');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('ya existe')) {
        console.log('   ⚠️  La tabla Clientes ya existe');
      } else {
        throw error;
      }
    }

    // 2. Crear índices
    console.log('\n2. Creando índices...');
    const indices = [
      { nombre: 'IX_Clientes_CodigoCliente', sql: `CREATE INDEX IX_Clientes_CodigoCliente ON Clientes(CodigoCliente) WHERE CodigoCliente IS NOT NULL` },
      { nombre: 'IX_Clientes_Email', sql: `CREATE INDEX IX_Clientes_Email ON Clientes(Email) WHERE Email IS NOT NULL` },
      { nombre: 'IX_Clientes_Activo', sql: `CREATE INDEX IX_Clientes_Activo ON Clientes(Activo)` }
    ];

    for (const indice of indices) {
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = '${indice.nombre}' AND object_id = OBJECT_ID('Clientes'))
          BEGIN
            ${indice.sql};
          END
        `);
        console.log(`   ✅ Índice ${indice.nombre} creado o ya existe`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          console.log(`   ⚠️  Índice ${indice.nombre} ya existe`);
        } else {
          console.log(`   ⚠️  Error al crear índice ${indice.nombre}: ${error.message.split('\n')[0]}`);
        }
      }
    }

    // 3. Crear vista
    console.log('\n3. Creando vista VistaClientes...');
    try {
      await pool.request().query(`
        IF EXISTS (SELECT * FROM sys.views WHERE name = 'VistaClientes')
        BEGIN
          DROP VIEW VistaClientes;
        END
      `);

      await pool.request().query(`
        CREATE VIEW VistaClientes AS
        SELECT
          c.IdCliente,
          c.IdTercero,
          c.CodigoCliente,
          t.NIT,
          t.NombreRazonSocial,
          t.Direccion,
          c.Telefono,
          c.Celular,
          c.Email,
          c.Ciudad,
          c.Departamento,
          c.TipoPersona,
          c.RegimenTributario,
          c.CondicionPago,
          c.LimiteCredito,
          c.SaldoActual,
          c.Descuento,
          c.Observaciones,
          c.Activo,
          c.FechaCreacion,
          c.FechaModificacion
        FROM Clientes c
        INNER JOIN Terceros t ON c.IdTercero = t.IdTercero
        WHERE c.Activo = 1 AND t.Activo = 1
      `);
      console.log('   ✅ Vista VistaClientes creada');
    } catch (error) {
      console.log(`   ⚠️  Error al crear vista: ${error.message.split('\n')[0]}`);
    }

    // 4. Migrar datos
    console.log('\n4. Migrando datos existentes...');
    try {
      const migracionResult = await pool.request().query(`
        INSERT INTO Clientes (IdTercero, CodigoCliente, Activo)
        SELECT
          IdTercero,
          'CLI-' + RIGHT('0000' + CAST(IdTercero AS NVARCHAR), 4) AS CodigoCliente,
          Activo
        FROM Terceros
        WHERE Tipo = 'C'
          AND Activo = 1
          AND IdTercero NOT IN (SELECT IdTercero FROM Clientes)
      `);
      console.log(`   ✅ ${migracionResult.rowsAffected[0]} cliente(s) migrado(s)`);
    } catch (error) {
      console.log(`   ⚠️  Error al migrar: ${error.message.split('\n')[0]}`);
    }

    // Verificar que la tabla fue creada
    console.log('\nVerificando que la tabla fue creada...');
    const verificarResult = await pool.request().query(`
      SELECT
        TABLE_NAME,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Clientes') as NumColumnas
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'Clientes'
    `);

    if (verificarResult.recordset.length > 0) {
      console.log('✅ Tabla Clientes existe:');
      console.log(`   Columnas: ${verificarResult.recordset[0].NumColumnas}`);
    } else {
      console.log('❌ La tabla Clientes no se encontró después de la ejecución');
    }

    // Verificar columnas principales
    console.log('\nVerificando columnas principales...');
    const columnasResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Clientes'
      ORDER BY ORDINAL_POSITION
    `);

    if (columnasResult.recordset.length > 0) {
      console.log('✅ Columnas encontradas:');
      columnasResult.recordset.slice(0, 10).forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
      if (columnasResult.recordset.length > 10) {
        console.log(`   ... y ${columnasResult.recordset.length - 10} más`);
      }
    }

    // Verificar vista
    console.log('\nVerificando vista VistaClientes...');
    const vistaResult = await pool.request().query(`
      SELECT name
      FROM sys.views
      WHERE name = 'VistaClientes'
    `);

    if (vistaResult.recordset.length > 0) {
      console.log('✅ Vista VistaClientes existe');
    } else {
      console.log('⚠️  La vista no se encontró');
    }

    // Contar clientes migrados
    console.log('\nVerificando clientes en la tabla...');
    const clientesResult = await pool.request().query(`
      SELECT COUNT(*) as Total FROM Clientes
    `);
    console.log(`✅ Total de clientes: ${clientesResult.recordset[0].Total}`);

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

    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar
ejecutarScript();


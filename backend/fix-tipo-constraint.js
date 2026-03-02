const sql = require('mssql');

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

async function fixConstraint() {
  let pool;

  try {
    console.log('🔌 Conectando a la base de datos...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado\n');

    // Eliminar la restricción existente
    try {
      await pool.request().query(`ALTER TABLE Terceros DROP CONSTRAINT CK__Terceros__Tipo__59063A47`);
      console.log('✅ Restricción CK__Terceros__Tipo__59063A47 eliminada');
    } catch (e) {
      if (e.message.includes('does not exist') || e.message.includes('no existe')) {
        console.log('⚠️  La restricción CK__Terceros__Tipo__59063A47 no existe');
      } else {
        console.log('⚠️  Error al eliminar:', e.message);
      }
    }

    // Verificar si ya existe la nueva restricción
    const checkExists = await pool.request().query(`
      SELECT name FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('Terceros')
        AND name = 'CK_Terceros_Tipo'
    `);

    if (checkExists.recordset.length === 0) {
      // Agregar nueva restricción
      await pool.request().query(`
        ALTER TABLE Terceros
        ADD CONSTRAINT CK_Terceros_Tipo CHECK (Tipo IN ('C', 'P', 'V'))
      `);
      console.log('✅ Nueva restricción CK_Terceros_Tipo agregada (C, P, V)');
    } else {
      console.log('⚠️  La restricción CK_Terceros_Tipo ya existe');
    }

    console.log('\n✅ Script ejecutado exitosamente');
    console.log('Valores permitidos: C (Cliente), P (Proveedor), V (Vendedor)');

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

fixConstraint();


const sql = require('mssql');

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

async function asignarEmpresa() {
  let pool;
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔧 Asignando empresa a usuarios existentes');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a la base de datos');
    console.log('');

    // Obtener la primera empresa activa
    const empresaResult = await pool.request().query(`
      SELECT TOP 1 IdEmpresa, NombreRazonSocial
      FROM Empresa
      WHERE Activa = 1
      ORDER BY IdEmpresa
    `);

    if (empresaResult.recordset.length === 0) {
      console.log('⚠️  No se encontró ninguna empresa activa');
      console.log('   Crea una empresa primero');
      return;
    }

    const empresa = empresaResult.recordset[0];
    console.log(`📌 Empresa encontrada: ${empresa.NombreRazonSocial} (ID: ${empresa.IdEmpresa})`);
    console.log('');

    // Contar usuarios sin empresa
    const usuariosSinEmpresa = await pool.request().query(`
      SELECT COUNT(*) AS Total
      FROM Usuarios
      WHERE IdEmpresa IS NULL
    `);

    const total = usuariosSinEmpresa.recordset[0].Total;
    console.log(`📊 Usuarios sin empresa asignada: ${total}`);
    console.log('');

    if (total === 0) {
      console.log('✅ Todos los usuarios ya tienen empresa asignada');
      return;
    }

    // Asignar empresa a usuarios sin empresa
    const updateResult = await pool.request()
      .input('idEmpresa', sql.Int, empresa.IdEmpresa)
      .query(`
        UPDATE Usuarios
        SET IdEmpresa = @idEmpresa
        WHERE IdEmpresa IS NULL
      `);

    console.log(`✅ ${total} usuario(s) actualizado(s) con empresa ${empresa.NombreRazonSocial}`);
    console.log('');

    // Mostrar usuarios actualizados
    const usuariosActualizados = await pool.request()
      .input('idEmpresa', sql.Int, empresa.IdEmpresa)
      .query(`
        SELECT Usuario, Nombre
        FROM Usuarios
        WHERE IdEmpresa = @idEmpresa
      `);

    console.log('👥 Usuarios con empresa asignada:');
    usuariosActualizados.recordset.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.Usuario} - ${user.Nombre}`);
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Proceso completado exitosamente');
    console.log('═══════════════════════════════════════════════════');
  } catch (error) {
    console.error('');
    console.error('❌ Error al asignar empresa:');
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

asignarEmpresa();


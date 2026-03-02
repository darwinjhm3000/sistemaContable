import sql from 'mssql';

// Configuración de SQL Server para validación
// Basado en: Data Source=DESKTOP-PTP75MU;Integrated Security=True
const serverOptions = [
  'DESKTOP-PTP75MU', // Nombre de servidor de la cadena de conexión
  'localhost',
  '(local)',
  'localhost\\SQLEXPRESS',
  'localhost\\MSSQLSERVER'
];

const dbConfig: sql.config = {
  server: serverOptions[0], // Empezar con DESKTOP-PTP75MU
  database: process.env.DB_DATABASE || 'MiBaseDeContabilidad',
  options: {
    encrypt: false,
    trustServerCertificate: true, // True para desarrollo local
    enableArithAbort: true,
    connectTimeout: 30000, // 30 segundos
    requestTimeout: 30000, // 30 segundos
  },
  // Autenticación SQL Server
  user: process.env.DB_USER || 'sistema_contable',
  password: process.env.DB_PASSWORD || 'SistemaContable2024!'
};

// Función para validar la conexión
async function validarConexion() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 VALIDACIÓN DE BASE DE DATOS');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`📡 Servidor: ${dbConfig.server}`);
  console.log(`📊 Base de datos: ${dbConfig.database}`);
  console.log('');
  console.log('⏳ Intentando conectar...');
  console.log('');

  let pool: sql.ConnectionPool | null = null;
  let conexionExitosa = false;

  // Intentar conectar con diferentes opciones de servidor
  for (const serverOption of serverOptions) {
    console.log(`🔌 Intentando conectar a: ${serverOption}...`);
    dbConfig.server = serverOption;

    try {
      pool = await sql.connect(dbConfig);
      console.log(`✅ Conexión establecida correctamente con: ${serverOption}`);
      console.log('');
      conexionExitosa = true;
      break;
    } catch (err: any) {
      console.log(`   ❌ Falló: ${err.message}`);
      if (pool) {
        try {
          await pool.close();
        } catch (e) {
          // Ignorar errores al cerrar
        }
        pool = null;
      }
    }
  }

  if (!conexionExitosa) {
    throw new Error('No se pudo conectar con ninguna de las opciones de servidor probadas');
  }

  try {

    // Validar tablas principales
    await validarTablas(pool);

    // Validar datos
    await validarDatos(pool);

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ VALIDACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════');

  } catch (error: any) {
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('❌ ERROR EN LA VALIDACIÓN');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.error('Error:', error.message);
    console.log('');

    // Proporcionar ayuda específica según el error
    if (error.code === 'ETIMEOUT' || error.code === 'ECONNREFUSED') {
      console.log('💡 Posibles soluciones:');
      console.log('   1. Verificar que SQL Server esté ejecutándose');
      console.log('   2. Verificar que el nombre del servidor sea correcto');
      console.log('   3. Verificar que SQL Server permita conexiones remotas');
      console.log('   4. Verificar el firewall de Windows');
    } else if (error.code === 'ELOGIN') {
      console.log('💡 Posibles soluciones:');
      console.log('   1. Verificar credenciales de autenticación');
      console.log('   2. Verificar que el usuario tenga permisos en la base de datos');
    } else if (error.code === 'EREQUEST' && error.message.includes('Cannot open database')) {
      console.log('💡 Posibles soluciones:');
      console.log('   1. Verificar que la base de datos exista');
      console.log('   2. Verificar el nombre de la base de datos');
      console.log('   3. Ejecutar el script de creación de base de datos');
    }
    console.log('');
    process.exit(1);
  } finally {
    // Cerrar conexión
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Conexión cerrada');
      } catch (error) {
        // Ignorar errores al cerrar
      }
    }
  }
}

// Función para validar que las tablas existan
async function validarTablas(pool: sql.ConnectionPool) {
  console.log('📋 Validando estructura de tablas...');
  console.log('');

  const tablasEsperadas = [
    'Usuarios',
    'CuentasPUC',
    'Terceros',
    'Comprobantes',
    'DetalleComprobante'
  ];

  try {
    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tablasExistentes = result.recordset.map((row: any) => row.TABLE_NAME);

    let todasExisten = true;
    for (const tabla of tablasEsperadas) {
      if (tablasExistentes.includes(tabla)) {
        console.log(`   ✅ ${tabla}`);
      } else {
        console.log(`   ❌ ${tabla} - NO ENCONTRADA`);
        todasExisten = false;
      }
    }

    if (!todasExisten) {
      console.log('');
      console.log('⚠️  Algunas tablas no fueron encontradas');
      console.log('   Ejecute el script de creación de base de datos');
    } else {
      console.log('');
      console.log('✅ Todas las tablas requeridas existen');
    }

  } catch (error: any) {
    console.log(`   ❌ Error al validar tablas: ${error.message}`);
  }
}

// Función para validar datos básicos
async function validarDatos(pool: sql.ConnectionPool) {
  console.log('');
  console.log('📊 Validando datos...');
  console.log('');

  try {
    // Contar registros en cada tabla
    const consultas = [
      { nombre: 'Usuarios', query: 'SELECT COUNT(*) as total FROM Usuarios' },
      { nombre: 'CuentasPUC', query: 'SELECT COUNT(*) as total FROM CuentasPUC' },
      { nombre: 'Terceros', query: 'SELECT COUNT(*) as total FROM Terceros' },
      { nombre: 'Comprobantes', query: 'SELECT COUNT(*) as total FROM Comprobantes' },
      { nombre: 'DetalleComprobante', query: 'SELECT COUNT(*) as total FROM DetalleComprobante' }
    ];

    for (const consulta of consultas) {
      try {
        const result = await pool.request().query(consulta.query);
        const total = result.recordset[0].total;
        console.log(`   📈 ${consulta.nombre}: ${total} registro(s)`);
      } catch (error: any) {
        console.log(`   ⚠️  ${consulta.nombre}: Error al contar - ${error.message}`);
      }
    }

    // Validar usuarios activos
    try {
      const usuariosActivos = await pool.request()
        .query('SELECT COUNT(*) as total FROM Usuarios WHERE Activo = 1');
      console.log(`   👤 Usuarios activos: ${usuariosActivos.recordset[0].total}`);
    } catch (error) {
      // Ignorar si hay error
    }

    // Validar cuentas activas del PUC
    try {
      const cuentasActivas = await pool.request()
        .query('SELECT COUNT(*) as total FROM CuentasPUC WHERE Activa = 1');
      console.log(`   📝 Cuentas PUC activas: ${cuentasActivas.recordset[0].total}`);
    } catch (error) {
      // Ignorar si hay error
    }

  } catch (error: any) {
    console.log(`   ❌ Error al validar datos: ${error.message}`);
  }
}

// Ejecutar validación
validarConexion().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});


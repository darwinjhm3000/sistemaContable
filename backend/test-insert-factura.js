const sql = require('mssql');

const config = {
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

async function testInsert() {
  try {
    const pool = await sql.connect(config);
    console.log('✅ Conectado a la base de datos\n');

    // Obtener un cliente de prueba
    const clienteResult = await pool.request().query(`
      SELECT TOP 1 c.IdCliente, c.IdTercero
      FROM Clientes c
      WHERE c.Activo = 1
    `);

    if (clienteResult.recordset.length === 0) {
      console.error('❌ No hay clientes activos en la base de datos');
      await pool.close();
      return;
    }

    const cliente = clienteResult.recordset[0];
    const idTerceroCliente = cliente.IdTercero;
    const numeroFactura = `TEST-${Date.now()}`;

    console.log('📋 Datos de prueba:');
    console.log('   Cliente IdCliente:', cliente.IdCliente);
    console.log('   Cliente IdTercero:', idTerceroCliente);
    console.log('   Número Factura:', numeroFactura);
    console.log('');

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = transaction.request();

      request.input('numeroFactura', sql.VarChar(20), numeroFactura);
      request.input('fecha', sql.Date, new Date());
      request.input('idTerceroCliente', sql.Int, idTerceroCliente);
      request.input('subtotal', sql.Decimal(18, 2), 100.00);
      request.input('iva', sql.Decimal(18, 2), 19.00);
      request.input('total', sql.Decimal(18, 2), 119.00);
      request.input('estado', sql.VarChar(20), 'Borrador');
      request.input('observaciones', sql.VarChar(500), null);
      request.input('idUsuarioCreacion', sql.Int, 1);
      request.input('idVendedor', sql.Int, null);
      request.input('idEmpresa', sql.Int, null);
      request.input('cufe', sql.VarChar(100), null);
      request.input('qrCode', sql.NVarChar(sql.MAX), null);
      request.input('ambienteDIAN', sql.VarChar(20), 'Pruebas');
      request.input('tipoDocumentoElectronico', sql.VarChar(10), 'FV');
      request.input('estadoValidacionDIAN', sql.VarChar(20), 'Pendiente');

      const queryInsert = `
        INSERT INTO Facturas
          (NumeroFactura, Fecha, IdCliente, Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion,
           IdVendedor, IdEmpresa, CUFE, QRCode, AmbienteDIAN, TipoDocumentoElectronico, EstadoValidacionDIAN)
        OUTPUT INSERTED.IdFactura
        VALUES
          (@numeroFactura, @fecha, @idTerceroCliente, @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion,
           @idVendedor, @idEmpresa, @cufe, @qrCode, @ambienteDIAN, @tipoDocumentoElectronico, @estadoValidacionDIAN)
      `;

      console.log('🔍 Ejecutando INSERT...');
      const result = await request.query(queryInsert);

      if (result.recordset.length > 0) {
        console.log('✅ Factura insertada exitosamente!');
        console.log('   IdFactura:', result.recordset[0].IdFactura);
        await transaction.rollback(); // Rollback para no dejar datos de prueba
        console.log('   (Transacción revertida - solo prueba)');
      } else {
        throw new Error('No se obtuvo IdFactura');
      }
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error al insertar:');
      console.error('   Message:', error.message);
      console.error('   Number:', error.number);
      console.error('   State:', error.state);
      console.error('   Procedure:', error.procedure);
      console.error('   LineNumber:', error.lineNumber);
      throw error;
    }

    await pool.close();
  } catch (error) {
    console.error('❌ Error general:', error.message);
    process.exit(1);
  }
}

testInsert();


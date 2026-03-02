// Polyfill para DOMMatrix requerido por pdf-parse en Node.js
// DEBE estar antes de cualquier importación que use pdf-parse
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  // Polyfill básico de DOMMatrix para pdf-parse
  class DOMMatrixPolyfill {
    a: number = 1;
    b: number = 0;
    c: number = 0;
    d: number = 1;
    e: number = 0;
    f: number = 0;
    m11: number = 1;
    m12: number = 0;
    m13: number = 0;
    m14: number = 0;
    m21: number = 0;
    m22: number = 1;
    m23: number = 0;
    m24: number = 0;
    m31: number = 0;
    m32: number = 0;
    m33: number = 1;
    m34: number = 0;
    m41: number = 0;
    m42: number = 0;
    m43: number = 0;
    m44: number = 1;

    constructor(init?: string | number[]) {
      if (init) {
        if (typeof init === 'string') {
          // Parsear string de matriz
          const values = init.match(/matrix\(([^)]+)\)/)?.[1]?.split(/\s*,\s*/).map(Number) || [];
          if (values.length >= 6) {
            this.a = values[0]; this.b = values[1];
            this.c = values[2]; this.d = values[3];
            this.e = values[4]; this.f = values[5];
            this.m11 = this.a; this.m12 = this.b;
            this.m21 = this.c; this.m22 = this.d;
            this.m41 = this.e; this.m42 = this.f;
          }
        } else if (Array.isArray(init)) {
          // Array de valores
          if (init.length >= 6) {
            this.a = init[0]; this.b = init[1];
            this.c = init[2]; this.d = init[3];
            this.e = init[4]; this.f = init[5];
            this.m11 = this.a; this.m12 = this.b;
            this.m21 = this.c; this.m22 = this.d;
            this.m41 = this.e; this.m42 = this.f;
          }
        }
      }
    }

    multiply(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
      const result = new DOMMatrixPolyfill();
      // Multiplicación de matrices simplificada para 2D
      result.a = this.a * other.a + this.c * other.b;
      result.b = this.b * other.a + this.d * other.b;
      result.c = this.a * other.c + this.c * other.d;
      result.d = this.b * other.c + this.d * other.d;
      result.e = this.a * other.e + this.c * other.f + this.e;
      result.f = this.b * other.e + this.d * other.f + this.f;
      return result;
    }

    translate(tx: number, ty: number): DOMMatrixPolyfill {
      const result = new DOMMatrixPolyfill();
      result.a = this.a; result.b = this.b;
      result.c = this.c; result.d = this.d;
      result.e = this.a * tx + this.c * ty + this.e;
      result.f = this.b * tx + this.d * ty + this.f;
      return result;
    }

    scale(sx: number, sy?: number): DOMMatrixPolyfill {
      sy = sy !== undefined ? sy : sx;
      const result = new DOMMatrixPolyfill();
      result.a = this.a * sx; result.b = this.b * sx;
      result.c = this.c * sy; result.d = this.d * sy;
      result.e = this.e; result.f = this.f;
      return result;
    }

    rotate(angle: number): DOMMatrixPolyfill {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const result = new DOMMatrixPolyfill();
      result.a = this.a * cos + this.c * sin;
      result.b = this.b * cos + this.d * sin;
      result.c = this.a * -sin + this.c * cos;
      result.d = this.b * -sin + this.d * cos;
      result.e = this.e; result.f = this.f;
      return result;
    }
  }

  (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
  (globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill;
}

// Configurar zona horaria de Bogotá, Colombia (America/Bogota, UTC-5)
process.env.TZ = 'America/Bogota';

import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { crearAsientoAutomatico } from './services/contabilidad';
import { generarCUFE, generarQRCode, validarRequisitosDIAN, formatearNIT } from './services/dian';
import { extractInvoiceData } from './services/ocr/invoice-extractor.service';
import { getInfoZonaHoraria } from './utils/fechas';
import {
  obtenerConfiguracionDIAN,
  sincronizarFacturas,
  consultarEstadoFactura,
  descargarXMLFactura
} from './services/dian-sync.service';
import { encrypt } from './utils/encryption';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS
app.use(cors());
app.use(express.json());

// Configuración de multer para subida de archivos
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDFs e imágenes.'));
    }
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: 'ARCHIVO_DEMASIADO_GRANDE',
        mensaje: 'El archivo es demasiado grande. Máximo 10MB'
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: 'ERROR_SUBIDA',
      mensaje: err.message || 'Error al subir el archivo'
    });
    return;
  }
  if (err) {
    res.status(400).json({
      success: false,
      error: 'ERROR_VALIDACION',
      mensaje: err.message || 'Error de validación del archivo'
    });
    return;
  }
  next();
};

// Configuración de base de datos
const dbConfig: sql.config = {
  server: process.env.DB_SERVER || 'DESKTOP-PTP75MU',
  database: process.env.DB_DATABASE || 'MiBaseDeContabilidad',
  user: process.env.DB_USER || 'sistema_contable',
  password: process.env.DB_PASSWORD || 'SistemaContable2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Variables globales para el pool de conexiones
let pool: sql.ConnectionPool | null = null;
let dbConnected = false;

// Manejo de errores no capturados
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Error no capturado:', error);
  console.error('Stack:', error.stack);
  // No cerrar el proceso, solo registrar el error
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('Promise:', promise);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('⚠️  Señal SIGTERM recibida, cerrando servidor...');
  if (pool) {
    pool.close().catch(console.error);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  Señal SIGINT recibida, cerrando servidor...');
  if (pool) {
    pool.close().catch(console.error);
  }
  process.exit(0);
});

async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool || !dbConnected) {
    try {
      // Cerrar pool anterior si existe
      if (pool) {
        try {
          await pool.close();
        } catch (e) {
          console.warn('⚠️  Error al cerrar pool anterior:', e);
        }
      }

      pool = await sql.connect(dbConfig);
      dbConnected = true;
      console.log('✅ Conexión a SQL Server establecida correctamente');
      console.log(`   Servidor: ${dbConfig.server}`);
      console.log(`   Base de datos: ${dbConfig.database}`);

      // Manejar errores de conexión
      pool.on('error', (err: Error) => {
        console.error('❌ Error en el pool de conexiones:', err);
        dbConnected = false;
        pool = null;
      });
    } catch (error: any) {
      console.error('❌ Error al conectar con SQL Server:');
      console.error(`   Servidor: ${dbConfig.server}`);
      console.error(`   Base de datos: ${dbConfig.database}`);
      console.error(`   Error: ${error.message}`);

      if (error.code === 'ETIMEOUT' || error.code === 'ECONNREFUSED') {
        console.error('');
        console.error('💡 Sugerencias:');
        console.error('   1. Verificar que SQL Server esté ejecutándose');
        console.error('   2. Intentar conectar usando "localhost" o "(local)"');
        console.error('   3. Verificar que SQL Server permita conexiones TCP/IP');
        console.error('   4. Verificar el firewall de Windows');
        console.error('   5. Si usa una instancia nombrada, usar: "localhost\\NOMBRE_INSTANCIA"');
      } else if (error.code === 'ELOGIN') {
        console.error('');
        console.error('💡 Error de autenticación. Verificar credenciales.');
      } else if (error.message && error.message.includes('Cannot open database')) {
        console.error('');
        console.error('💡 La base de datos no existe. Ejecute el script de creación.');
      }

      console.error('');
      console.error('⚠️  El servidor continuará funcionando pero las operaciones de BD fallarán');
      dbConnected = false;
      throw error;
    }
  }
  return pool;
}

// Middleware para manejar errores de conexión a BD
function handleDBError(error: any, res: express.Response, defaultMessage: string) {
  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      error: 'Servicio de base de datos no disponible',
      mensaje: 'No se puede conectar a la base de datos. Por favor, verifique la configuración.',
      detalles: {
        servidor: dbConfig.server,
        baseDatos: dbConfig.database,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    });
  }
  console.error(defaultMessage, error);
  return res.status(500).json({
    success: false,
    error: defaultMessage,
    detalles: error instanceof Error ? error.message : 'Error desconocido'
  });
}

// =============================================
// Endpoint: POST /api/login
// =============================================
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;

    if (!usuario || !contraseña) {
      return res.status(400).json({
        success: false,
        mensaje: 'Usuario y contraseña son requeridos'
      });
    }

    try {
      const pool = await getConnection();
      const result = await pool.request()
        .input('usuario', sql.VarChar(50), usuario)
        .input('contraseña', sql.VarChar(255), contraseña)
        .query(`
          SELECT
            u.IdUsuario,
            u.Usuario,
            u.Nombre,
            u.Email,
            u.IdEmpresa,
            e.Nit AS EmpresaNit,
            e.NombreRazonSocial AS EmpresaNombre,
            e.Direccion AS EmpresaDireccion,
            e.Telefono AS EmpresaTelefono,
            e.Email AS EmpresaEmail,
            e.Ciudad AS EmpresaCiudad,
            e.Departamento AS EmpresaDepartamento,
            e.RegimenTributario AS EmpresaRegimenTributario,
            e.RepresentanteLegal AS EmpresaRepresentanteLegal
          FROM Usuarios u
          LEFT JOIN Empresa e ON u.IdEmpresa = e.IdEmpresa
          WHERE u.Usuario = @usuario
            AND u.Contraseña = @contraseña
            AND u.Activo = 1
        `);

      if (result.recordset.length === 0) {
        return res.status(401).json({
          success: false,
          mensaje: 'Usuario o contraseña incorrectos'
        });
      }

      const user = result.recordset[0];

      // Token mock (debe implementarse JWT real)
      const token = 'mock-jwt-token-' + user.IdUsuario;

      res.json({
        success: true,
        token,
        usuario: {
          idUsuario: user.IdUsuario,
          usuario: user.Usuario,
          nombre: user.Nombre,
          email: user.Email,
          idEmpresa: user.IdEmpresa || null
        },
        empresa: user.IdEmpresa ? {
          idEmpresa: user.IdEmpresa,
          nit: user.EmpresaNit,
          nombreRazonSocial: user.EmpresaNombre,
          direccion: user.EmpresaDireccion,
          telefono: user.EmpresaTelefono,
          email: user.EmpresaEmail,
          ciudad: user.EmpresaCiudad,
          departamento: user.EmpresaDepartamento,
          regimenTributario: user.EmpresaRegimenTributario,
          representanteLegal: user.EmpresaRepresentanteLegal
        } : null
      });
    } catch (dbError) {
      return handleDBError(dbError, res, 'Error al procesar la autenticación');
    }
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al procesar la autenticación'
    });
  }
});

// =============================================
// Endpoint: GET /api/health
// =============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor funcionando correctamente'
  });
});

// =============================================
// Endpoint: GET /api/health/db
// =============================================
app.get('/api/health/db', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        DB_NAME() AS DatabaseName,
        @@SERVERNAME AS ServerName,
        @@VERSION AS Version
    `);

    const dbInfo = result.recordset[0];

    res.json({
      status: 'ok',
      connected: true,
      message: 'Conexión a la base de datos exitosa',
      database: {
        name: dbInfo.DatabaseName,
        server: dbInfo.ServerName,
        version: dbInfo.Version
      }
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      connected: false,
      message: 'Error al conectar con la base de datos',
      error: error.message,
      detalles: {
        server: dbConfig.server,
        database: dbConfig.database
      }
    });
  }
});

// =============================================
// Endpoint: GET /api/facturas
// =============================================
app.get('/api/facturas', async (req, res) => {
  try {
    const { estado, fechaDesde, fechaHasta, idCliente } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        f.IdFactura,
        f.NumeroFactura,
        f.Fecha,
        f.IdCliente,
        f.IdVendedor,
        f.Subtotal,
        f.IVA,
        f.Total,
        f.Estado,
        f.Observaciones,
        c.NombreRazonSocial AS NombreCliente,
        c.NIT AS NITCliente,
        v.CodigoVendedor,
        t.NombreRazonSocial AS NombreVendedor
      FROM Facturas f
      LEFT JOIN Clientes cl ON f.IdCliente = cl.IdCliente
      LEFT JOIN Terceros c ON cl.IdTercero = c.IdTercero
      LEFT JOIN Vendedores v ON f.IdVendedor = v.IdVendedor
      LEFT JOIN Terceros t ON v.IdTercero = t.IdTercero
      WHERE 1=1
    `;

    const request = pool.request();

    if (estado) {
      query += ' AND f.Estado = @estado';
      request.input('estado', sql.VarChar(20), estado);
    }
    if (fechaDesde) {
      query += ' AND f.Fecha >= @fechaDesde';
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND f.Fecha <= @fechaHasta';
      request.input('fechaHasta', sql.Date, fechaHasta);
    }
    if (idCliente) {
      query += ' AND f.IdCliente = @idCliente';
      request.input('idCliente', sql.Int, parseInt(idCliente as string));
    }

    query += ' ORDER BY f.Fecha DESC, f.NumeroFactura DESC';

    const result = await request.query(query);

    const facturas = result.recordset.map((fact: any) => ({
      idFactura: fact.IdFactura,
      numeroFactura: fact.NumeroFactura,
      fecha: fact.Fecha.toISOString().split('T')[0],
      idCliente: fact.IdCliente,
      idVendedor: fact.IdVendedor || null,
      subtotal: parseFloat(fact.Subtotal),
      iva: parseFloat(fact.IVA || 0),
      total: parseFloat(fact.Total),
      estado: fact.Estado,
      observaciones: fact.Observaciones || null,
      cliente: {
        idTercero: fact.IdCliente,
        nit: fact.NITCliente,
        nombreRazonSocial: fact.NombreCliente
      },
      vendedor: fact.IdVendedor ? {
        codigoVendedor: fact.CodigoVendedor,
        nombreRazonSocial: fact.NombreVendedor
      } : null
    }));

    res.json(facturas);
  } catch (error: any) {
    console.error('Error al obtener facturas:', error);
    return handleDBError(error, res, 'Error al obtener las facturas');
  }
});

// Función para generar número de factura automático
async function generarNumeroFactura(pool: sql.ConnectionPool, fecha: string): Promise<string> {
  const año = new Date(fecha).getFullYear();
  const prefijo = `FAC-${año}-`;

  const result = await pool.request()
    .input('prefijo', sql.VarChar(20), prefijo + '%')
    .query(`
      SELECT TOP 1 NumeroFactura
      FROM Facturas
      WHERE NumeroFactura LIKE @prefijo
      ORDER BY NumeroFactura DESC
    `);

  let siguienteNumero = 1;
  if (result.recordset.length > 0) {
    const ultimoNumero = result.recordset[0].NumeroFactura;
    const numeroStr = ultimoNumero.split('-')[2];
    siguienteNumero = parseInt(numeroStr) + 1;
  }

  return `${prefijo}${siguienteNumero.toString().padStart(4, '0')}`;
}

// =============================================
// Endpoint: POST /api/facturas
// =============================================
app.post('/api/facturas', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    console.log('📥 ========== RECIBIENDO PETICIÓN DE FACTURA ==========');
    console.log('Request body completo:', JSON.stringify(req.body, null, 2));

    const {
      numeroFactura,
      fecha,
      idCliente,
      idVendedor,
      idEmpresa,
      observaciones,
      estado,
      detalles,
      continuarSinStock,
      idUsuarioCreacion
    } = req.body;

    console.log('📋 Datos extraídos:');
    console.log('   numeroFactura:', numeroFactura);
    console.log('   fecha:', fecha);
    console.log('   idCliente:', idCliente);
    console.log('   idVendedor:', idVendedor);
    console.log('   idEmpresa:', idEmpresa);
    console.log('   estado:', estado);
    console.log('   detalles count:', detalles?.length);
    console.log('   continuarSinStock:', continuarSinStock);
    console.log('   idUsuarioCreacion:', idUsuarioCreacion);
    console.log('==================================================');

    if (!fecha || !idCliente || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Fecha, cliente y al menos un detalle son requeridos'
      });
    }

    const pool = await getConnection();

    // Validar cliente y obtener IdTercero
    const clienteResult = await transaction.request()
      .input('idCliente', sql.Int, idCliente)
      .query('SELECT IdCliente, IdTercero FROM Clientes WHERE IdCliente = @idCliente AND Activo = 1');

    if (clienteResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'CLIENTE_INVALIDO',
        mensaje: 'El cliente no existe o está inactivo'
      });
    }

    // Obtener IdTercero del cliente (la tabla Facturas usa IdTercero, no IdCliente)
    const idTerceroCliente = clienteResult.recordset[0].IdTercero;

    // Validar productos y stock
    const productosSinStock: any[] = [];
    for (const detalle of detalles) {
      const productoResult = await transaction.request()
        .input('idProducto', sql.Int, detalle.idProducto)
        .query(`
          SELECT
            p.IdProducto,
            p.Nombre,
            ISNULL(i.Cantidad, 0) AS CantidadStock
          FROM Productos p
          LEFT JOIN Inventario i ON p.IdProducto = i.IdProducto
          WHERE p.IdProducto = @idProducto AND p.Activo = 1
        `);

      if (productoResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'PRODUCTO_INVALIDO',
          mensaje: `El producto con ID ${detalle.idProducto} no existe o está inactivo`
        });
      }

      const producto = productoResult.recordset[0];
      const stockDisponible = parseFloat(producto.CantidadStock || 0);

      if (detalle.cantidad > stockDisponible && !continuarSinStock) {
        productosSinStock.push({
          idProducto: producto.IdProducto,
          nombre: producto.Nombre,
          stockDisponible,
          cantidadSolicitada: detalle.cantidad
        });
      }
    }

    if (productosSinStock.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'STOCK_INSUFICIENTE',
        mensaje: 'Algunos productos no tienen stock suficiente',
        detalles: {
          productosSinStock,
          continuarSinStock: false
        }
      });
    }

    // Generar número de factura si no se proporciona
    let numeroFinal = numeroFactura;
    if (!numeroFinal || numeroFinal.trim() === '') {
      numeroFinal = await generarNumeroFactura(pool, fecha);
    }

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;

    for (const det of detalles) {
      const subtotalDetalle = (det.cantidad * det.precioUnitario) - (det.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((det.iva || 0) / 100);
      subtotal += subtotalDetalle;
      ivaTotal += ivaDetalle;
    }

    const total = subtotal + ivaTotal;

    // Obtener IdEmpresa si no se proporciona
    let idEmpresaFinal = idEmpresa;
    if (!idEmpresaFinal) {
      const usuario = await transaction.request()
        .input('idUsuario', sql.Int, idUsuarioCreacion || 1)
        .query('SELECT IdEmpresa FROM Usuarios WHERE IdUsuario = @idUsuario');
      idEmpresaFinal = usuario.recordset[0]?.IdEmpresa || null;
    }

    // Obtener datos de empresa y cliente para generar CUFE/QR según DIAN
    let nitEmisor = '';
    let nitReceptor = '';

    try {
      if (idEmpresaFinal) {
        const empresaResult = await transaction.request()
          .input('idEmpresa', sql.Int, idEmpresaFinal)
          .query('SELECT NIT, NombreRazonSocial FROM Empresa WHERE IdEmpresa = @idEmpresa');
        nitEmisor = empresaResult.recordset[0]?.NIT || '';
      }

      const clienteResultDIAN = await transaction.request()
        .input('idCliente', sql.Int, idCliente)
        .query(`
          SELECT t.NIT, t.NombreRazonSocial
          FROM Clientes c
          INNER JOIN Terceros t ON c.IdTercero = t.IdTercero
          WHERE c.IdCliente = @idCliente
        `);
      nitReceptor = clienteResultDIAN.recordset[0]?.NIT || '';
    } catch (error) {
      console.warn('Error al obtener datos para CUFE, continuando sin ellos:', error);
    }

    // Generar CUFE según Resolución DIAN 000085 (solo si tenemos NITs)
    let cufe = '';
    let qrCode = '';

    if (nitEmisor && nitReceptor) {
      try {
        cufe = generarCUFE({
          numeroFactura: numeroFinal,
          fecha,
          nitEmisor: formatearNIT(nitEmisor),
          nitReceptor: formatearNIT(nitReceptor),
          valorTotal: total,
          ambiente: 'Pruebas',
          tipoDocumento: 'FV'
        });

        // Generar QR Code
        qrCode = generarQRCode({
          cufe,
          numeroFactura: numeroFinal,
          fecha,
          nitEmisor: formatearNIT(nitEmisor),
          nitReceptor: formatearNIT(nitReceptor),
          valorTotal: total,
          iva: ivaTotal,
          ambiente: 'Pruebas'
        });
      } catch (error) {
        console.warn('Error al generar CUFE/QR, continuando sin ellos:', error);
      }
    }

    // Validar foreign keys antes de insertar
    if (idVendedor) {
      const vendedorCheck = await transaction.request()
        .input('idVendedor', sql.Int, idVendedor)
        .query('SELECT IdVendedor FROM Vendedores WHERE IdVendedor = @idVendedor AND Activo = 1');
      if (vendedorCheck.recordset.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'VENDEDOR_INVALIDO',
          mensaje: `El vendedor con ID ${idVendedor} no existe o está inactivo`
        });
      }
    }

    if (idEmpresaFinal) {
      const empresaCheck = await transaction.request()
        .input('idEmpresa', sql.Int, idEmpresaFinal)
        .query('SELECT IdEmpresa FROM Empresa WHERE IdEmpresa = @idEmpresa');
      if (empresaCheck.recordset.length === 0) {
        console.warn(`Empresa con ID ${idEmpresaFinal} no existe, continuando sin IdEmpresa`);
        idEmpresaFinal = null;
      }
    }

    // Insertar factura con todas las columnas según la estructura real de la tabla
    const requestInsert = transaction.request();

    // Parámetros base (siempre requeridos)
    requestInsert.input('numeroFactura', sql.VarChar(20), numeroFinal);
    requestInsert.input('fecha', sql.Date, fecha);
    requestInsert.input('idTerceroCliente', sql.Int, idTerceroCliente);
    requestInsert.input('subtotal', sql.Decimal(18, 2), subtotal);
    requestInsert.input('iva', sql.Decimal(18, 2), ivaTotal);
    requestInsert.input('total', sql.Decimal(18, 2), total);
    requestInsert.input('estado', sql.VarChar(20), estado || 'Borrador');
    requestInsert.input('observaciones', sql.VarChar(500), observaciones || null);
    requestInsert.input('idUsuarioCreacion', sql.Int, idUsuarioCreacion || 1);

    // Columnas opcionales
    requestInsert.input('idVendedor', sql.Int, idVendedor || null);
    requestInsert.input('idEmpresa', sql.Int, idEmpresaFinal || null);

    // Columnas DIAN
    requestInsert.input('cufe', sql.VarChar(100), cufe || null);
    requestInsert.input('qrCode', sql.NVarChar(sql.MAX), qrCode || null);
    requestInsert.input('ambienteDIAN', sql.VarChar(20), 'Pruebas');
    requestInsert.input('tipoDocumentoElectronico', sql.VarChar(10), 'FV');
    requestInsert.input('estadoValidacionDIAN', sql.VarChar(20), 'Pendiente');

    // Construir la consulta INSERT con todas las columnas según la estructura real
    // IMPORTANTE: Los nombres de parámetros deben coincidir exactamente con los definidos en .input()
    const queryInsert = `
      INSERT INTO Facturas
        (NumeroFactura, Fecha, IdCliente, Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion,
         IdVendedor, IdEmpresa, CUFE, QRCode, AmbienteDIAN, TipoDocumentoElectronico, EstadoValidacionDIAN)
      OUTPUT INSERTED.IdFactura
      VALUES
        (@numeroFactura, @fecha, @idTerceroCliente, @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion,
         @idVendedor, @idEmpresa, @cufe, @qrCode, @ambienteDIAN, @tipoDocumentoElectronico, @estadoValidacionDIAN)
    `;

    // Validar que todos los valores estén definidos
    console.log('📊 Valores a insertar:');
    console.log('   numeroFactura:', numeroFinal);
    console.log('   fecha:', fecha);
    console.log('   idTerceroCliente:', idTerceroCliente);
    console.log('   subtotal:', subtotal);
    console.log('   iva:', ivaTotal);
    console.log('   total:', total);
    console.log('   estado:', estado || 'Borrador');
    console.log('   observaciones:', observaciones || null);
    console.log('   idUsuarioCreacion:', idUsuarioCreacion || 1);
    console.log('   idVendedor:', idVendedor || null);
    console.log('   idEmpresa:', idEmpresaFinal || null);
    console.log('   cufe:', cufe || null);
    console.log('   qrCode:', qrCode ? 'Generado' : null);
    console.log('   ambienteDIAN: Pruebas');
    console.log('   tipoDocumentoElectronico: FV');
    console.log('   estadoValidacionDIAN: Pendiente');

    console.log('🔍 Insertando factura con todas las columnas disponibles');
    console.log('   Número:', numeroFinal);
    console.log('   Cliente (IdTercero):', idTerceroCliente);
    console.log('   Vendedor:', idVendedor || 'N/A');
    console.log('   Empresa:', idEmpresaFinal || 'N/A');
    console.log('   Query:', queryInsert.replace(/\s+/g, ' '));

    let facturaResult;
    try {
      facturaResult = await requestInsert.query(queryInsert);
    } catch (insertError: any) {
      console.error('❌ Error específico al insertar factura:', insertError);
      console.error('   Message:', insertError.message);
      console.error('   Number:', insertError.number);
      console.error('   State:', insertError.state);
      console.error('   Procedure:', insertError.procedure);
      console.error('   LineNumber:', insertError.lineNumber);
      throw insertError;
    }

    if (!facturaResult || !facturaResult.recordset || facturaResult.recordset.length === 0) {
      throw new Error('No se pudo obtener el ID de la factura creada');
    }

    const idFactura = facturaResult.recordset[0].IdFactura;
    console.log(`✅ Factura creada con ID: ${idFactura}, Número: ${numeroFinal}`);

    // Insertar detalles y actualizar inventario
    for (const detalle of detalles) {
      const subtotalDetalle = (detalle.cantidad * detalle.precioUnitario) - (detalle.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((detalle.iva || 0) / 100);
      const totalDetalle = subtotalDetalle + ivaDetalle;

      await transaction.request()
        .input('idFactura', sql.Int, idFactura)
        .input('idProducto', sql.Int, detalle.idProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), detalle.precioUnitario)
        .input('descuento', sql.Decimal(18, 2), detalle.descuento || 0)
        .input('iva', sql.Decimal(5, 2), detalle.iva || 0)
        .input('subtotal', sql.Decimal(18, 2), subtotalDetalle)
        .input('total', sql.Decimal(18, 2), totalDetalle)
        .query(`
          INSERT INTO DetalleFactura
            (IdFactura, IdProducto, Cantidad, PrecioUnitario, Descuento, IVA, Subtotal, Total)
          VALUES
            (@idFactura, @idProducto, @cantidad, @precioUnitario, @descuento, @iva, @subtotal, @total)
        `);

      // Actualizar inventario (el trigger debería hacerlo, pero lo hacemos explícitamente)
      await transaction.request()
        .input('idProducto', sql.Int, detalle.idProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.cantidad)
        .query(`
          UPDATE Inventario
          SET Cantidad = Cantidad - @cantidad,
              FechaUltimaActualizacion = GETDATE()
          WHERE IdProducto = @idProducto
        `);
    }

    // Si la factura está emitida, generar asiento contable
    let idComprobante: number | null = null;
    if (estado === 'Emitida') {
      const clienteInfo = await pool.request()
        .input('idCliente', sql.Int, idCliente)
        .query('SELECT NombreRazonSocial FROM Terceros WHERE IdTercero = (SELECT IdTercero FROM Clientes WHERE IdCliente = @idCliente)');

      const nombreCliente = clienteInfo.recordset[0]?.NombreRazonSocial || 'Cliente';

      const movimientos = [
        {
          codigoCuenta: '130505',
          idTercero: idCliente,
          valorDebito: total,
          valorCredito: 0
        },
        {
          codigoCuenta: '413500',
          valorDebito: 0,
          valorCredito: subtotal
        },
        {
          codigoCuenta: '240805',
          valorDebito: 0,
          valorCredito: ivaTotal
        }
      ];

      try {
        idComprobante = await crearAsientoAutomatico(pool, {
          fecha,
          descripcion: `Factura ${numeroFinal} - ${nombreCliente}`,
          movimientos,
          idUsuarioCreacion: idUsuarioCreacion || 1,
          referencia: idFactura.toString(),
          tipoReferencia: 'Factura'
        });
      } catch (error: any) {
        console.error('Error al crear asiento contable:', error);
        // No revertir la factura si falla el asiento
      }
    }

    await transaction.commit();

    const respuesta: any = {
      success: true,
      idFactura,
      numeroFactura: numeroFinal,
      cufe,
      qrCode,
      mensaje: 'Factura creada exitosamente'
    };

    if (idComprobante) {
      respuesta.idComprobante = idComprobante;
    }

    if (continuarSinStock && productosSinStock.length > 0) {
      respuesta.advertencias = {
        productosSinStock,
        mensaje: 'Algunos productos se facturaron sin stock disponible'
      };
    }

    res.status(201).json(respuesta);
  } catch (error: any) {
    await transaction.rollback();

    // Logging detallado
    console.error('❌ ========== ERROR AL CREAR FACTURA ==========');
    console.error('Error:', error);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Number:', error.number);
    console.error('State:', error.state);
    console.error('Class:', error.class);
    console.error('ServerName:', error.serverName);
    console.error('Procedure:', error.procedure);
    console.error('LineNumber:', error.lineNumber);
    console.error('Stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('===============================================');

    // Detectar errores específicos de SQL Server
    let mensajeError = error instanceof Error ? error.message : 'Error desconocido';
    let codigoError = 'ERROR_DESCONOCIDO';

    if (error.message) {
      const msg = error.message.toLowerCase();
      const errorNumber = error.number;

      // Errores de SQL Server
      if (errorNumber === 547) { // Foreign key constraint
        codigoError = 'ERROR_FOREIGN_KEY';
        mensajeError = 'Error de integridad referencial. Verifique que el cliente, vendedor o empresa existan.';
      } else if (errorNumber === 2627 || errorNumber === 2601) { // Unique constraint
        codigoError = 'ERROR_DUPLICADO';
        mensajeError = 'El número de factura ya existe.';
      } else if (errorNumber === 515 || msg.includes('cannot insert the value null')) { // NOT NULL constraint
        codigoError = 'ERROR_CAMPO_REQUERIDO';
        mensajeError = 'Faltan campos requeridos para crear la factura.';
      } else if (errorNumber === 8152) { // String or binary data would be truncated
        codigoError = 'ERROR_LONGITUD_CAMPO';
        mensajeError = 'Uno de los campos excede la longitud máxima permitida.';
      } else if (msg.includes('foreign key') || msg.includes('constraint')) {
        codigoError = 'ERROR_FOREIGN_KEY';
        mensajeError = 'Error de integridad referencial. Verifique que el cliente, vendedor o empresa existan.';
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        codigoError = 'ERROR_DUPLICADO';
        mensajeError = 'El número de factura ya existe.';
      } else if (msg.includes('null') || msg.includes('not null')) {
        codigoError = 'ERROR_CAMPO_REQUERIDO';
        mensajeError = 'Faltan campos requeridos para crear la factura.';
      } else if (msg.includes('invalid column') || msg.includes('invalid object')) {
        codigoError = 'ERROR_ESTRUCTURA_DB';
        mensajeError = 'Error en la estructura de la base de datos. Verifique que todas las columnas existan.';
      }
    }

    res.status(500).json({
      success: false,
      error: codigoError,
      mensaje: mensajeError,
      detalles: process.env.NODE_ENV === 'development' ? {
        errorNumber: error.number,
        errorCode: error.code,
        errorState: error.state,
        errorClass: error.class,
        errorProcedure: error.procedure,
        errorLineNumber: error.lineNumber,
        originalMessage: error.message,
        requestBody: req.body
      } : undefined
    });
  }
});

// =============================================
// Endpoint: GET /api/facturas/:id
// =============================================
app.get('/api/facturas/:id', async (req, res) => {
  try {
    const idFactura = parseInt(req.params.id);

    if (isNaN(idFactura)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la factura debe ser un número válido'
      });
    }

    const pool = await getConnection();

    // Obtener información de la factura con cliente y vendedor
    const facturaResult = await pool.request()
      .input('idFactura', sql.Int, idFactura)
      .query(`
        SELECT
          f.IdFactura,
          f.NumeroFactura,
          f.Fecha,
          f.IdCliente,
          f.IdVendedor,
          f.IdEmpresa,
          f.Subtotal,
          f.IVA,
          f.Total,
          f.Estado,
          f.Observaciones,
          f.CUFE,
          f.QRCode,
          f.AmbienteDIAN,
          f.TipoDocumentoElectronico,
          f.EstadoValidacionDIAN,
          c.NombreRazonSocial AS NombreCliente,
          c.NIT AS NITCliente,
          c.Direccion AS DireccionCliente,
          v.CodigoVendedor,
          t.NombreRazonSocial AS NombreVendedor
        FROM Facturas f
        LEFT JOIN Clientes cl ON f.IdCliente = cl.IdCliente
        LEFT JOIN Terceros c ON cl.IdTercero = c.IdTercero
        LEFT JOIN Vendedores v ON f.IdVendedor = v.IdVendedor
        LEFT JOIN Terceros t ON v.IdTercero = t.IdTercero
        WHERE f.IdFactura = @idFactura
      `);

    if (facturaResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'FACTURA_NO_ENCONTRADA',
        mensaje: 'La factura no existe'
      });
    }

    const factura = facturaResult.recordset[0];

    // Obtener detalles de la factura con información de productos
    const detallesResult = await pool.request()
      .input('idFactura', sql.Int, idFactura)
      .query(`
        SELECT
          df.IdDetalleFactura,
          df.IdProducto,
          df.Cantidad,
          df.PrecioUnitario,
          df.Descuento,
          df.IVA,
          df.Subtotal,
          df.Total,
          p.Codigo AS CodigoProducto,
          p.Nombre AS NombreProducto,
          p.Descripcion AS DescripcionProducto,
          p.UnidadMedida
        FROM DetalleFactura df
        INNER JOIN Productos p ON df.IdProducto = p.IdProducto
        WHERE df.IdFactura = @idFactura
        ORDER BY df.IdDetalleFactura
      `);

    const detalles = detallesResult.recordset.map((detalle: any) => ({
      idDetalleFactura: detalle.IdDetalleFactura,
      idProducto: detalle.IdProducto,
      cantidad: parseFloat(detalle.Cantidad),
      precioUnitario: parseFloat(detalle.PrecioUnitario),
      descuento: parseFloat(detalle.Descuento || 0),
      iva: parseFloat(detalle.IVA || 0),
      subtotal: parseFloat(detalle.Subtotal),
      total: parseFloat(detalle.Total),
      producto: {
        idProducto: detalle.IdProducto,
        codigo: detalle.CodigoProducto,
        nombre: detalle.NombreProducto,
        descripcion: detalle.DescripcionProducto,
        unidadMedida: detalle.UnidadMedida
      }
    }));

    // Obtener información de empresa si existe
    let empresaInfo = null;
    if (factura.IdEmpresa) {
      const empresaResult = await pool.request()
        .input('idEmpresa', sql.Int, factura.IdEmpresa)
        .query(`
          SELECT
            IdEmpresa, Nit, NombreRazonSocial, Direccion, Telefono, Email,
            Ciudad, Departamento, RegimenTributario, RepresentanteLegal
          FROM Empresa
          WHERE IdEmpresa = @idEmpresa
        `);
      if (empresaResult.recordset.length > 0) {
        const emp = empresaResult.recordset[0];
        empresaInfo = {
          idEmpresa: emp.IdEmpresa,
          nit: emp.Nit,
          nombreRazonSocial: emp.NombreRazonSocial,
          direccion: emp.Direccion,
          telefono: emp.Telefono,
          email: emp.Email,
          ciudad: emp.Ciudad,
          departamento: emp.Departamento,
          regimenTributario: emp.RegimenTributario,
          representanteLegal: emp.RepresentanteLegal
        };
      }
    }

    // Construir respuesta completa
    const respuesta = {
      idFactura: factura.IdFactura,
      numeroFactura: factura.NumeroFactura,
      fecha: factura.Fecha.toISOString().split('T')[0],
      idCliente: factura.IdCliente,
      idVendedor: factura.IdVendedor || null,
      codigoVendedor: factura.CodigoVendedor || null,
      nombreVendedor: factura.NombreVendedor || null,
      subtotal: parseFloat(factura.Subtotal),
      iva: parseFloat(factura.IVA || 0),
      total: parseFloat(factura.Total),
      estado: factura.Estado,
      observaciones: factura.Observaciones || null,
      cufe: factura.CUFE || null,
      qrCode: factura.QRCode || null,
      ambienteDIAN: factura.AmbienteDIAN || null,
      tipoDocumentoElectronico: factura.TipoDocumentoElectronico || null,
      estadoValidacionDIAN: factura.EstadoValidacionDIAN || null,
      cliente: {
        idTercero: factura.IdCliente,
        nit: factura.NITCliente,
        nombreRazonSocial: factura.NombreCliente,
        direccion: factura.DireccionCliente
      },
      empresa: empresaInfo,
      detalles: detalles
    };

    res.json(respuesta);
  } catch (error: any) {
    console.error('Error al obtener factura:', error);
    return handleDBError(error, res, 'Error al obtener la factura');
  }
});

// =============================================
// Endpoints: GET /api/cotizaciones
// =============================================
app.get('/api/cotizaciones', async (req, res) => {
  try {
    const { estado, fechaDesde, fechaHasta, idCliente } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        c.IdCotizacion,
        c.NumeroCotizacion,
        c.Fecha,
        c.FechaVencimiento,
        c.IdCliente,
        c.IdVendedor,
        c.Subtotal,
        c.IVA,
        c.Total,
        c.Estado,
        c.Observaciones,
        c.IdFacturaGenerada,
        cl.NombreRazonSocial AS NombreCliente,
        cl.NIT AS NITCliente,
        v.CodigoVendedor,
        t.NombreRazonSocial AS NombreVendedor
      FROM Cotizaciones c
      LEFT JOIN Clientes cli ON c.IdCliente = cli.IdCliente
      LEFT JOIN Terceros cl ON cli.IdTercero = cl.IdTercero
      LEFT JOIN Vendedores v ON c.IdVendedor = v.IdVendedor
      LEFT JOIN Terceros t ON v.IdTercero = t.IdTercero
      WHERE 1=1
    `;

    const request = pool.request();

    if (estado) {
      query += ' AND c.Estado = @estado';
      request.input('estado', sql.VarChar(20), estado);
    }
    if (fechaDesde) {
      query += ' AND c.Fecha >= @fechaDesde';
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND c.Fecha <= @fechaHasta';
      request.input('fechaHasta', sql.Date, fechaHasta);
    }
    if (idCliente) {
      query += ' AND c.IdCliente = @idCliente';
      request.input('idCliente', sql.Int, parseInt(idCliente as string));
    }

    query += ' ORDER BY c.Fecha DESC, c.NumeroCotizacion DESC';

    const result = await request.query(query);

    const cotizaciones = result.recordset.map((cot: any) => ({
      idCotizacion: cot.IdCotizacion,
      numeroCotizacion: cot.NumeroCotizacion,
      fecha: cot.Fecha.toISOString().split('T')[0],
      fechaVencimiento: cot.FechaVencimiento ? cot.FechaVencimiento.toISOString().split('T')[0] : null,
      idCliente: cot.IdCliente,
      idVendedor: cot.IdVendedor || null,
      subtotal: parseFloat(cot.Subtotal),
      iva: parseFloat(cot.IVA || 0),
      total: parseFloat(cot.Total),
      estado: cot.Estado,
      observaciones: cot.Observaciones || null,
      idFacturaGenerada: cot.IdFacturaGenerada || null,
      cliente: {
        idTercero: cot.IdCliente,
        nit: cot.NITCliente,
        nombreRazonSocial: cot.NombreCliente
      },
      vendedor: cot.IdVendedor ? {
        codigoVendedor: cot.CodigoVendedor,
        nombreRazonSocial: cot.NombreVendedor
      } : null
    }));

    res.json(cotizaciones);
  } catch (error: any) {
    console.error('Error al obtener cotizaciones:', error);
    return handleDBError(error, res, 'Error al obtener las cotizaciones');
  }
});

// =============================================
// Endpoint: GET /api/cotizaciones/:id
// =============================================
app.get('/api/cotizaciones/:id', async (req, res) => {
  try {
    const idCotizacion = parseInt(req.params.id);

    if (isNaN(idCotizacion)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la cotización debe ser un número válido'
      });
    }

    const pool = await getConnection();

    // Obtener información de la cotización
    const cotizacionResult = await pool.request()
      .input('idCotizacion', sql.Int, idCotizacion)
      .query(`
        SELECT
          c.IdCotizacion,
          c.NumeroCotizacion,
          c.Fecha,
          c.FechaVencimiento,
          c.IdCliente,
          c.IdVendedor,
          c.IdEmpresa,
          c.Subtotal,
          c.IVA,
          c.Total,
          c.Estado,
          c.Observaciones,
          c.IdFacturaGenerada,
          cl.NombreRazonSocial AS NombreCliente,
          cl.NIT AS NITCliente,
          cl.Direccion AS DireccionCliente,
          v.CodigoVendedor,
          t.NombreRazonSocial AS NombreVendedor,
          e.Nit AS EmpresaNit,
          e.NombreRazonSocial AS EmpresaNombre,
          e.Direccion AS EmpresaDireccion,
          e.Telefono AS EmpresaTelefono,
          e.Email AS EmpresaEmail,
          e.Ciudad AS EmpresaCiudad,
          e.Departamento AS EmpresaDepartamento,
          e.RegimenTributario AS EmpresaRegimenTributario
        FROM Cotizaciones c
        LEFT JOIN Clientes cli ON c.IdCliente = cli.IdCliente
        LEFT JOIN Terceros cl ON cli.IdTercero = cl.IdTercero
        LEFT JOIN Vendedores v ON c.IdVendedor = v.IdVendedor
        LEFT JOIN Terceros t ON v.IdTercero = t.IdTercero
        LEFT JOIN Empresa e ON c.IdEmpresa = e.IdEmpresa
        WHERE c.IdCotizacion = @idCotizacion
      `);

    if (cotizacionResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COTIZACION_NO_ENCONTRADA',
        mensaje: 'La cotización no existe'
      });
    }

    const cotizacion = cotizacionResult.recordset[0];

    // Obtener detalles
    const detallesResult = await pool.request()
      .input('idCotizacion', sql.Int, idCotizacion)
      .query(`
        SELECT
          dc.IdDetalleCotizacion,
          dc.IdProducto,
          dc.Cantidad,
          dc.PrecioUnitario,
          dc.Descuento,
          dc.IVA,
          dc.Subtotal,
          dc.Total,
          p.Codigo AS CodigoProducto,
          p.Nombre AS NombreProducto,
          p.Descripcion AS DescripcionProducto
        FROM DetalleCotizacion dc
        INNER JOIN Productos p ON dc.IdProducto = p.IdProducto
        WHERE dc.IdCotizacion = @idCotizacion
        ORDER BY dc.IdDetalleCotizacion
      `);

    const detalles = detallesResult.recordset.map((detalle: any) => ({
      idDetalleCotizacion: detalle.IdDetalleCotizacion,
      idProducto: detalle.IdProducto,
      cantidad: parseFloat(detalle.Cantidad),
      precioUnitario: parseFloat(detalle.PrecioUnitario),
      descuento: parseFloat(detalle.Descuento || 0),
      iva: parseFloat(detalle.IVA || 0),
      subtotal: parseFloat(detalle.Subtotal),
      total: parseFloat(detalle.Total),
      producto: {
        idProducto: detalle.IdProducto,
        codigo: detalle.CodigoProducto,
        nombre: detalle.NombreProducto,
        descripcion: detalle.DescripcionProducto
      }
    }));

    const respuesta = {
      idCotizacion: cotizacion.IdCotizacion,
      numeroCotizacion: cotizacion.NumeroCotizacion,
      fecha: cotizacion.Fecha.toISOString().split('T')[0],
      fechaVencimiento: cotizacion.FechaVencimiento ? cotizacion.FechaVencimiento.toISOString().split('T')[0] : null,
      idCliente: cotizacion.IdCliente,
      idVendedor: cotizacion.IdVendedor || null,
      codigoVendedor: cotizacion.CodigoVendedor || null,
      nombreVendedor: cotizacion.NombreVendedor || null,
      subtotal: parseFloat(cotizacion.Subtotal),
      iva: parseFloat(cotizacion.IVA || 0),
      total: parseFloat(cotizacion.Total),
      estado: cotizacion.Estado,
      observaciones: cotizacion.Observaciones || null,
      idFacturaGenerada: cotizacion.IdFacturaGenerada || null,
      cliente: {
        idTercero: cotizacion.IdCliente,
        nit: cotizacion.NITCliente,
        nombreRazonSocial: cotizacion.NombreCliente,
        direccion: cotizacion.DireccionCliente
      },
      empresa: cotizacion.IdEmpresa ? {
        idEmpresa: cotizacion.IdEmpresa,
        nit: cotizacion.EmpresaNit,
        nombreRazonSocial: cotizacion.EmpresaNombre,
        direccion: cotizacion.EmpresaDireccion,
        telefono: cotizacion.EmpresaTelefono,
        email: cotizacion.EmpresaEmail,
        ciudad: cotizacion.EmpresaCiudad,
        departamento: cotizacion.EmpresaDepartamento,
        regimenTributario: cotizacion.EmpresaRegimenTributario
      } : null,
      detalles: detalles
    };

    res.json(respuesta);
  } catch (error: any) {
    console.error('Error al obtener cotización:', error);
    return handleDBError(error, res, 'Error al obtener la cotización');
  }
});

// Función para generar número de cotización automático
async function generarNumeroCotizacion(pool: sql.ConnectionPool, fecha: string): Promise<string> {
  const año = new Date(fecha).getFullYear();
  const prefijo = `COT-${año}-`;

  const result = await pool.request()
    .input('prefijo', sql.VarChar(20), prefijo + '%')
    .query(`
      SELECT TOP 1 NumeroCotizacion
      FROM Cotizaciones
      WHERE NumeroCotizacion LIKE @prefijo
      ORDER BY NumeroCotizacion DESC
    `);

  let siguienteNumero = 1;
  if (result.recordset.length > 0) {
    const ultimoNumero = result.recordset[0].NumeroCotizacion;
    const numeroStr = ultimoNumero.split('-')[2];
    siguienteNumero = parseInt(numeroStr) + 1;
  }

  return `${prefijo}${siguienteNumero.toString().padStart(4, '0')}`;
}

// =============================================
// Endpoint: POST /api/cotizaciones
// =============================================
app.post('/api/cotizaciones', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      numeroCotizacion,
      fecha,
      fechaVencimiento,
      idCliente,
      idVendedor,
      observaciones,
      estado,
      detalles,
      idUsuarioCreacion
    } = req.body;

    if (!fecha || !idCliente || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Fecha, cliente y al menos un detalle son requeridos'
      });
    }

    const pool = await getConnection();

    // Generar número de cotización si no se proporciona
    let numeroFinal = numeroCotizacion;
    if (!numeroFinal || numeroFinal.trim() === '') {
      numeroFinal = await generarNumeroCotizacion(pool, fecha);
    }

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;

    for (const det of detalles) {
      const subtotalDetalle = (det.cantidad * det.precioUnitario) - (det.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((det.iva || 0) / 100);
      subtotal += subtotalDetalle;
      ivaTotal += ivaDetalle;
    }

    const total = subtotal + ivaTotal;

    // Obtener IdEmpresa del usuario
    const usuario = await transaction.request()
      .input('idUsuario', sql.Int, idUsuarioCreacion || 1)
      .query('SELECT IdEmpresa FROM Usuarios WHERE IdUsuario = @idUsuario');

    const idEmpresa = usuario.recordset[0]?.IdEmpresa || null;

    // Insertar cotización
    const cotizacionResult = await transaction.request()
      .input('numeroCotizacion', sql.VarChar(20), numeroFinal)
      .input('fecha', sql.Date, fecha)
      .input('fechaVencimiento', sql.Date, fechaVencimiento || null)
      .input('idCliente', sql.Int, idCliente)
      .input('idVendedor', sql.Int, idVendedor || null)
      .input('idEmpresa', sql.Int, idEmpresa)
      .input('subtotal', sql.Decimal(18, 2), subtotal)
      .input('iva', sql.Decimal(18, 2), ivaTotal)
      .input('total', sql.Decimal(18, 2), total)
      .input('estado', sql.VarChar(20), estado || 'Borrador')
      .input('observaciones', sql.VarChar(500), observaciones || null)
      .input('idUsuarioCreacion', sql.Int, idUsuarioCreacion || 1)
      .query(`
        INSERT INTO Cotizaciones
          (NumeroCotizacion, Fecha, FechaVencimiento, IdCliente, IdVendedor, IdEmpresa,
           Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion)
        OUTPUT INSERTED.IdCotizacion
        VALUES
          (@numeroCotizacion, @fecha, @fechaVencimiento, @idCliente, @idVendedor, @idEmpresa,
           @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion)
      `);

    const idCotizacion = cotizacionResult.recordset[0].IdCotizacion;

    // Insertar detalles
    for (const detalle of detalles) {
      const subtotalDetalle = (detalle.cantidad * detalle.precioUnitario) - (detalle.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((detalle.iva || 0) / 100);
      const totalDetalle = subtotalDetalle + ivaDetalle;

      await transaction.request()
        .input('idCotizacion', sql.Int, idCotizacion)
        .input('idProducto', sql.Int, detalle.idProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), detalle.precioUnitario)
        .input('descuento', sql.Decimal(18, 2), detalle.descuento || 0)
        .input('iva', sql.Decimal(5, 2), detalle.iva || 0)
        .input('subtotal', sql.Decimal(18, 2), subtotalDetalle)
        .input('total', sql.Decimal(18, 2), totalDetalle)
        .query(`
          INSERT INTO DetalleCotizacion
            (IdCotizacion, IdProducto, Cantidad, PrecioUnitario, Descuento, IVA, Subtotal, Total)
          VALUES
            (@idCotizacion, @idProducto, @cantidad, @precioUnitario, @descuento, @iva, @subtotal, @total)
        `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      idCotizacion,
      numeroCotizacion: numeroFinal,
      mensaje: 'Cotización creada exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear cotización:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la cotización',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// =============================================
// Endpoint: POST /api/cotizaciones/:id/convertir-factura
// =============================================
app.post('/api/cotizaciones/:id/convertir-factura', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const idCotizacion = parseInt(req.params.id);
    const { fecha, estado } = req.body;

    if (isNaN(idCotizacion)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la cotización debe ser un número válido'
      });
    }

    // Obtener cotización
    const cotizacionResult = await transaction.request()
      .input('idCotizacion', sql.Int, idCotizacion)
      .query(`
        SELECT
          c.*,
          cli.IdTercero
        FROM Cotizaciones c
        INNER JOIN Clientes cli ON c.IdCliente = cli.IdCliente
        WHERE c.IdCotizacion = @idCotizacion
          AND c.Estado != 'Convertida'
      `);

    if (cotizacionResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'COTIZACION_NO_ENCONTRADA',
        mensaje: 'La cotización no existe o ya fue convertida'
      });
    }

    const cotizacion = cotizacionResult.recordset[0];

    // Obtener detalles
    const detallesResult = await transaction.request()
      .input('idCotizacion', sql.Int, idCotizacion)
      .query('SELECT * FROM DetalleCotizacion WHERE IdCotizacion = @idCotizacion');

    const detalles = detallesResult.recordset;

    // Generar número de factura
    const pool = await getConnection();
    const año = new Date(fecha || cotizacion.Fecha).getFullYear();
    const prefijo = `FAC-${año}-`;

    const ultimaFactura = await pool.request()
      .input('prefijo', sql.VarChar(20), prefijo + '%')
      .query(`
        SELECT TOP 1 NumeroFactura
        FROM Facturas
        WHERE NumeroFactura LIKE @prefijo
        ORDER BY NumeroFactura DESC
      `);

    let siguienteNumero = 1;
    if (ultimaFactura.recordset.length > 0) {
      const numeroStr = ultimaFactura.recordset[0].NumeroFactura.split('-')[2];
      siguienteNumero = parseInt(numeroStr) + 1;
    }

    const numeroFactura = `${prefijo}${siguienteNumero.toString().padStart(4, '0')}`;

    // Crear factura
    const facturaResult = await transaction.request()
      .input('numeroFactura', sql.VarChar(20), numeroFactura)
      .input('fecha', sql.Date, fecha || cotizacion.Fecha)
      .input('idCliente', sql.Int, cotizacion.IdCliente)
      .input('idVendedor', sql.Int, cotizacion.IdVendedor || null)
      .input('idEmpresa', sql.Int, cotizacion.IdEmpresa || null)
      .input('subtotal', sql.Decimal(18, 2), cotizacion.Subtotal)
      .input('iva', sql.Decimal(18, 2), cotizacion.IVA)
      .input('total', sql.Decimal(18, 2), cotizacion.Total)
      .input('estado', sql.VarChar(20), estado || 'Emitida')
      .input('observaciones', sql.VarChar(500), cotizacion.Observaciones || null)
      .input('idUsuarioCreacion', sql.Int, cotizacion.IdUsuarioCreacion)
      .query(`
        INSERT INTO Facturas
          (NumeroFactura, Fecha, IdCliente, IdVendedor, IdEmpresa, Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion)
        OUTPUT INSERTED.IdFactura
        VALUES
          (@numeroFactura, @fecha, @idCliente, @idVendedor, @idEmpresa, @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion)
      `);

    const idFactura = facturaResult.recordset[0].IdFactura;

    // Crear detalles de factura
    for (const detalle of detalles) {
      await transaction.request()
        .input('idFactura', sql.Int, idFactura)
        .input('idProducto', sql.Int, detalle.IdProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.Cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), detalle.PrecioUnitario)
        .input('descuento', sql.Decimal(18, 2), detalle.Descuento)
        .input('iva', sql.Decimal(5, 2), detalle.IVA)
        .input('subtotal', sql.Decimal(18, 2), detalle.Subtotal)
        .input('total', sql.Decimal(18, 2), detalle.Total)
        .query(`
          INSERT INTO DetalleFactura
            (IdFactura, IdProducto, Cantidad, PrecioUnitario, Descuento, IVA, Subtotal, Total)
          VALUES
            (@idFactura, @idProducto, @cantidad, @precioUnitario, @descuento, @iva, @subtotal, @total)
        `);
    }

    // Actualizar cotización como convertida
    await transaction.request()
      .input('idCotizacion', sql.Int, idCotizacion)
      .input('idFactura', sql.Int, idFactura)
      .query(`
        UPDATE Cotizaciones
        SET Estado = 'Convertida',
            IdFacturaGenerada = @idFactura,
            FechaModificacion = GETDATE()
        WHERE IdCotizacion = @idCotizacion
      `);

    // Si la factura está emitida, generar asiento contable
    if ((estado || 'Emitida') === 'Emitida') {
      const clienteResult = await pool.request()
        .input('idCliente', sql.Int, cotizacion.IdCliente)
        .query('SELECT NombreRazonSocial FROM Terceros WHERE IdTercero = (SELECT IdTercero FROM Clientes WHERE IdCliente = @idCliente)');

      const nombreCliente = clienteResult.recordset[0]?.NombreRazonSocial || 'Cliente';

      const movimientos = [
        {
          codigoCuenta: '130505',
          idTercero: cotizacion.IdCliente,
          valorDebito: cotizacion.Total,
          valorCredito: 0
        },
        {
          codigoCuenta: '413500',
          valorDebito: 0,
          valorCredito: cotizacion.Subtotal
        },
        {
          codigoCuenta: '240805',
          valorDebito: 0,
          valorCredito: cotizacion.IVA
        }
      ];

      await crearAsientoAutomatico(pool, {
        fecha: fecha || cotizacion.Fecha,
        descripcion: `Factura ${numeroFactura} desde Cotización ${cotizacion.NumeroCotizacion} - ${nombreCliente}`,
        movimientos,
        idUsuarioCreacion: cotizacion.IdUsuarioCreacion,
        referencia: idFactura.toString(),
        tipoReferencia: 'Factura'
      });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      idFactura,
      numeroFactura,
      idCotizacion,
      mensaje: 'Cotización convertida a factura exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al convertir cotización a factura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al convertir la cotización',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// =============================================
// Endpoints: GET /api/ordenes-compra
// =============================================
app.get('/api/ordenes-compra', async (req, res) => {
  try {
    const { estado, fechaDesde, fechaHasta, idProveedor } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        oc.IdOrdenCompra,
        oc.NumeroOrden,
        oc.Fecha,
        oc.FechaEntregaEsperada,
        oc.IdProveedor,
        oc.Subtotal,
        oc.IVA,
        oc.Total,
        oc.Estado,
        oc.Observaciones,
        oc.IdCompraGenerada,
        p.NombreRazonSocial AS NombreProveedor,
        p.NIT AS NITProveedor
      FROM OrdenesCompra oc
      LEFT JOIN Proveedores prov ON oc.IdProveedor = prov.IdProveedor
      LEFT JOIN Terceros p ON prov.IdTercero = p.IdTercero
      WHERE 1=1
    `;

    const request = pool.request();

    if (estado) {
      query += ' AND oc.Estado = @estado';
      request.input('estado', sql.VarChar(20), estado);
    }
    if (fechaDesde) {
      query += ' AND oc.Fecha >= @fechaDesde';
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND oc.Fecha <= @fechaHasta';
      request.input('fechaHasta', sql.Date, fechaHasta);
    }
    if (idProveedor) {
      query += ' AND oc.IdProveedor = @idProveedor';
      request.input('idProveedor', sql.Int, parseInt(idProveedor as string));
    }

    query += ' ORDER BY oc.Fecha DESC, oc.NumeroOrden DESC';

    const result = await request.query(query);

    const ordenes = result.recordset.map((ord: any) => ({
      idOrdenCompra: ord.IdOrdenCompra,
      numeroOrden: ord.NumeroOrden,
      fecha: ord.Fecha.toISOString().split('T')[0],
      fechaEntregaEsperada: ord.FechaEntregaEsperada ? ord.FechaEntregaEsperada.toISOString().split('T')[0] : null,
      idProveedor: ord.IdProveedor,
      subtotal: parseFloat(ord.Subtotal),
      iva: parseFloat(ord.IVA || 0),
      total: parseFloat(ord.Total),
      estado: ord.Estado,
      observaciones: ord.Observaciones || null,
      idCompraGenerada: ord.IdCompraGenerada || null,
      proveedor: {
        idTercero: ord.IdProveedor,
        nit: ord.NITProveedor,
        nombreRazonSocial: ord.NombreProveedor
      }
    }));

    res.json(ordenes);
  } catch (error: any) {
    console.error('Error al obtener órdenes de compra:', error);
    return handleDBError(error, res, 'Error al obtener las órdenes de compra');
  }
});

// =============================================
// Endpoint: GET /api/ordenes-compra/:id
// =============================================
app.get('/api/ordenes-compra/:id', async (req, res) => {
  try {
    const idOrdenCompra = parseInt(req.params.id);

    if (isNaN(idOrdenCompra)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la orden debe ser un número válido'
      });
    }

    const pool = await getConnection();

    const ordenResult = await pool.request()
      .input('idOrdenCompra', sql.Int, idOrdenCompra)
      .query(`
        SELECT
          oc.IdOrdenCompra,
          oc.NumeroOrden,
          oc.Fecha,
          oc.FechaEntregaEsperada,
          oc.IdProveedor,
          oc.IdEmpresa,
          oc.Subtotal,
          oc.IVA,
          oc.Total,
          oc.Estado,
          oc.Observaciones,
          oc.IdCompraGenerada,
          p.NombreRazonSocial AS NombreProveedor,
          p.NIT AS NITProveedor,
          p.Direccion AS DireccionProveedor,
          e.Nit AS EmpresaNit,
          e.NombreRazonSocial AS EmpresaNombre,
          e.Direccion AS EmpresaDireccion,
          e.Telefono AS EmpresaTelefono,
          e.Email AS EmpresaEmail,
          e.Ciudad AS EmpresaCiudad,
          e.Departamento AS EmpresaDepartamento,
          e.RegimenTributario AS EmpresaRegimenTributario
        FROM OrdenesCompra oc
        LEFT JOIN Proveedores prov ON oc.IdProveedor = prov.IdProveedor
        LEFT JOIN Terceros p ON prov.IdTercero = p.IdTercero
        LEFT JOIN Empresa e ON oc.IdEmpresa = e.IdEmpresa
        WHERE oc.IdOrdenCompra = @idOrdenCompra
      `);

    if (ordenResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ORDEN_NO_ENCONTRADA',
        mensaje: 'La orden de compra no existe'
      });
    }

    const orden = ordenResult.recordset[0];

    const detallesResult = await pool.request()
      .input('idOrdenCompra', sql.Int, idOrdenCompra)
      .query(`
        SELECT
          doc.IdDetalleOrdenCompra,
          doc.IdProducto,
          doc.Cantidad,
          doc.PrecioUnitario,
          doc.Descuento,
          doc.IVA,
          doc.Subtotal,
          doc.Total,
          p.Codigo AS CodigoProducto,
          p.Nombre AS NombreProducto,
          p.Descripcion AS DescripcionProducto
        FROM DetalleOrdenCompra doc
        INNER JOIN Productos p ON doc.IdProducto = p.IdProducto
        WHERE doc.IdOrdenCompra = @idOrdenCompra
        ORDER BY doc.IdDetalleOrdenCompra
      `);

    const detalles = detallesResult.recordset.map((detalle: any) => ({
      idDetalleOrdenCompra: detalle.IdDetalleOrdenCompra,
      idProducto: detalle.IdProducto,
      cantidad: parseFloat(detalle.Cantidad),
      precioUnitario: parseFloat(detalle.PrecioUnitario),
      descuento: parseFloat(detalle.Descuento || 0),
      iva: parseFloat(detalle.IVA || 0),
      subtotal: parseFloat(detalle.Subtotal),
      total: parseFloat(detalle.Total),
      producto: {
        idProducto: detalle.IdProducto,
        codigo: detalle.CodigoProducto,
        nombre: detalle.NombreProducto,
        descripcion: detalle.DescripcionProducto
      }
    }));

    const respuesta = {
      idOrdenCompra: orden.IdOrdenCompra,
      numeroOrden: orden.NumeroOrden,
      fecha: orden.Fecha.toISOString().split('T')[0],
      fechaEntregaEsperada: orden.FechaEntregaEsperada ? orden.FechaEntregaEsperada.toISOString().split('T')[0] : null,
      idProveedor: orden.IdProveedor,
      subtotal: parseFloat(orden.Subtotal),
      iva: parseFloat(orden.IVA || 0),
      total: parseFloat(orden.Total),
      estado: orden.Estado,
      observaciones: orden.Observaciones || null,
      idCompraGenerada: orden.IdCompraGenerada || null,
      proveedor: {
        idTercero: orden.IdProveedor,
        nit: orden.NITProveedor,
        nombreRazonSocial: orden.NombreProveedor,
        direccion: orden.DireccionProveedor
      },
      empresa: orden.IdEmpresa ? {
        idEmpresa: orden.IdEmpresa,
        nit: orden.EmpresaNit,
        nombreRazonSocial: orden.EmpresaNombre,
        direccion: orden.EmpresaDireccion,
        telefono: orden.EmpresaTelefono,
        email: orden.EmpresaEmail,
        ciudad: orden.EmpresaCiudad,
        departamento: orden.EmpresaDepartamento,
        regimenTributario: orden.EmpresaRegimenTributario
      } : null,
      detalles: detalles
    };

    res.json(respuesta);
  } catch (error: any) {
    console.error('Error al obtener orden de compra:', error);
    return handleDBError(error, res, 'Error al obtener la orden de compra');
  }
});

// Función para generar número de orden de compra automático
async function generarNumeroOrdenCompra(pool: sql.ConnectionPool, fecha: string): Promise<string> {
  const año = new Date(fecha).getFullYear();
  const prefijo = `OC-${año}-`;

  const result = await pool.request()
    .input('prefijo', sql.VarChar(20), prefijo + '%')
    .query(`
      SELECT TOP 1 NumeroOrden
      FROM OrdenesCompra
      WHERE NumeroOrden LIKE @prefijo
      ORDER BY NumeroOrden DESC
    `);

  let siguienteNumero = 1;
  if (result.recordset.length > 0) {
    const ultimoNumero = result.recordset[0].NumeroOrden;
    const numeroStr = ultimoNumero.split('-')[2];
    siguienteNumero = parseInt(numeroStr) + 1;
  }

  return `${prefijo}${siguienteNumero.toString().padStart(4, '0')}`;
}

// =============================================
// Endpoint: POST /api/ordenes-compra
// =============================================
app.post('/api/ordenes-compra', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      numeroOrden,
      fecha,
      fechaEntregaEsperada,
      idProveedor,
      observaciones,
      estado,
      detalles,
      idUsuarioCreacion
    } = req.body;

    if (!fecha || !idProveedor || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Fecha, proveedor y al menos un detalle son requeridos'
      });
    }

    const pool = await getConnection();

    // Generar número de orden si no se proporciona
    let numeroFinal = numeroOrden;
    if (!numeroFinal || numeroFinal.trim() === '') {
      numeroFinal = await generarNumeroOrdenCompra(pool, fecha);
    }

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;

    for (const det of detalles) {
      const subtotalDetalle = (det.cantidad * det.precioUnitario) - (det.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((det.iva || 0) / 100);
      subtotal += subtotalDetalle;
      ivaTotal += ivaDetalle;
    }

    const total = subtotal + ivaTotal;

    // Obtener IdEmpresa del usuario
    const usuario = await transaction.request()
      .input('idUsuario', sql.Int, idUsuarioCreacion || 1)
      .query('SELECT IdEmpresa FROM Usuarios WHERE IdUsuario = @idUsuario');

    const idEmpresa = usuario.recordset[0]?.IdEmpresa || null;

    // Insertar orden
    const ordenResult = await transaction.request()
      .input('numeroOrden', sql.VarChar(20), numeroFinal)
      .input('fecha', sql.Date, fecha)
      .input('fechaEntregaEsperada', sql.Date, fechaEntregaEsperada || null)
      .input('idProveedor', sql.Int, idProveedor)
      .input('idEmpresa', sql.Int, idEmpresa)
      .input('subtotal', sql.Decimal(18, 2), subtotal)
      .input('iva', sql.Decimal(18, 2), ivaTotal)
      .input('total', sql.Decimal(18, 2), total)
      .input('estado', sql.VarChar(20), estado || 'Borrador')
      .input('observaciones', sql.VarChar(500), observaciones || null)
      .input('idUsuarioCreacion', sql.Int, idUsuarioCreacion || 1)
      .query(`
        INSERT INTO OrdenesCompra
          (NumeroOrden, Fecha, FechaEntregaEsperada, IdProveedor, IdEmpresa,
           Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion)
        OUTPUT INSERTED.IdOrdenCompra
        VALUES
          (@numeroOrden, @fecha, @fechaEntregaEsperada, @idProveedor, @idEmpresa,
           @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion)
      `);

    const idOrdenCompra = ordenResult.recordset[0].IdOrdenCompra;

    // Insertar detalles
    for (const detalle of detalles) {
      const subtotalDetalle = (detalle.cantidad * detalle.precioUnitario) - (detalle.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((detalle.iva || 0) / 100);
      const totalDetalle = subtotalDetalle + ivaDetalle;

      await transaction.request()
        .input('idOrdenCompra', sql.Int, idOrdenCompra)
        .input('idProducto', sql.Int, detalle.idProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), detalle.precioUnitario)
        .input('descuento', sql.Decimal(18, 2), detalle.descuento || 0)
        .input('iva', sql.Decimal(5, 2), detalle.iva || 0)
        .input('subtotal', sql.Decimal(18, 2), subtotalDetalle)
        .input('total', sql.Decimal(18, 2), totalDetalle)
        .query(`
          INSERT INTO DetalleOrdenCompra
            (IdOrdenCompra, IdProducto, Cantidad, PrecioUnitario, Descuento, IVA, Subtotal, Total)
          VALUES
            (@idOrdenCompra, @idProducto, @cantidad, @precioUnitario, @descuento, @iva, @subtotal, @total)
        `);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      idOrdenCompra,
      numeroOrden: numeroFinal,
      mensaje: 'Orden de compra creada exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear orden de compra:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la orden de compra',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// =============================================
// Endpoint: POST /api/ordenes-compra/:id/convertir-compra
// =============================================
app.post('/api/ordenes-compra/:id/convertir-compra', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const idOrdenCompra = parseInt(req.params.id);
    const { fecha, estado } = req.body;

    if (isNaN(idOrdenCompra)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la orden debe ser un número válido'
      });
    }

    // Obtener orden
    const ordenResult = await transaction.request()
      .input('idOrdenCompra', sql.Int, idOrdenCompra)
      .query(`
        SELECT
          oc.*,
          prov.IdTercero
        FROM OrdenesCompra oc
        INNER JOIN Proveedores prov ON oc.IdProveedor = prov.IdProveedor
        WHERE oc.IdOrdenCompra = @idOrdenCompra
          AND oc.Estado != 'Convertida'
      `);

    if (ordenResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'ORDEN_NO_ENCONTRADA',
        mensaje: 'La orden no existe o ya fue convertida'
      });
    }

    const orden = ordenResult.recordset[0];

    // Obtener detalles
    const detallesResult = await transaction.request()
      .input('idOrdenCompra', sql.Int, idOrdenCompra)
      .query('SELECT * FROM DetalleOrdenCompra WHERE IdOrdenCompra = @idOrdenCompra');

    const detalles = detallesResult.recordset;

    // Generar número de compra
    const pool = await getConnection();
    const año = new Date(fecha || orden.Fecha).getFullYear();
    const prefijo = `COMP-${año}-`;

    const ultimaCompra = await pool.request()
      .input('prefijo', sql.VarChar(20), prefijo + '%')
      .query(`
        SELECT TOP 1 NumeroFactura
        FROM Compras
        WHERE NumeroFactura LIKE @prefijo
        ORDER BY NumeroFactura DESC
      `);

    let siguienteNumero = 1;
    if (ultimaCompra.recordset.length > 0) {
      const numeroStr = ultimaCompra.recordset[0].NumeroFactura.split('-')[2];
      siguienteNumero = parseInt(numeroStr) + 1;
    }

    const numeroCompra = `${prefijo}${siguienteNumero.toString().padStart(4, '0')}`;

    // Crear compra
    const compraResult = await transaction.request()
      .input('numeroFactura', sql.VarChar(20), numeroCompra)
      .input('fecha', sql.Date, fecha || orden.Fecha)
      .input('idProveedor', sql.Int, orden.IdProveedor)
      .input('idEmpresa', sql.Int, orden.IdEmpresa || null)
      .input('subtotal', sql.Decimal(18, 2), orden.Subtotal)
      .input('iva', sql.Decimal(18, 2), orden.IVA)
      .input('total', sql.Decimal(18, 2), orden.Total)
      .input('estado', sql.VarChar(20), estado || 'Recibida')
      .input('observaciones', sql.VarChar(500), orden.Observaciones || null)
      .input('idUsuarioCreacion', sql.Int, orden.IdUsuarioCreacion)
      .query(`
        INSERT INTO Compras
          (NumeroFactura, Fecha, IdProveedor, IdEmpresa, Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion)
        OUTPUT INSERTED.IdCompra
        VALUES
          (@numeroFactura, @fecha, @idProveedor, @idEmpresa, @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion)
      `);

    const idCompra = compraResult.recordset[0].IdCompra;

    // Crear detalles de compra
    for (const detalle of detalles) {
      await transaction.request()
        .input('idCompra', sql.Int, idCompra)
        .input('idProducto', sql.Int, detalle.IdProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.Cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), detalle.PrecioUnitario)
        .input('descuento', sql.Decimal(18, 2), detalle.Descuento)
        .input('iva', sql.Decimal(5, 2), detalle.IVA)
        .input('subtotal', sql.Decimal(18, 2), detalle.Subtotal)
        .input('total', sql.Decimal(18, 2), detalle.Total)
        .query(`
          INSERT INTO DetalleCompra
            (IdCompra, IdProducto, Cantidad, PrecioUnitario, Descuento, IVA, Subtotal, Total)
          VALUES
            (@idCompra, @idProducto, @cantidad, @precioUnitario, @descuento, @iva, @subtotal, @total)
        `);
    }

    // Actualizar orden como convertida
    await transaction.request()
      .input('idOrdenCompra', sql.Int, idOrdenCompra)
      .input('idCompra', sql.Int, idCompra)
      .query(`
        UPDATE OrdenesCompra
        SET Estado = 'Convertida',
            IdCompraGenerada = @idCompra,
            FechaModificacion = GETDATE()
        WHERE IdOrdenCompra = @idOrdenCompra
      `);

    // Si la compra está recibida, generar asiento contable
    if ((estado || 'Recibida') === 'Recibida') {
      const proveedorResult = await pool.request()
        .input('idProveedor', sql.Int, orden.IdProveedor)
        .query('SELECT NombreRazonSocial FROM Terceros WHERE IdTercero = (SELECT IdTercero FROM Proveedores WHERE IdProveedor = @idProveedor)');

      const nombreProveedor = proveedorResult.recordset[0]?.NombreRazonSocial || 'Proveedor';

      const movimientos = [
        {
          codigoCuenta: '143505',
          valorDebito: orden.Subtotal,
          valorCredito: 0
        },
        {
          codigoCuenta: '240805',
          valorDebito: orden.IVA,
          valorCredito: 0
        },
        {
          codigoCuenta: '220505',
          idTercero: orden.IdProveedor,
          valorDebito: 0,
          valorCredito: orden.Total
        }
      ];

      await crearAsientoAutomatico(pool, {
        fecha: fecha || orden.Fecha,
        descripcion: `Compra ${numeroCompra} desde Orden ${orden.NumeroOrden} - ${nombreProveedor}`,
        movimientos,
        idUsuarioCreacion: orden.IdUsuarioCreacion,
        referencia: idCompra.toString(),
        tipoReferencia: 'Compra'
      });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      idCompra,
      numeroCompra,
      idOrdenCompra,
      mensaje: 'Orden de compra convertida a compra exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al convertir orden a compra:', error);
    res.status(500).json({
      success: false,
      error: 'Error al convertir la orden',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Función para generar número de compra automático
async function generarNumeroCompra(pool: sql.ConnectionPool, fecha: string): Promise<string> {
  const año = new Date(fecha).getFullYear();
  const prefijo = `COMP-${año}-`;

  const result = await pool.request()
    .input('prefijo', sql.VarChar(20), prefijo + '%')
    .query(`
      SELECT TOP 1 NumeroFactura
      FROM Compras
      WHERE NumeroFactura LIKE @prefijo
      ORDER BY NumeroFactura DESC
    `);

  let siguienteNumero = 1;
  if (result.recordset.length > 0) {
    const ultimoNumero = result.recordset[0].NumeroFactura;
    const numeroStr = ultimoNumero.split('-')[2];
    siguienteNumero = parseInt(numeroStr) + 1;
  }

  return `${prefijo}${siguienteNumero.toString().padStart(4, '0')}`;
}

// =============================================
// Endpoint: GET /api/compras
// =============================================
app.get('/api/compras', async (req, res) => {
  try {
    const { estado, fechaDesde, fechaHasta, idProveedor } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        c.IdCompra,
        c.NumeroFactura,
        c.Fecha,
        c.IdProveedor,
        c.Subtotal,
        c.IVA,
        c.Total,
        c.Estado,
        c.Observaciones,
        p.NombreRazonSocial AS NombreProveedor,
        p.NIT AS NITProveedor
      FROM Compras c
      LEFT JOIN Proveedores prov ON c.IdProveedor = prov.IdProveedor
      LEFT JOIN Terceros p ON prov.IdTercero = p.IdTercero
      WHERE 1=1
    `;

    const request = pool.request();

    if (estado) {
      query += ' AND c.Estado = @estado';
      request.input('estado', sql.VarChar(20), estado);
    }
    if (fechaDesde) {
      query += ' AND c.Fecha >= @fechaDesde';
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND c.Fecha <= @fechaHasta';
      request.input('fechaHasta', sql.Date, fechaHasta);
    }
    if (idProveedor) {
      query += ' AND c.IdProveedor = @idProveedor';
      request.input('idProveedor', sql.Int, parseInt(idProveedor as string));
    }

    query += ' ORDER BY c.Fecha DESC, c.NumeroFactura DESC';

    const result = await request.query(query);

    const compras = result.recordset.map((comp: any) => ({
      idCompra: comp.IdCompra,
      numeroFactura: comp.NumeroFactura,
      fecha: comp.Fecha.toISOString().split('T')[0],
      idProveedor: comp.IdProveedor,
      subtotal: parseFloat(comp.Subtotal),
      iva: parseFloat(comp.IVA || 0),
      total: parseFloat(comp.Total),
      estado: comp.Estado,
      observaciones: comp.Observaciones || null,
      proveedor: {
        idProveedor: comp.IdProveedor,
        nit: comp.NITProveedor,
        nombreRazonSocial: comp.NombreProveedor
      }
    }));

    res.json(compras);
  } catch (error: any) {
    console.error('Error al obtener compras:', error);
    return handleDBError(error, res, 'Error al obtener las compras');
  }
});

// =============================================
// Endpoint: GET /api/compras/:id
// =============================================
app.get('/api/compras/:id', async (req, res) => {
  try {
    const idCompra = parseInt(req.params.id);

    if (isNaN(idCompra)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la compra debe ser un número válido'
      });
    }

    const pool = await getConnection();

    // Obtener información de la compra con proveedor
    const compraResult = await pool.request()
      .input('idCompra', sql.Int, idCompra)
      .query(`
        SELECT
          c.IdCompra,
          c.NumeroFactura,
          c.Fecha,
          c.IdProveedor,
          c.IdEmpresa,
          c.Subtotal,
          c.IVA,
          c.Total,
          c.Estado,
          c.Observaciones,
          p.NombreRazonSocial AS NombreProveedor,
          p.NIT AS NITProveedor,
          p.Direccion AS DireccionProveedor,
          e.Nit AS EmpresaNit,
          e.NombreRazonSocial AS EmpresaNombre,
          e.Direccion AS EmpresaDireccion,
          e.Telefono AS EmpresaTelefono,
          e.Email AS EmpresaEmail,
          e.Ciudad AS EmpresaCiudad,
          e.Departamento AS EmpresaDepartamento,
          e.RegimenTributario AS EmpresaRegimenTributario
        FROM Compras c
        LEFT JOIN Proveedores prov ON c.IdProveedor = prov.IdProveedor
        LEFT JOIN Terceros p ON prov.IdTercero = p.IdTercero
        LEFT JOIN Empresa e ON c.IdEmpresa = e.IdEmpresa
        WHERE c.IdCompra = @idCompra
      `);

    if (compraResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COMPRA_NO_ENCONTRADA',
        mensaje: 'La compra no existe'
      });
    }

    const compra = compraResult.recordset[0];

    // Obtener detalles de la compra con información de productos
    const detallesResult = await pool.request()
      .input('idCompra', sql.Int, idCompra)
      .query(`
        SELECT
          dc.IdDetalleCompra,
          dc.IdProducto,
          dc.Cantidad,
          dc.PrecioUnitario,
          dc.Descuento,
          dc.IVA,
          dc.Subtotal,
          dc.Total,
          p.Codigo AS CodigoProducto,
          p.Nombre AS NombreProducto,
          p.Descripcion AS DescripcionProducto,
          p.UnidadMedida
        FROM DetalleCompra dc
        INNER JOIN Productos p ON dc.IdProducto = p.IdProducto
        WHERE dc.IdCompra = @idCompra
        ORDER BY dc.IdDetalleCompra
      `);

    const detalles = detallesResult.recordset.map((detalle: any) => ({
      idDetalleCompra: detalle.IdDetalleCompra,
      idProducto: detalle.IdProducto,
      cantidad: parseFloat(detalle.Cantidad),
      precioUnitario: parseFloat(detalle.PrecioUnitario),
      descuento: parseFloat(detalle.Descuento || 0),
      iva: parseFloat(detalle.IVA || 0),
      subtotal: parseFloat(detalle.Subtotal),
      total: parseFloat(detalle.Total),
      producto: {
        idProducto: detalle.IdProducto,
        codigo: detalle.CodigoProducto,
        nombre: detalle.NombreProducto,
        descripcion: detalle.DescripcionProducto,
        unidadMedida: detalle.UnidadMedida
      }
    }));

    // Construir respuesta completa
    const respuesta = {
      idCompra: compra.IdCompra,
      numeroFactura: compra.NumeroFactura,
      fecha: compra.Fecha.toISOString().split('T')[0],
      idProveedor: compra.IdProveedor,
      subtotal: parseFloat(compra.Subtotal),
      iva: parseFloat(compra.IVA || 0),
      total: parseFloat(compra.Total),
      estado: compra.Estado,
      observaciones: compra.Observaciones || null,
      proveedor: {
        idProveedor: compra.IdProveedor,
        nit: compra.NITProveedor,
        nombreRazonSocial: compra.NombreProveedor,
        direccion: compra.DireccionProveedor
      },
      empresa: compra.IdEmpresa ? {
        idEmpresa: compra.IdEmpresa,
        nit: compra.EmpresaNit,
        nombreRazonSocial: compra.EmpresaNombre,
        direccion: compra.EmpresaDireccion,
        telefono: compra.EmpresaTelefono,
        email: compra.EmpresaEmail,
        ciudad: compra.EmpresaCiudad,
        departamento: compra.EmpresaDepartamento,
        regimenTributario: compra.EmpresaRegimenTributario
      } : null,
      detalles: detalles
    };

    res.json(respuesta);
  } catch (error: any) {
    console.error('Error al obtener compra:', error);
    return handleDBError(error, res, 'Error al obtener la compra');
  }
});

// =============================================
// Endpoint: POST /api/compras/scan-pdf
// Escanea una factura de compra en PDF y extrae datos
// =============================================
app.post('/api/compras/scan-pdf', upload.single('pdf'), handleMulterError, async (req: express.Request, res: express.Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'ARCHIVO_REQUERIDO',
      mensaje: 'Debe subir un archivo PDF o imagen'
    });
  }

  try {
    console.log('\n📄 ============================================');
    console.log('📄 PROCESANDO FACTURA PDF/IMAGEN');
    console.log('📄 ============================================');
    console.log('   Archivo:', req.file.originalname);
    console.log('   Tipo MIME:', req.file.mimetype);
    console.log('   Tamaño:', req.file.size, 'bytes');
    console.log('   Ruta temporal:', req.file.path);
    console.log('============================================\n');

    // Validar que el archivo existe
    if (!fs.existsSync(req.file.path)) {
      throw new Error('El archivo temporal no se creó correctamente');
    }

    const fileStats = fs.statSync(req.file.path);
    console.log('📊 Estadísticas del archivo:');
    console.log('   Tamaño real:', fileStats.size, 'bytes');
    console.log('   Creado:', fileStats.birthtime.toISOString());
    console.log('');

    const fileBuffer = fs.readFileSync(req.file.path);

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('El buffer del archivo está vacío');
    }

    console.log('✅ Archivo leído correctamente');
    console.log('   Buffer size:', fileBuffer.length, 'bytes');
    console.log('   Primeros bytes:', fileBuffer.slice(0, 10).toString('hex'));
    console.log('');

    // Extraer datos de la factura (pasar también el tipo MIME)
    console.log('🔍 Iniciando extracción de datos...\n');
    const extractedData = await extractInvoiceData(fileBuffer, req.file.mimetype);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    console.log('\n✅ ============================================');
    console.log('✅ DATOS EXTRAÍDOS EXITOSAMENTE');
    console.log('✅ ============================================');
    console.log('   Número Factura:', extractedData.numeroFactura || 'No encontrado');
    console.log('   Fecha:', extractedData.fecha || 'No encontrada');
    console.log('   NIT Proveedor:', extractedData.nitProveedor || 'No encontrado');
    console.log('   Nombre Proveedor:', extractedData.nombreProveedor || 'No encontrado');
    console.log('   Items encontrados:', extractedData.items.length);
    if (extractedData.items.length > 0) {
      extractedData.items.forEach((item, idx) => {
        console.log(`   Item ${idx + 1}:`, item.descripcion || 'Sin descripción');
        console.log(`      Cantidad: ${item.cantidad}, Precio: $${item.precioUnitario?.toLocaleString('es-CO') || 0}`);
      });
    }
    console.log('   Subtotal:', extractedData.subtotal ? `$${extractedData.subtotal.toLocaleString('es-CO')}` : 'No encontrado');
    console.log('   IVA:', extractedData.iva ? `$${extractedData.iva.toLocaleString('es-CO')}` : 'No encontrado');
    console.log('   Total:', extractedData.total ? `$${extractedData.total.toLocaleString('es-CO')}` : 'No encontrado');
    console.log('   Confianza:', extractedData.confidence.toFixed(2) + '%');
    console.log('============================================\n');

    res.json({
      success: true,
      data: extractedData,
      mensaje: 'Factura procesada exitosamente'
    });
  } catch (error: any) {
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Archivo temporal eliminado');
      } catch (unlinkError) {
        console.warn('⚠️ No se pudo eliminar archivo temporal:', unlinkError);
      }
    }

    // Capturar información detallada del error
    let errorMessage = 'Error al procesar la factura';
    let errorDetails: any = null;

    if (error) {
      if (error.message) {
        errorMessage = error.message;
      } else if (error.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'Error no serializable';
        }
      }

      errorDetails = {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        stack: error.stack
      };
    }

    console.error('\n❌ ============================================');
    console.error('❌ ERROR AL PROCESAR FACTURA');
    console.error('❌ ============================================');
    console.error('   Mensaje:', errorMessage);
    console.error('   Tipo:', error?.name || 'Error');
    console.error('   Código:', (error as any)?.code || 'N/A');
    if (error?.stack) {
      console.error('   Stack:', error.stack);
    }
    console.error('============================================\n');

    res.status(500).json({
      success: false,
      error: 'ERROR_PROCESAMIENTO',
      mensaje: errorMessage,
      detalles: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// =============================================
// Endpoint: POST /api/compras
// =============================================
app.post('/api/compras', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      numeroFactura,
      fecha,
      idProveedor,
      idEmpresa,
      observaciones,
      estado,
      detalles,
      idUsuarioCreacion
    } = req.body;

    if (!fecha || !idProveedor || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Fecha, proveedor y al menos un detalle son requeridos'
      });
    }

    const pool = await getConnection();

    // Validar proveedor
    const proveedorResult = await transaction.request()
      .input('idProveedor', sql.Int, idProveedor)
      .query('SELECT IdProveedor, IdTercero FROM Proveedores WHERE IdProveedor = @idProveedor AND Activo = 1');

    if (proveedorResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'PROVEEDOR_INVALIDO',
        mensaje: 'El proveedor no existe o está inactivo'
      });
    }

    // Validar productos
    for (const detalle of detalles) {
      const productoResult = await transaction.request()
        .input('idProducto', sql.Int, detalle.idProducto)
        .query('SELECT IdProducto, Nombre FROM Productos WHERE IdProducto = @idProducto AND Activo = 1');

      if (productoResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'PRODUCTO_INVALIDO',
          mensaje: `El producto con ID ${detalle.idProducto} no existe o está inactivo`
        });
      }
    }

    // Generar número de compra si no se proporciona
    let numeroFinal = numeroFactura;
    if (!numeroFinal || numeroFinal.trim() === '') {
      numeroFinal = await generarNumeroCompra(pool, fecha);
    }

    // Calcular totales
    let subtotal = 0;
    let ivaTotal = 0;

    for (const det of detalles) {
      const subtotalDetalle = (det.cantidad * det.precioUnitario) - (det.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((det.iva || 0) / 100);
      subtotal += subtotalDetalle;
      ivaTotal += ivaDetalle;
    }

    const total = subtotal + ivaTotal;

    // Obtener IdEmpresa si no se proporciona
    let idEmpresaFinal = idEmpresa;
    if (!idEmpresaFinal) {
      const usuario = await transaction.request()
        .input('idUsuario', sql.Int, idUsuarioCreacion || 1)
        .query('SELECT IdEmpresa FROM Usuarios WHERE IdUsuario = @idUsuario');
      idEmpresaFinal = usuario.recordset[0]?.IdEmpresa || null;
    }

    // Insertar compra
    const compraResult = await transaction.request()
      .input('numeroFactura', sql.VarChar(20), numeroFinal)
      .input('fecha', sql.Date, fecha)
      .input('idProveedor', sql.Int, idProveedor)
      .input('idEmpresa', sql.Int, idEmpresaFinal)
      .input('subtotal', sql.Decimal(18, 2), subtotal)
      .input('iva', sql.Decimal(18, 2), ivaTotal)
      .input('total', sql.Decimal(18, 2), total)
      .input('estado', sql.VarChar(20), estado || 'Borrador')
      .input('observaciones', sql.VarChar(500), observaciones || null)
      .input('idUsuarioCreacion', sql.Int, idUsuarioCreacion || 1)
      .query(`
        INSERT INTO Compras
          (NumeroFactura, Fecha, IdProveedor, IdEmpresa, Subtotal, IVA, Total, Estado, Observaciones, IdUsuarioCreacion)
        OUTPUT INSERTED.IdCompra
        VALUES
          (@numeroFactura, @fecha, @idProveedor, @idEmpresa, @subtotal, @iva, @total, @estado, @observaciones, @idUsuarioCreacion)
      `);

    const idCompra = compraResult.recordset[0].IdCompra;

    // Insertar detalles y actualizar inventario
    for (const detalle of detalles) {
      const subtotalDetalle = (detalle.cantidad * detalle.precioUnitario) - (detalle.descuento || 0);
      const ivaDetalle = subtotalDetalle * ((detalle.iva || 0) / 100);
      const totalDetalle = subtotalDetalle + ivaDetalle;

      await transaction.request()
        .input('idCompra', sql.Int, idCompra)
        .input('idProducto', sql.Int, detalle.idProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), detalle.precioUnitario)
        .input('descuento', sql.Decimal(18, 2), detalle.descuento || 0)
        .input('iva', sql.Decimal(5, 2), detalle.iva || 0)
        .input('subtotal', sql.Decimal(18, 2), subtotalDetalle)
        .input('total', sql.Decimal(18, 2), totalDetalle)
        .query(`
          INSERT INTO DetalleCompra
            (IdCompra, IdProducto, Cantidad, PrecioUnitario, Descuento, IVA, Subtotal, Total)
          VALUES
            (@idCompra, @idProducto, @cantidad, @precioUnitario, @descuento, @iva, @subtotal, @total)
        `);

      // Actualizar inventario (el trigger debería hacerlo, pero lo hacemos explícitamente)
      await transaction.request()
        .input('idProducto', sql.Int, detalle.idProducto)
        .input('cantidad', sql.Decimal(18, 3), detalle.cantidad)
        .query(`
          UPDATE Productos
          SET CantidadStock = CantidadStock + @cantidad,
              FechaModificacion = GETDATE()
          WHERE IdProducto = @idProducto
        `);
    }

    // Si la compra está recibida, generar asiento contable
    let idComprobante: number | null = null;
    if (estado === 'Recibida') {
      const proveedorInfo = await pool.request()
        .input('idProveedor', sql.Int, idProveedor)
        .query('SELECT NombreRazonSocial FROM Terceros WHERE IdTercero = (SELECT IdTercero FROM Proveedores WHERE IdProveedor = @idProveedor)');

      const nombreProveedor = proveedorInfo.recordset[0]?.NombreRazonSocial || 'Proveedor';

      const movimientos = [
        {
          codigoCuenta: '143505',
          valorDebito: subtotal,
          valorCredito: 0
        },
        {
          codigoCuenta: '240805',
          valorDebito: ivaTotal,
          valorCredito: 0
        },
        {
          codigoCuenta: '220505',
          idTercero: idProveedor,
          valorDebito: 0,
          valorCredito: total
        }
      ];

      try {
        idComprobante = await crearAsientoAutomatico(pool, {
          fecha,
          descripcion: `Compra ${numeroFinal} - ${nombreProveedor}`,
          movimientos,
          idUsuarioCreacion: idUsuarioCreacion || 1,
          referencia: idCompra.toString(),
          tipoReferencia: 'Compra'
        });
      } catch (error: any) {
        console.error('Error al crear asiento contable:', error);
        // No revertir la compra si falla el asiento
      }
    }

    await transaction.commit();

    const respuesta: any = {
      success: true,
      idCompra,
      numeroFactura: numeroFinal,
      mensaje: 'Compra creada exitosamente'
    };

    if (idComprobante) {
      respuesta.idComprobante = idComprobante;
    }

    res.status(201).json(respuesta);
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear compra:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la compra',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// =============================================
// Endpoint: PUT /api/compras/:id/estado
// =============================================
app.put('/api/compras/:id/estado', async (req, res) => {
  try {
    const idCompra = parseInt(req.params.id);
    const { estado } = req.body;

    if (isNaN(idCompra)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID de la compra debe ser un número válido'
      });
    }

    if (!estado) {
      return res.status(400).json({
        success: false,
        error: 'ESTADO_REQUERIDO',
        mensaje: 'El estado es requerido'
      });
    }

    const pool = await getConnection();

    // Verificar que la compra existe
    const compraResult = await pool.request()
      .input('idCompra', sql.Int, idCompra)
      .query('SELECT Estado FROM Compras WHERE IdCompra = @idCompra');

    if (compraResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COMPRA_NO_ENCONTRADA',
        mensaje: 'La compra no existe'
      });
    }

    // Actualizar estado
    await pool.request()
      .input('idCompra', sql.Int, idCompra)
      .input('estado', sql.VarChar(20), estado)
      .query('UPDATE Compras SET Estado = @estado, FechaModificacion = GETDATE() WHERE IdCompra = @idCompra');

    res.json({
      success: true,
      mensaje: 'Estado actualizado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al actualizar estado de compra:', error);
    return handleDBError(error, res, 'Error al actualizar el estado de la compra');
  }
});

// =============================================
// Endpoints: Clientes
// =============================================
app.get('/api/clientes', async (req, res) => {
  try {
    const { activo, buscar, ciudad, tipoPersona } = req.query;
    const pool = await getConnection();

    let query = `
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
      WHERE 1=1
    `;

    const request = pool.request();

    if (activo !== undefined) {
      query += ' AND c.Activo = @activo';
      const activoValue = typeof activo === 'string' ? activo === 'true' : Boolean(activo);
      request.input('activo', sql.Bit, activoValue);
    }
    if (buscar) {
      query += ' AND (t.NombreRazonSocial LIKE @buscar OR t.NIT LIKE @buscar OR c.CodigoCliente LIKE @buscar OR c.Email LIKE @buscar)';
      request.input('buscar', sql.VarChar(200), `%${buscar}%`);
    }
    if (ciudad) {
      query += ' AND c.Ciudad = @ciudad';
      request.input('ciudad', sql.VarChar(100), ciudad);
    }
    if (tipoPersona) {
      query += ' AND c.TipoPersona = @tipoPersona';
      request.input('tipoPersona', sql.Char(1), tipoPersona);
    }

    query += ' ORDER BY t.NombreRazonSocial';

    const result = await request.query(query);

    const clientes = result.recordset.map((cli: any) => ({
      idCliente: cli.IdCliente,
      idTercero: cli.IdTercero,
      codigoCliente: cli.CodigoCliente,
      nit: cli.NIT,
      nombreRazonSocial: cli.NombreRazonSocial,
      direccion: cli.Direccion,
      telefono: cli.Telefono,
      celular: cli.Celular,
      email: cli.Email,
      ciudad: cli.Ciudad,
      departamento: cli.Departamento,
      tipoPersona: cli.TipoPersona || null,
      regimenTributario: cli.RegimenTributario,
      condicionPago: cli.CondicionPago,
      limiteCredito: parseFloat(cli.LimiteCredito || 0),
      saldoActual: parseFloat(cli.SaldoActual || 0),
      descuento: parseFloat(cli.Descuento || 0),
      observaciones: cli.Observaciones,
      activo: cli.Activo,
      fechaCreacion: cli.FechaCreacion,
      fechaModificacion: cli.FechaModificacion
    }));

    res.json(clientes);
  } catch (error: any) {
    console.error('Error al obtener clientes:', error);
    return handleDBError(error, res, 'Error al obtener los clientes');
  }
});

app.get('/api/clientes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          c.*,
          t.NIT,
          t.NombreRazonSocial,
          t.Direccion,
          t.TipoPersona
        FROM Clientes c
        INNER JOIN Terceros t ON c.IdTercero = t.IdTercero
        WHERE c.IdCliente = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'CLIENTE_NO_ENCONTRADO',
        mensaje: 'El cliente no existe'
      });
    }

    const cli = result.recordset[0];
    res.json({
      idCliente: cli.IdCliente,
      idTercero: cli.IdTercero,
      codigoCliente: cli.CodigoCliente,
      nit: cli.NIT,
      nombreRazonSocial: cli.NombreRazonSocial,
      direccion: cli.Direccion,
      telefono: cli.Telefono,
      celular: cli.Celular,
      email: cli.Email,
      ciudad: cli.Ciudad,
      departamento: cli.Departamento,
      tipoPersona: cli.TipoPersona,
      regimenTributario: cli.RegimenTributario,
      condicionPago: cli.CondicionPago,
      limiteCredito: parseFloat(cli.LimiteCredito || 0),
      saldoActual: parseFloat(cli.SaldoActual || 0),
      descuento: parseFloat(cli.Descuento || 0),
      observaciones: cli.Observaciones,
      activo: cli.Activo
    });
  } catch (error: any) {
    console.error('Error al obtener cliente:', error);
    return handleDBError(error, res, 'Error al obtener el cliente');
  }
});

app.post('/api/clientes', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      nit,
      nombreRazonSocial,
      direccion,
      codigoCliente,
      telefono,
      celular,
      email,
      ciudad,
      departamento,
      tipoPersona,
      regimenTributario,
      condicionPago,
      limiteCredito,
      descuento,
      observaciones
    } = req.body;

    if (!nit || !nombreRazonSocial) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'NIT y Nombre/Razón Social son requeridos'
      });
    }

    // Verificar si ya existe un Tercero con ese NIT
    const terceroExistente = await transaction.request()
      .input('nit', sql.VarChar(20), nit)
      .query('SELECT IdTercero, Tipo FROM Terceros WHERE NIT = @nit');

    let idTercero: number;

    if (terceroExistente.recordset.length > 0) {
      const tercero = terceroExistente.recordset[0];
      if (tercero.Tipo !== 'C') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'NIT_EN_USO',
          mensaje: 'El NIT ya está registrado para otro tipo de tercero'
        });
      }
      idTercero = tercero.IdTercero;

      // Actualizar datos del tercero
      await transaction.request()
        .input('idTercero', sql.Int, idTercero)
        .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
        .input('direccion', sql.VarChar(200), direccion || null)
        .input('tipoPersona', sql.Char(1), tipoPersona || 'J')
        .query(`
          UPDATE Terceros
          SET NombreRazonSocial = @nombreRazonSocial,
              Direccion = @direccion,
              TipoPersona = @tipoPersona
          WHERE IdTercero = @idTercero
        `);
    } else {
      // Crear nuevo Tercero
      const terceroResult = await transaction.request()
        .input('nit', sql.VarChar(20), nit)
        .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
        .input('direccion', sql.VarChar(200), direccion || null)
        .input('tipo', sql.Char(1), 'C')
        .input('tipoPersona', sql.Char(1), tipoPersona || 'J')
        .query(`
          INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo, TipoPersona)
          OUTPUT INSERTED.IdTercero
          VALUES (@nit, @nombreRazonSocial, @direccion, @tipo, @tipoPersona)
        `);
      idTercero = terceroResult.recordset[0].IdTercero;
    }

    // Generar código de cliente si no se proporciona
    let codigoFinal = codigoCliente;
    if (!codigoFinal || codigoFinal.trim() === '') {
      const ultimoCodigo = await transaction.request()
        .query('SELECT TOP 1 CodigoCliente FROM Clientes WHERE CodigoCliente LIKE \'CLI-%\' ORDER BY CodigoCliente DESC');

      let siguienteNumero = 1;
      if (ultimoCodigo.recordset.length > 0) {
        const numeroStr = ultimoCodigo.recordset[0].CodigoCliente.split('-')[1];
        siguienteNumero = parseInt(numeroStr) + 1;
      }
      codigoFinal = `CLI-${siguienteNumero.toString().padStart(4, '0')}`;
    }

    // Crear Cliente
    const clienteResult = await transaction.request()
      .input('idTercero', sql.Int, idTercero)
      .input('codigoCliente', sql.VarChar(20), codigoFinal)
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('celular', sql.VarChar(20), celular || null)
      .input('email', sql.VarChar(100), email || null)
      .input('ciudad', sql.VarChar(100), ciudad || null)
      .input('departamento', sql.VarChar(100), departamento || null)
      .input('regimenTributario', sql.VarChar(100), regimenTributario || null)
      .input('condicionPago', sql.VarChar(50), condicionPago || null)
      .input('limiteCredito', sql.Decimal(18, 2), limiteCredito || 0)
      .input('descuento', sql.Decimal(5, 2), descuento || 0)
      .input('observaciones', sql.NVarChar(sql.MAX), observaciones || null)
      .query(`
        INSERT INTO Clientes
          (IdTercero, CodigoCliente, Telefono, Celular, Email, Ciudad, Departamento,
           RegimenTributario, CondicionPago, LimiteCredito, Descuento, Observaciones)
        OUTPUT INSERTED.IdCliente
        VALUES
          (@idTercero, @codigoCliente, @telefono, @celular, @email, @ciudad, @departamento,
           @regimenTributario, @condicionPago, @limiteCredito, @descuento, @observaciones)
      `);

    await transaction.commit();

    res.status(201).json({
      success: true,
      idCliente: clienteResult.recordset[0].IdCliente,
      idTercero,
      codigoCliente: codigoFinal,
      mensaje: 'Cliente creado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el cliente',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const cliente = await transaction.request()
      .input('id', sql.Int, id)
      .query('SELECT IdTercero FROM Clientes WHERE IdCliente = @id');

    if (cliente.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'CLIENTE_NO_ENCONTRADO',
        mensaje: 'El cliente no existe'
      });
    }

    const idTercero = cliente.recordset[0].IdTercero;
    const updates: string[] = [];
    const request = transaction.request();

    // Actualizar campos del Cliente
    if (req.body.telefono !== undefined) {
      updates.push('Telefono = @telefono');
      request.input('telefono', sql.VarChar(20), req.body.telefono);
    }
    if (req.body.celular !== undefined) {
      updates.push('Celular = @celular');
      request.input('celular', sql.VarChar(20), req.body.celular);
    }
    if (req.body.email !== undefined) {
      updates.push('Email = @email');
      request.input('email', sql.VarChar(100), req.body.email);
    }
    if (req.body.ciudad !== undefined) {
      updates.push('Ciudad = @ciudad');
      request.input('ciudad', sql.VarChar(100), req.body.ciudad);
    }
    if (req.body.departamento !== undefined) {
      updates.push('Departamento = @departamento');
      request.input('departamento', sql.VarChar(100), req.body.departamento);
    }
    if (req.body.regimenTributario !== undefined) {
      updates.push('RegimenTributario = @regimenTributario');
      request.input('regimenTributario', sql.VarChar(100), req.body.regimenTributario);
    }
    if (req.body.condicionPago !== undefined) {
      updates.push('CondicionPago = @condicionPago');
      request.input('condicionPago', sql.VarChar(50), req.body.condicionPago);
    }
    if (req.body.limiteCredito !== undefined) {
      updates.push('LimiteCredito = @limiteCredito');
      request.input('limiteCredito', sql.Decimal(18, 2), req.body.limiteCredito);
    }
    if (req.body.descuento !== undefined) {
      updates.push('Descuento = @descuento');
      request.input('descuento', sql.Decimal(5, 2), req.body.descuento);
    }
    if (req.body.observaciones !== undefined) {
      updates.push('Observaciones = @observaciones');
      request.input('observaciones', sql.NVarChar(sql.MAX), req.body.observaciones);
    }
    if (req.body.activo !== undefined) {
      updates.push('Activo = @activo');
      request.input('activo', sql.Bit, req.body.activo);
    }

    if (updates.length > 0) {
      updates.push('FechaModificacion = GETDATE()');
      request.input('id', sql.Int, id);
      await request.query(`UPDATE Clientes SET ${updates.join(', ')} WHERE IdCliente = @id`);
    }

    // Actualizar Tercero si se proporcionan campos
    const terceroUpdates: string[] = [];
    const terceroRequest = transaction.request();

    if (req.body.nombreRazonSocial !== undefined) {
      terceroUpdates.push('NombreRazonSocial = @nombreRazonSocial');
      terceroRequest.input('nombreRazonSocial', sql.VarChar(200), req.body.nombreRazonSocial);
    }
    if (req.body.direccion !== undefined) {
      terceroUpdates.push('Direccion = @direccion');
      terceroRequest.input('direccion', sql.VarChar(200), req.body.direccion);
    }

    if (terceroUpdates.length > 0) {
      terceroRequest.input('idTercero', sql.Int, idTercero);
      await terceroRequest.query(`UPDATE Terceros SET ${terceroUpdates.join(', ')} WHERE IdTercero = @idTercero`);
    }

    await transaction.commit();

    res.json({
      success: true,
      mensaje: 'Cliente actualizado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el cliente',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE Clientes SET Activo = 0, FechaModificacion = GETDATE() WHERE IdCliente = @id');

    res.json({
      success: true,
      mensaje: 'Cliente eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar cliente:', error);
    return handleDBError(error, res, 'Error al eliminar el cliente');
  }
});

// =============================================
// Endpoints: Vendedores
// =============================================
app.get('/api/vendedores', async (req, res) => {
  try {
    const { activo, buscar } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        v.IdVendedor,
        v.CodigoVendedor,
        v.IdTercero,
        t.NIT,
        t.NombreRazonSocial,
        t.Direccion,
        v.Telefono,
        v.Email,
        v.Comision,
        v.Activo,
        v.FechaCreacion,
        v.FechaModificacion
      FROM Vendedores v
      INNER JOIN Terceros t ON v.IdTercero = t.IdTercero
      WHERE 1=1
    `;

    const request = pool.request();

    if (activo !== undefined) {
      query += ' AND v.Activo = @activo';
      const activoValue = typeof activo === 'string' ? activo === 'true' : Boolean(activo);
      request.input('activo', sql.Bit, activoValue);
    }
    if (buscar) {
      query += ' AND (t.NombreRazonSocial LIKE @buscar OR v.CodigoVendedor LIKE @buscar OR t.NIT LIKE @buscar)';
      request.input('buscar', sql.VarChar(200), `%${buscar}%`);
    }

    query += ' ORDER BY t.NombreRazonSocial';

    const result = await request.query(query);

    const vendedores = result.recordset.map((vend: any) => ({
      idVendedor: vend.IdVendedor,
      codigoVendedor: vend.CodigoVendedor,
      idTercero: vend.IdTercero,
      nit: vend.NIT,
      nombreRazonSocial: vend.NombreRazonSocial,
      direccion: vend.Direccion,
      telefono: vend.Telefono,
      email: vend.Email,
      comision: parseFloat(vend.Comision || 0),
      activo: vend.Activo,
      fechaCreacion: vend.FechaCreacion,
      fechaModificacion: vend.FechaModificacion
    }));

    res.json(vendedores);
  } catch (error: any) {
    console.error('Error al obtener vendedores:', error);
    return handleDBError(error, res, 'Error al obtener los vendedores');
  }
});

app.get('/api/vendedores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          v.*,
          t.NIT,
          t.NombreRazonSocial,
          t.Direccion
        FROM Vendedores v
        INNER JOIN Terceros t ON v.IdTercero = t.IdTercero
        WHERE v.IdVendedor = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'VENDEDOR_NO_ENCONTRADO',
        mensaje: 'El vendedor no existe'
      });
    }

    const vend = result.recordset[0];
    res.json({
      idVendedor: vend.IdVendedor,
      codigoVendedor: vend.CodigoVendedor,
      idTercero: vend.IdTercero,
      nit: vend.NIT,
      nombreRazonSocial: vend.NombreRazonSocial,
      direccion: vend.Direccion,
      telefono: vend.Telefono,
      email: vend.Email,
      comision: parseFloat(vend.Comision || 0),
      activo: vend.Activo
    });
  } catch (error: any) {
    console.error('Error al obtener vendedor:', error);
    return handleDBError(error, res, 'Error al obtener el vendedor');
  }
});

app.post('/api/vendedores', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      nit,
      nombreRazonSocial,
      direccion,
      codigoVendedor,
      telefono,
      email,
      comision
    } = req.body;

    if (!nit || !nombreRazonSocial) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'NIT y Nombre/Razón Social son requeridos'
      });
    }

    // Verificar si ya existe un Tercero con ese NIT
    const terceroExistente = await transaction.request()
      .input('nit', sql.VarChar(20), nit)
      .query('SELECT IdTercero, Tipo FROM Terceros WHERE NIT = @nit');

    let idTercero: number;

    if (terceroExistente.recordset.length > 0) {
      const tercero = terceroExistente.recordset[0];
      if (tercero.Tipo !== 'V') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'NIT_EN_USO',
          mensaje: 'El NIT ya está registrado para otro tipo de tercero'
        });
      }
      idTercero = tercero.IdTercero;

      // Actualizar datos del tercero
      await transaction.request()
        .input('idTercero', sql.Int, idTercero)
        .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
        .input('direccion', sql.VarChar(200), direccion || null)
        .query(`
          UPDATE Terceros
          SET NombreRazonSocial = @nombreRazonSocial,
              Direccion = @direccion
          WHERE IdTercero = @idTercero
        `);
    } else {
      // Crear nuevo Tercero
      const terceroResult = await transaction.request()
        .input('nit', sql.VarChar(20), nit)
        .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
        .input('direccion', sql.VarChar(200), direccion || null)
        .input('tipo', sql.Char(1), 'V')
        .query(`
          INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo)
          OUTPUT INSERTED.IdTercero
          VALUES (@nit, @nombreRazonSocial, @direccion, @tipo)
        `);
      idTercero = terceroResult.recordset[0].IdTercero;
    }

    // Generar código de vendedor si no se proporciona
    let codigoFinal = codigoVendedor;
    if (!codigoFinal || codigoFinal.trim() === '') {
      const ultimoCodigo = await transaction.request()
        .query('SELECT TOP 1 CodigoVendedor FROM Vendedores WHERE CodigoVendedor LIKE \'VEN-%\' ORDER BY CodigoVendedor DESC');

      let siguienteNumero = 1;
      if (ultimoCodigo.recordset.length > 0) {
        const numeroStr = ultimoCodigo.recordset[0].CodigoVendedor.split('-')[1];
        siguienteNumero = parseInt(numeroStr) + 1;
      }
      codigoFinal = `VEN-${siguienteNumero.toString().padStart(4, '0')}`;
    }

    // Verificar código único
    const codigoExistente = await transaction.request()
      .input('codigo', sql.VarChar(20), codigoFinal)
      .query('SELECT IdVendedor FROM Vendedores WHERE CodigoVendedor = @codigo');

    if (codigoExistente.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'CODIGO_DUPLICADO',
        mensaje: 'Ya existe un vendedor con ese código'
      });
    }

    // Crear Vendedor
    const vendedorResult = await transaction.request()
      .input('idTercero', sql.Int, idTercero)
      .input('codigoVendedor', sql.VarChar(20), codigoFinal)
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('email', sql.VarChar(100), email || null)
      .input('comision', sql.Decimal(5, 2), comision || 0)
      .query(`
        INSERT INTO Vendedores (IdTercero, CodigoVendedor, Telefono, Email, Comision)
        OUTPUT INSERTED.IdVendedor
        VALUES (@idTercero, @codigoVendedor, @telefono, @email, @comision)
      `);

    await transaction.commit();

    res.status(201).json({
      success: true,
      idVendedor: vendedorResult.recordset[0].IdVendedor,
      idTercero,
      codigoVendedor: codigoFinal,
      mensaje: 'Vendedor creado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear vendedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el vendedor',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.put('/api/vendedores/:id', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const vendedor = await transaction.request()
      .input('id', sql.Int, id)
      .query('SELECT IdTercero, CodigoVendedor FROM Vendedores WHERE IdVendedor = @id');

    if (vendedor.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'VENDEDOR_NO_ENCONTRADO',
        mensaje: 'El vendedor no existe'
      });
    }

    const idTercero = vendedor.recordset[0].IdTercero;
    const codigoActual = vendedor.recordset[0].CodigoVendedor;
    const updates: string[] = [];
    const request = transaction.request();

    // Actualizar campos del Vendedor
    if (req.body.codigoVendedor !== undefined && req.body.codigoVendedor !== codigoActual) {
      // Verificar código único
      const codigoExistente = await transaction.request()
        .input('codigo', sql.VarChar(20), req.body.codigoVendedor)
        .query('SELECT IdVendedor FROM Vendedores WHERE CodigoVendedor = @codigo AND IdVendedor != @id');

      if (codigoExistente.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'CODIGO_DUPLICADO',
          mensaje: 'Ya existe otro vendedor con ese código'
        });
      }

      updates.push('CodigoVendedor = @codigoVendedor');
      request.input('codigoVendedor', sql.VarChar(20), req.body.codigoVendedor);
    }
    if (req.body.telefono !== undefined) {
      updates.push('Telefono = @telefono');
      request.input('telefono', sql.VarChar(20), req.body.telefono);
    }
    if (req.body.email !== undefined) {
      updates.push('Email = @email');
      request.input('email', sql.VarChar(100), req.body.email);
    }
    if (req.body.comision !== undefined) {
      updates.push('Comision = @comision');
      request.input('comision', sql.Decimal(5, 2), req.body.comision);
    }
    if (req.body.activo !== undefined) {
      updates.push('Activo = @activo');
      request.input('activo', sql.Bit, req.body.activo);
    }

    if (updates.length > 0) {
      updates.push('FechaModificacion = GETDATE()');
      request.input('id', sql.Int, id);
      await request.query(`UPDATE Vendedores SET ${updates.join(', ')} WHERE IdVendedor = @id`);
    }

    // Actualizar Tercero si se proporcionan campos
    const terceroUpdates: string[] = [];
    const terceroRequest = transaction.request();

    if (req.body.nombreRazonSocial !== undefined) {
      terceroUpdates.push('NombreRazonSocial = @nombreRazonSocial');
      terceroRequest.input('nombreRazonSocial', sql.VarChar(200), req.body.nombreRazonSocial);
    }
    if (req.body.direccion !== undefined) {
      terceroUpdates.push('Direccion = @direccion');
      terceroRequest.input('direccion', sql.VarChar(200), req.body.direccion);
    }

    if (terceroUpdates.length > 0) {
      terceroRequest.input('idTercero', sql.Int, idTercero);
      await terceroRequest.query(`UPDATE Terceros SET ${terceroUpdates.join(', ')} WHERE IdTercero = @idTercero`);
    }

    await transaction.commit();

    res.json({
      success: true,
      mensaje: 'Vendedor actualizado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al actualizar vendedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el vendedor',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.delete('/api/vendedores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE Vendedores SET Activo = 0, FechaModificacion = GETDATE() WHERE IdVendedor = @id');

    res.json({
      success: true,
      mensaje: 'Vendedor eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar vendedor:', error);
    return handleDBError(error, res, 'Error al eliminar el vendedor');
  }
});

// =============================================
// Endpoints: Proveedores
// =============================================
app.get('/api/proveedores', async (req, res) => {
  try {
    const { activo, buscar, ciudad, tipoPersona } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        p.IdProveedor,
        p.IdTercero,
        p.CodigoProveedor,
        t.NIT,
        t.NombreRazonSocial,
        t.Direccion,
        p.TipoPersona,
        p.Ciudad,
        p.Telefono,
        p.Email,
        p.Activo,
        p.FechaCreacion,
        p.FechaModificacion
      FROM Proveedores p
      INNER JOIN Terceros t ON p.IdTercero = t.IdTercero
      WHERE 1=1
    `;

    const request = pool.request();

    if (activo !== undefined) {
      query += ' AND p.Activo = @activo';
      const activoValue = typeof activo === 'string' ? activo === 'true' : Boolean(activo);
      request.input('activo', sql.Bit, activoValue);
    }
    if (buscar) {
      query += ' AND (t.NombreRazonSocial LIKE @buscar OR p.CodigoProveedor LIKE @buscar OR t.NIT LIKE @buscar)';
      request.input('buscar', sql.VarChar(200), `%${buscar}%`);
    }
    if (ciudad) {
      query += ' AND p.Ciudad = @ciudad';
      request.input('ciudad', sql.VarChar(100), ciudad);
    }
    if (tipoPersona) {
      query += ' AND p.TipoPersona = @tipoPersona';
      request.input('tipoPersona', sql.Char(1), tipoPersona);
    }

    query += ' ORDER BY t.NombreRazonSocial';

    const result = await request.query(query);

    const proveedores = result.recordset.map((prov: any) => ({
      idProveedor: prov.IdProveedor,
      idTercero: prov.IdTercero,
      codigoProveedor: prov.CodigoProveedor,
      nit: prov.NIT,
      nombreRazonSocial: prov.NombreRazonSocial,
      direccion: prov.Direccion,
      tipoPersona: prov.TipoPersona,
      ciudad: prov.Ciudad,
      telefono: prov.Telefono,
      email: prov.Email,
      activo: prov.Activo,
      fechaCreacion: prov.FechaCreacion,
      fechaModificacion: prov.FechaModificacion
    }));

    res.json(proveedores);
  } catch (error: any) {
    console.error('Error al obtener proveedores:', error);
    return handleDBError(error, res, 'Error al obtener los proveedores');
  }
});

app.get('/api/proveedores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          p.*,
          t.NIT,
          t.NombreRazonSocial,
          t.Direccion
        FROM Proveedores p
        INNER JOIN Terceros t ON p.IdTercero = t.IdTercero
        WHERE p.IdProveedor = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PROVEEDOR_NO_ENCONTRADO',
        mensaje: 'El proveedor no existe'
      });
    }

    const prov = result.recordset[0];
    res.json({
      idProveedor: prov.IdProveedor,
      idTercero: prov.IdTercero,
      codigoProveedor: prov.CodigoProveedor,
      nit: prov.NIT,
      nombreRazonSocial: prov.NombreRazonSocial,
      direccion: prov.Direccion,
      tipoPersona: prov.TipoPersona,
      ciudad: prov.Ciudad,
      telefono: prov.Telefono,
      email: prov.Email,
      activo: prov.Activo
    });
  } catch (error: any) {
    console.error('Error al obtener proveedor:', error);
    return handleDBError(error, res, 'Error al obtener el proveedor');
  }
});

app.post('/api/proveedores', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      nit,
      nombreRazonSocial,
      direccion,
      codigoProveedor,
      tipoPersona,
      ciudad,
      telefono,
      email
    } = req.body;

    if (!nit || !nombreRazonSocial) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'NIT y Nombre/Razón Social son requeridos'
      });
    }

    // Verificar si ya existe un Tercero con ese NIT
    const terceroExistente = await transaction.request()
      .input('nit', sql.VarChar(20), nit)
      .query('SELECT IdTercero, Tipo FROM Terceros WHERE NIT = @nit');

    let idTercero: number;

    if (terceroExistente.recordset.length > 0) {
      const tercero = terceroExistente.recordset[0];
      if (tercero.Tipo !== 'P') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'NIT_EN_USO',
          mensaje: 'El NIT ya está registrado para otro tipo de tercero'
        });
      }
      idTercero = tercero.IdTercero;

      // Actualizar datos del tercero
      await transaction.request()
        .input('idTercero', sql.Int, idTercero)
        .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
        .input('direccion', sql.VarChar(200), direccion || null)
        .query(`
          UPDATE Terceros
          SET NombreRazonSocial = @nombreRazonSocial,
              Direccion = @direccion
          WHERE IdTercero = @idTercero
        `);

      // Verificar si ya existe un Proveedor para este Tercero
      const proveedorExistente = await transaction.request()
        .input('idTercero', sql.Int, idTercero)
        .query('SELECT IdProveedor FROM Proveedores WHERE IdTercero = @idTercero');

      if (proveedorExistente.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'PROVEEDOR_EXISTENTE',
          mensaje: 'Ya existe un proveedor con este NIT'
        });
      }
    } else {
      // Crear nuevo Tercero
      const terceroResult = await transaction.request()
        .input('nit', sql.VarChar(20), nit)
        .input('nombreRazonSocial', sql.VarChar(200), nombreRazonSocial)
        .input('direccion', sql.VarChar(200), direccion || null)
        .input('tipo', sql.Char(1), 'P')
        .query(`
          INSERT INTO Terceros (NIT, NombreRazonSocial, Direccion, Tipo)
          OUTPUT INSERTED.IdTercero
          VALUES (@nit, @nombreRazonSocial, @direccion, @tipo)
        `);
      idTercero = terceroResult.recordset[0].IdTercero;
    }

    // Generar código de proveedor si no se proporciona
    let codigoFinal = codigoProveedor;
    if (!codigoFinal || codigoFinal.trim() === '') {
      const ultimoCodigo = await transaction.request()
        .query('SELECT TOP 1 CodigoProveedor FROM Proveedores WHERE CodigoProveedor LIKE \'PROV-%\' ORDER BY CodigoProveedor DESC');

      let siguienteNumero = 1;
      if (ultimoCodigo.recordset.length > 0) {
        const numeroStr = ultimoCodigo.recordset[0].CodigoProveedor.split('-')[1];
        siguienteNumero = parseInt(numeroStr) + 1;
      }
      codigoFinal = `PROV-${siguienteNumero.toString().padStart(4, '0')}`;
    }

    // Verificar que el código no esté duplicado
    if (codigoFinal) {
      const codigoExistente = await transaction.request()
        .input('codigo', sql.VarChar(50), codigoFinal)
        .query('SELECT IdProveedor FROM Proveedores WHERE CodigoProveedor = @codigo');

      if (codigoExistente.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'CODIGO_DUPLICADO',
          mensaje: 'Ya existe un proveedor con ese código'
        });
      }
    }

    // Crear Proveedor
    const proveedorResult = await transaction.request()
      .input('idTercero', sql.Int, idTercero)
      .input('codigoProveedor', sql.VarChar(50), codigoFinal || null)
      .input('tipoPersona', sql.Char(1), tipoPersona || 'J')
      .input('ciudad', sql.VarChar(100), ciudad || null)
      .input('telefono', sql.VarChar(20), telefono || null)
      .input('email', sql.VarChar(100), email || null)
      .query(`
        INSERT INTO Proveedores (IdTercero, CodigoProveedor, TipoPersona, Ciudad, Telefono, Email)
        OUTPUT INSERTED.IdProveedor
        VALUES (@idTercero, @codigoProveedor, @tipoPersona, @ciudad, @telefono, @email)
      `);

    await transaction.commit();

    res.status(201).json({
      success: true,
      idProveedor: proveedorResult.recordset[0].IdProveedor,
      idTercero,
      codigoProveedor: codigoFinal,
      mensaje: 'Proveedor creado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear proveedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el proveedor',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.put('/api/proveedores/:id', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const proveedor = await transaction.request()
      .input('id', sql.Int, id)
      .query('SELECT IdTercero FROM Proveedores WHERE IdProveedor = @id');

    if (proveedor.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'PROVEEDOR_NO_ENCONTRADO',
        mensaje: 'El proveedor no existe'
      });
    }

    const idTercero = proveedor.recordset[0].IdTercero;
    const updates: string[] = [];
    const request = transaction.request();

    // Actualizar campos del Proveedor
    if (req.body.ciudad !== undefined) {
      updates.push('Ciudad = @ciudad');
      request.input('ciudad', sql.VarChar(100), req.body.ciudad);
    }
    if (req.body.telefono !== undefined) {
      updates.push('Telefono = @telefono');
      request.input('telefono', sql.VarChar(20), req.body.telefono);
    }
    if (req.body.email !== undefined) {
      updates.push('Email = @email');
      request.input('email', sql.VarChar(100), req.body.email);
    }
    if (req.body.activo !== undefined) {
      updates.push('Activo = @activo');
      request.input('activo', sql.Bit, req.body.activo);
    }

    if (updates.length > 0) {
      updates.push('FechaModificacion = GETDATE()');
      request.input('id', sql.Int, id);
      await request.query(`UPDATE Proveedores SET ${updates.join(', ')} WHERE IdProveedor = @id`);
    }

    // Actualizar Tercero si se proporcionan campos
    const terceroUpdates: string[] = [];
    const terceroRequest = transaction.request();

    if (req.body.nombreRazonSocial !== undefined) {
      terceroUpdates.push('NombreRazonSocial = @nombreRazonSocial');
      terceroRequest.input('nombreRazonSocial', sql.VarChar(200), req.body.nombreRazonSocial);
    }
    if (req.body.direccion !== undefined) {
      terceroUpdates.push('Direccion = @direccion');
      terceroRequest.input('direccion', sql.VarChar(200), req.body.direccion);
    }

    if (terceroUpdates.length > 0) {
      terceroRequest.input('idTercero', sql.Int, idTercero);
      await terceroRequest.query(`UPDATE Terceros SET ${terceroUpdates.join(', ')} WHERE IdTercero = @idTercero`);
    }

    await transaction.commit();

    res.json({
      success: true,
      mensaje: 'Proveedor actualizado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el proveedor',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.delete('/api/proveedores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE Proveedores SET Activo = 0, FechaModificacion = GETDATE() WHERE IdProveedor = @id');

    res.json({
      success: true,
      mensaje: 'Proveedor eliminado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar proveedor:', error);
    return handleDBError(error, res, 'Error al eliminar el proveedor');
  }
});

// =============================================
// Endpoints: PUC (Plan Único de Cuentas)
// =============================================
app.get('/api/puc', async (req, res) => {
  try {
    const { nivel, codigoPadre } = req.query;
    const pool = await getConnection();

    let query = 'SELECT * FROM CuentasPUC WHERE 1=1';
    const request = pool.request();

    if (nivel) {
      query += ' AND Nivel = @nivel';
      request.input('nivel', sql.Int, parseInt(nivel as string));
    }
    if (codigoPadre) {
      query += ' AND CodigoPadre = @codigoPadre';
      request.input('codigoPadre', sql.VarChar(20), codigoPadre);
    }

    query += ' ORDER BY CodigoCuenta';

    const result = await request.query(query);

    const cuentas = result.recordset.map((cuenta: any) => ({
      codigoCuenta: cuenta.CodigoCuenta,
      nombre: cuenta.Nombre,
      nivel: cuenta.Nivel,
      codigoPadre: cuenta.CodigoPadre,
      naturaleza: cuenta.Naturaleza,
      activa: cuenta.Activa
    }));

    res.json(cuentas);
  } catch (error: any) {
    console.error('Error al obtener cuentas PUC:', error);
    return handleDBError(error, res, 'Error al obtener las cuentas PUC');
  }
});

app.get('/api/puc/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const pool = await getConnection();

    const result = await pool.request()
      .input('codigo', sql.VarChar(20), codigo)
      .query('SELECT * FROM CuentasPUC WHERE CodigoCuenta = @codigo');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'CUENTA_NO_ENCONTRADA',
        mensaje: 'La cuenta no existe'
      });
    }

    const cuenta = result.recordset[0];
    res.json({
      codigoCuenta: cuenta.CodigoCuenta,
      nombre: cuenta.Nombre,
      nivel: cuenta.Nivel,
      codigoPadre: cuenta.CodigoPadre,
      naturaleza: cuenta.Naturaleza,
      activa: cuenta.Activa
    });
  } catch (error: any) {
    console.error('Error al obtener cuenta PUC:', error);
    return handleDBError(error, res, 'Error al obtener la cuenta PUC');
  }
});

// =============================================
// Endpoints: Productos
// =============================================
app.get('/api/productos', async (req, res) => {
  try {
    const { activo, codigo, buscar } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        p.IdProducto,
        p.Codigo,
        p.CodigoBarras,
        p.Nombre,
        p.Descripcion,
        p.UnidadMedida,
        p.PrecioVenta,
        p.PrecioCompra,
        p.IVA,
        ISNULL(i.Cantidad, 0) AS CantidadStock,
        ISNULL(i.CantidadMinima, 0) AS CantidadMinima,
        ISNULL(i.CantidadMaxima, 0) AS CantidadMaxima,
        i.Ubicacion,
        p.Activo,
        p.FechaCreacion,
        p.FechaModificacion
      FROM Productos p
      LEFT JOIN Inventario i ON p.IdProducto = i.IdProducto
      WHERE 1=1
    `;

    const request = pool.request();

    if (activo !== undefined) {
      query += ' AND p.Activo = @activo';
      const activoValue = typeof activo === 'string' ? activo === 'true' : Boolean(activo);
      request.input('activo', sql.Bit, activoValue);
    }
    if (codigo) {
      query += ' AND (p.Codigo = @codigo OR p.CodigoBarras = @codigo)';
      request.input('codigo', sql.VarChar(100), codigo);
    }
    if (buscar) {
      query += ' AND (p.Codigo LIKE @buscar OR p.CodigoBarras LIKE @buscar OR p.Nombre LIKE @buscar)';
      request.input('buscar', sql.VarChar(100), `%${buscar}%`);
    }

    query += ' ORDER BY p.Nombre';

    const result = await request.query(query);

    const productos = result.recordset.map((prod: any) => ({
      idProducto: prod.IdProducto,
      codigo: prod.Codigo,
      codigoBarras: prod.CodigoBarras,
      nombre: prod.Nombre,
      descripcion: prod.Descripcion,
      unidadMedida: prod.UnidadMedida,
      precioVenta: parseFloat(prod.PrecioVenta),
      precioCompra: parseFloat(prod.PrecioCompra),
      iva: parseFloat(prod.IVA || 0),
      cantidadStock: parseFloat(prod.CantidadStock || 0),
      cantidadMinima: parseFloat(prod.CantidadMinima || 0),
      cantidadMaxima: parseFloat(prod.CantidadMaxima || 0),
      ubicacion: prod.Ubicacion,
      activo: prod.Activo,
      fechaCreacion: prod.FechaCreacion,
      fechaModificacion: prod.FechaModificacion
    }));

    res.json(productos);
  } catch (error: any) {
    console.error('Error al obtener productos:', error);
    return handleDBError(error, res, 'Error al obtener los productos');
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Productos WHERE IdProducto = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PRODUCTO_NO_ENCONTRADO',
        mensaje: 'El producto no existe'
      });
    }

    const prod = result.recordset[0];
    res.json({
      idProducto: prod.IdProducto,
      codigo: prod.Codigo,
      codigoBarras: prod.CodigoBarras,
      nombre: prod.Nombre,
      descripcion: prod.Descripcion,
      unidadMedida: prod.UnidadMedida,
      precioVenta: parseFloat(prod.PrecioVenta),
      precioCompra: parseFloat(prod.PrecioCompra),
      iva: parseFloat(prod.IVA || 0),
      cantidadStock: parseFloat(prod.CantidadStock || 0),
      cantidadMinima: parseFloat(prod.CantidadMinima || 0),
      cantidadMaxima: parseFloat(prod.CantidadMaxima || 0),
      ubicacion: prod.Ubicacion,
      activo: prod.Activo,
      fechaCreacion: prod.FechaCreacion,
      fechaModificacion: prod.FechaModificacion
    });
  } catch (error: any) {
    console.error('Error al obtener producto:', error);
    return handleDBError(error, res, 'Error al obtener el producto');
  }
});

app.get('/api/productos/buscar/:codigo', async (req, res) => {
  try {
    const codigo = decodeURIComponent(req.params.codigo);
    const pool = await getConnection();

    // Buscar por código exacto o código de barras
    const exactoResult = await pool.request()
      .input('codigo', sql.VarChar(100), codigo)
      .query(`
        SELECT * FROM Productos
        WHERE (Codigo = @codigo OR CodigoBarras = @codigo) AND Activo = 1
      `);

    if (exactoResult.recordset.length > 0) {
      const prod = exactoResult.recordset[0];
      return res.json({
        idProducto: prod.IdProducto,
        codigo: prod.Codigo,
        codigoBarras: prod.CodigoBarras,
        nombre: prod.Nombre,
        descripcion: prod.Descripcion,
        unidadMedida: prod.UnidadMedida,
        precioVenta: parseFloat(prod.PrecioVenta),
        precioCompra: parseFloat(prod.PrecioCompra),
        iva: parseFloat(prod.IVA || 0),
        cantidadStock: parseFloat(prod.CantidadStock || 0),
        activo: prod.Activo
      });
    }

    // Buscar por nombre (parcial)
    const nombreResult = await pool.request()
      .input('buscar', sql.VarChar(100), `%${codigo}%`)
      .query(`
        SELECT * FROM Productos
        WHERE Nombre LIKE @buscar AND Activo = 1
        ORDER BY Nombre
      `);

    if (nombreResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'PRODUCTO_NO_ENCONTRADO',
        mensaje: 'Producto no encontrado con el código, código de barras o nombre proporcionado'
      });
    }

    if (nombreResult.recordset.length === 1) {
      const prod = nombreResult.recordset[0];
      return res.json({
        idProducto: prod.IdProducto,
        codigo: prod.Codigo,
        codigoBarras: prod.CodigoBarras,
        nombre: prod.Nombre,
        descripcion: prod.Descripcion,
        unidadMedida: prod.UnidadMedida,
        precioVenta: parseFloat(prod.PrecioVenta),
        precioCompra: parseFloat(prod.PrecioCompra),
        iva: parseFloat(prod.IVA || 0),
        cantidadStock: parseFloat(prod.CantidadStock || 0),
        activo: prod.Activo
      });
    }

    // Múltiples resultados
    const productos = nombreResult.recordset.map((prod: any) => ({
      idProducto: prod.IdProducto,
      codigo: prod.Codigo,
      codigoBarras: prod.CodigoBarras,
      nombre: prod.Nombre,
      descripcion: prod.Descripcion,
      unidadMedida: prod.UnidadMedida,
      precioVenta: parseFloat(prod.PrecioVenta),
      precioCompra: parseFloat(prod.PrecioCompra),
      iva: parseFloat(prod.IVA || 0),
      cantidadStock: parseFloat(prod.CantidadStock || 0),
      activo: prod.Activo
    }));

    res.json({
      success: true,
      cantidad: productos.length,
      productos
    });
  } catch (error: any) {
    console.error('Error al buscar producto:', error);
    return handleDBError(error, res, 'Error al buscar el producto');
  }
});

app.post('/api/productos', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      codigo,
      codigoBarras,
      nombre,
      descripcion,
      unidadMedida,
      precioVenta,
      precioCompra,
      iva,
      cantidadStock,
      cantidadMinima,
      cantidadMaxima,
      ubicacion,
      activo
    } = req.body;

    if (!codigo || !nombre || !unidadMedida) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Código, nombre y unidad de medida son requeridos'
      });
    }

    // Verificar código único
    const codigoExistente = await transaction.request()
      .input('codigo', sql.VarChar(50), codigo)
      .query('SELECT IdProducto FROM Productos WHERE Codigo = @codigo');

    if (codigoExistente.recordset.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'CODIGO_DUPLICADO',
        mensaje: 'Ya existe un producto con ese código'
      });
    }

    const result = await transaction.request()
      .input('codigo', sql.VarChar(50), codigo)
      .input('codigoBarras', sql.VarChar(100), codigoBarras || null)
      .input('nombre', sql.VarChar(200), nombre)
      .input('descripcion', sql.NVarChar(sql.MAX), descripcion || null)
      .input('unidadMedida', sql.VarChar(10), unidadMedida)
      .input('precioVenta', sql.Decimal(18, 2), precioVenta || 0)
      .input('precioCompra', sql.Decimal(18, 2), precioCompra || 0)
      .input('iva', sql.Decimal(5, 2), iva || 0)
      .input('cantidadStock', sql.Decimal(18, 3), cantidadStock || 0)
      .input('cantidadMinima', sql.Decimal(18, 3), cantidadMinima || 0)
      .input('cantidadMaxima', sql.Decimal(18, 3), cantidadMaxima || 0)
      .input('ubicacion', sql.VarChar(50), ubicacion || null)
      .input('activo', sql.Bit, activo !== false)
      .query(`
        INSERT INTO Productos
          (Codigo, CodigoBarras, Nombre, Descripcion, UnidadMedida, PrecioVenta, PrecioCompra, IVA,
           CantidadStock, CantidadMinima, CantidadMaxima, Ubicacion, Activo)
        OUTPUT INSERTED.IdProducto
        VALUES
          (@codigo, @codigoBarras, @nombre, @descripcion, @unidadMedida, @precioVenta, @precioCompra, @iva,
           @cantidadStock, @cantidadMinima, @cantidadMaxima, @ubicacion, @activo)
      `);

    await transaction.commit();

    res.status(201).json({
      success: true,
      idProducto: result.recordset[0].IdProducto,
      mensaje: 'Producto creado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al crear producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el producto',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const {
      codigo,
      codigoBarras,
      nombre,
      descripcion,
      unidadMedida,
      precioVenta,
      precioCompra,
      iva,
      cantidadStock,
      cantidadMinima,
      cantidadMaxima,
      ubicacion,
      activo
    } = req.body;

    // Verificar que el producto existe
    const productoExistente = await transaction.request()
      .input('id', sql.Int, id)
      .query('SELECT Codigo FROM Productos WHERE IdProducto = @id');

    if (productoExistente.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: 'PRODUCTO_NO_ENCONTRADO',
        mensaje: 'El producto no existe'
      });
    }

    // Si se cambia el código, verificar que no esté duplicado
    if (codigo && codigo !== productoExistente.recordset[0].Codigo) {
      const codigoExistente = await transaction.request()
        .input('codigo', sql.VarChar(50), codigo)
        .query('SELECT IdProducto FROM Productos WHERE Codigo = @codigo AND IdProducto != @id');

      if (codigoExistente.recordset.length > 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'CODIGO_DUPLICADO',
          mensaje: 'Ya existe otro producto con ese código'
        });
      }
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const request = transaction.request();

    if (codigo !== undefined) {
      updates.push('Codigo = @codigo');
      request.input('codigo', sql.VarChar(50), codigo);
    }
    if (codigoBarras !== undefined) {
      updates.push('CodigoBarras = @codigoBarras');
      request.input('codigoBarras', sql.VarChar(100), codigoBarras);
    }
    if (nombre !== undefined) {
      updates.push('Nombre = @nombre');
      request.input('nombre', sql.VarChar(200), nombre);
    }
    if (descripcion !== undefined) {
      updates.push('Descripcion = @descripcion');
      request.input('descripcion', sql.NVarChar(sql.MAX), descripcion);
    }
    if (unidadMedida !== undefined) {
      updates.push('UnidadMedida = @unidadMedida');
      request.input('unidadMedida', sql.VarChar(10), unidadMedida);
    }
    if (precioVenta !== undefined) {
      updates.push('PrecioVenta = @precioVenta');
      request.input('precioVenta', sql.Decimal(18, 2), precioVenta);
    }
    if (precioCompra !== undefined) {
      updates.push('PrecioCompra = @precioCompra');
      request.input('precioCompra', sql.Decimal(18, 2), precioCompra);
    }
    if (iva !== undefined) {
      updates.push('IVA = @iva');
      request.input('iva', sql.Decimal(5, 2), iva);
    }
    if (cantidadStock !== undefined) {
      updates.push('CantidadStock = @cantidadStock');
      request.input('cantidadStock', sql.Decimal(18, 3), cantidadStock);
    }
    if (cantidadMinima !== undefined) {
      updates.push('CantidadMinima = @cantidadMinima');
      request.input('cantidadMinima', sql.Decimal(18, 3), cantidadMinima);
    }
    if (cantidadMaxima !== undefined) {
      updates.push('CantidadMaxima = @cantidadMaxima');
      request.input('cantidadMaxima', sql.Decimal(18, 3), cantidadMaxima);
    }
    if (ubicacion !== undefined) {
      updates.push('Ubicacion = @ubicacion');
      request.input('ubicacion', sql.VarChar(50), ubicacion);
    }
    if (activo !== undefined) {
      updates.push('Activo = @activo');
      request.input('activo', sql.Bit, activo);
    }

    if (updates.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'SIN_CAMBIOS',
        mensaje: 'No se proporcionaron campos para actualizar'
      });
    }

    updates.push('FechaModificacion = GETDATE()');
    request.input('id', sql.Int, id);

    await request.query(`
      UPDATE Productos
      SET ${updates.join(', ')}
      WHERE IdProducto = @id
    `);

    await transaction.commit();

    res.json({
      success: true,
      mensaje: 'Producto actualizado exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al actualizar producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar el producto',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// =============================================
// Endpoints: Inventario
// =============================================
app.get('/api/inventario', async (req, res) => {
  try {
    const { bajoStock, buscar } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        p.IdProducto,
        p.Codigo,
        p.CodigoBarras,
        p.Nombre,
        p.Descripcion,
        p.UnidadMedida,
        ISNULL(i.Cantidad, 0) AS CantidadStock,
        ISNULL(i.CantidadMinima, 0) AS CantidadMinima,
        ISNULL(i.CantidadMaxima, 0) AS CantidadMaxima,
        i.Ubicacion,
        p.Activo
      FROM Productos p
      LEFT JOIN Inventario i ON p.IdProducto = i.IdProducto
      WHERE p.Activo = 1
    `;

    const request = pool.request();

    if (bajoStock === 'true') {
      query += ' AND (ISNULL(i.Cantidad, 0) <= ISNULL(i.CantidadMinima, 0) OR i.CantidadMinima IS NULL)';
    }
    if (buscar) {
      query += ' AND (p.Codigo LIKE @buscar OR p.CodigoBarras LIKE @buscar OR p.Nombre LIKE @buscar)';
      request.input('buscar', sql.VarChar(100), `%${buscar}%`);
    }

    query += ' ORDER BY p.Nombre';

    const result = await request.query(query);

    const inventario = result.recordset.map((prod: any) => ({
      idProducto: prod.IdProducto,
      codigo: prod.Codigo,
      codigoBarras: prod.CodigoBarras,
      nombre: prod.Nombre,
      descripcion: prod.Descripcion,
      unidadMedida: prod.UnidadMedida,
      cantidadStock: parseFloat(prod.CantidadStock || 0),
      cantidadMinima: parseFloat(prod.CantidadMinima || 0),
      cantidadMaxima: parseFloat(prod.CantidadMaxima || 0),
      ubicacion: prod.Ubicacion,
      activo: prod.Activo
    }));

    res.json(inventario);
  } catch (error: any) {
    console.error('Error al obtener inventario:', error);
    return handleDBError(error, res, 'Error al obtener el inventario');
  }
});

app.get('/api/inventario/:idProducto/movimientos', async (req, res) => {
  try {
    const idProducto = parseInt(req.params.idProducto);
    const { fechaDesde, fechaHasta, tipoMovimiento } = req.query;

    if (isNaN(idProducto)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID del producto debe ser un número válido'
      });
    }

    const pool = await getConnection();

    let query = `
      SELECT
        m.IdMovimiento,
        m.FechaMovimiento AS Fecha,
        m.TipoMovimiento,
        m.Cantidad,
        m.CantidadAnterior,
        m.CantidadNueva,
        m.Referencia,
        m.Concepto AS Observaciones
      FROM MovimientosInventario m
      WHERE m.IdProducto = @idProducto
    `;

    const request = pool.request();
    request.input('idProducto', sql.Int, idProducto);

    if (fechaDesde) {
      query += ' AND m.FechaMovimiento >= @fechaDesde';
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND m.FechaMovimiento <= @fechaHasta';
      request.input('fechaHasta', sql.Date, fechaHasta);
    }
    if (tipoMovimiento) {
      query += ' AND m.TipoMovimiento = @tipoMovimiento';
      request.input('tipoMovimiento', sql.VarChar(20), tipoMovimiento);
    }

    query += ' ORDER BY m.FechaMovimiento DESC, m.IdMovimiento DESC';

    const result = await request.query(query);

    const movimientos = result.recordset.map((mov: any) => ({
      idMovimiento: mov.IdMovimiento,
      fecha: mov.Fecha.toISOString().split('T')[0],
      tipoMovimiento: mov.TipoMovimiento,
      cantidad: parseFloat(mov.Cantidad),
      cantidadAnterior: parseFloat(mov.CantidadAnterior || 0),
      cantidadNueva: parseFloat(mov.CantidadNueva || 0),
      referencia: mov.Referencia,
      observaciones: mov.Observaciones
    }));

    res.json(movimientos);
  } catch (error: any) {
    console.error('Error al obtener movimientos de inventario:', error);
    return handleDBError(error, res, 'Error al obtener los movimientos de inventario');
  }
});

// =============================================
// Endpoints: Asientos Contables
// =============================================
app.post('/api/asientos', async (req, res) => {
  try {
    const {
      fecha,
      descripcion,
      movimientos,
      idUsuarioCreacion
    } = req.body;

    if (!fecha || !descripcion || !movimientos || movimientos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Fecha, descripción y al menos un movimiento son requeridos'
      });
    }

    // Calcular totales
    const totalDebito = movimientos.reduce((sum: number, mov: any) => sum + (mov.valorDebito || 0), 0);
    const totalCredito = movimientos.reduce((sum: number, mov: any) => sum + (mov.valorCredito || 0), 0);

    // Validar partida doble
    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'PARTIDA_DOBLE_INVALIDA',
        mensaje: `Los totales de débito (${totalDebito}) y crédito (${totalCredito}) no cuadran`
      });
    }

    const pool = await getConnection();

    // Crear asiento usando el servicio (crearAsientoAutomatico maneja su propia transacción)
    const idComprobante = await crearAsientoAutomatico(pool, {
      fecha,
      descripcion,
      movimientos: movimientos.map((mov: any) => ({
        codigoCuenta: mov.codigoCuenta,
        idTercero: mov.idTercero,
        valorDebito: mov.valorDebito || 0,
        valorCredito: mov.valorCredito || 0
      })),
      idUsuarioCreacion: idUsuarioCreacion || 1
    });

    res.status(201).json({
      success: true,
      idComprobante,
      mensaje: 'Asiento contable creado exitosamente'
    });
  } catch (error: any) {
    console.error('Error al crear asiento contable:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear el asiento contable',
      mensaje: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

app.get('/api/asientos', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT
        c.IdComprobante,
        c.Fecha,
        c.Descripcion,
        c.TotalDebito,
        c.TotalCredito
      FROM Comprobantes c
      WHERE 1=1
    `;

    const request = pool.request();

    if (fechaDesde) {
      query += ' AND c.Fecha >= @fechaDesde';
      request.input('fechaDesde', sql.Date, fechaDesde);
    }
    if (fechaHasta) {
      query += ' AND c.Fecha <= @fechaHasta';
      request.input('fechaHasta', sql.Date, fechaHasta);
    }

    query += ' ORDER BY c.Fecha DESC, c.IdComprobante DESC';

    const result = await request.query(query);

    const asientos = result.recordset.map((comp: any) => ({
      idComprobante: comp.IdComprobante,
      fecha: comp.Fecha.toISOString().split('T')[0],
      descripcion: comp.Descripcion,
      totalDebito: parseFloat(comp.TotalDebito),
      totalCredito: parseFloat(comp.TotalCredito)
    }));

    res.json(asientos);
  } catch (error: any) {
    console.error('Error al obtener asientos contables:', error);
    return handleDBError(error, res, 'Error al obtener los asientos contables');
  }
});

// Obtener un asiento contable por ID
app.get('/api/asientos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID_INVALIDO',
        mensaje: 'El ID debe ser un número válido'
      });
    }

    const pool = await getConnection();

    // Obtener el comprobante
    const comprobanteResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          c.IdComprobante,
          c.Fecha,
          c.Descripcion,
          c.TotalDebito,
          c.TotalCredito,
          c.Referencia,
          c.TipoReferencia,
          c.IdUsuarioCreacion
        FROM Comprobantes c
        WHERE c.IdComprobante = @id
      `);

    if (comprobanteResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ASIENTO_NO_ENCONTRADO',
        mensaje: 'El asiento contable no existe'
      });
    }

    const comprobante = comprobanteResult.recordset[0];

    // Obtener los movimientos del asiento
    const movimientosResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          d.IdDetalle,
          d.CodigoCuenta,
          c.NombreCuenta AS NombreCuenta,
          d.IdTercero,
          t.NombreRazonSocial AS NombreTercero,
          d.ValorDebito,
          d.ValorCredito,
          d.Concepto
        FROM DetalleComprobante d
        INNER JOIN CuentasPUC c ON d.CodigoCuenta = c.CodigoCuenta
        LEFT JOIN Terceros t ON d.IdTercero = t.IdTercero
        WHERE d.IdComprobante = @id
        ORDER BY d.IdDetalle
      `);

    const movimientos = movimientosResult.recordset.map((mov: any) => ({
      idDetalle: mov.IdDetalle,
      codigoCuenta: mov.CodigoCuenta,
      nombreCuenta: mov.NombreCuenta,
      idTercero: mov.IdTercero,
      nombreTercero: mov.NombreTercero,
      valorDebito: parseFloat(mov.ValorDebito || 0),
      valorCredito: parseFloat(mov.ValorCredito || 0),
      concepto: mov.Concepto
    }));

    res.json({
      idComprobante: comprobante.IdComprobante,
      fecha: comprobante.Fecha.toISOString().split('T')[0],
      descripcion: comprobante.Descripcion,
      totalDebito: parseFloat(comprobante.TotalDebito),
      totalCredito: parseFloat(comprobante.TotalCredito),
      referencia: comprobante.Referencia,
      tipoReferencia: comprobante.TipoReferencia,
      idUsuarioCreacion: comprobante.IdUsuarioCreacion,
      movimientos
    });
  } catch (error: any) {
    console.error('Error al obtener asiento contable:', error);
    return handleDBError(error, res, 'Error al obtener el asiento contable');
  }
});

// Iniciar servidor
// =============================================
// Endpoints de Punto de Venta (POS)
// =============================================

// GET /api/pos/configuracion - Obtener configuración POS
app.get('/api/pos/configuracion', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    const pool = await getConnection();

    const result = await pool.request()
      .input('idEmpresa', sql.Int, idEmpresa || 1)
      .query(`
        SELECT TOP 1
          IdConfiguracionPOS,
          BloquearModificacionPrecio,
          BloquearModificacionIVA,
          BloquearModificacionTotal,
          PermitirDescuentos,
          PorcentajeDescuentoMaximo,
          UsarCodigoBarras,
          MostrarStock,
          ValidarStock,
          RequerirCliente,
          ClientePorDefecto,
          VendedorPorDefecto,
          IdEmpresa
        FROM ConfiguracionPOS
        WHERE IdEmpresa = @idEmpresa AND Activo = 1
        ORDER BY IdConfiguracionPOS DESC
      `);

    if (result.recordset.length === 0) {
      // Retornar configuración por defecto si no existe
      return res.json({
        bloquearModificacionPrecio: false,
        bloquearModificacionIVA: true,
        bloquearModificacionTotal: true,
        permitirDescuentos: true,
        porcentajeDescuentoMaximo: 10.00,
        usarCodigoBarras: true,
        mostrarStock: true,
        validarStock: true,
        requerirCliente: false,
        clientePorDefecto: null,
        vendedorPorDefecto: null,
        idEmpresa: idEmpresa || 1
      });
    }

    const config = result.recordset[0];
    res.json({
      bloquearModificacionPrecio: config.BloquearModificacionPrecio,
      bloquearModificacionIVA: config.BloquearModificacionIVA,
      bloquearModificacionTotal: config.BloquearModificacionTotal,
      permitirDescuentos: config.PermitirDescuentos,
      porcentajeDescuentoMaximo: config.PorcentajeDescuentoMaximo ? parseFloat(config.PorcentajeDescuentoMaximo) : null,
      usarCodigoBarras: config.UsarCodigoBarras,
      mostrarStock: config.MostrarStock,
      validarStock: config.ValidarStock,
      requerirCliente: config.RequerirCliente,
      clientePorDefecto: config.ClientePorDefecto,
      vendedorPorDefecto: config.VendedorPorDefecto,
      idEmpresa: config.IdEmpresa
    });
  } catch (error: any) {
    console.error('Error al obtener configuración POS:', error);

    // Si la tabla no existe, retornar configuración por defecto
    const idEmpresaError = req.query.idEmpresa ? parseInt(req.query.idEmpresa as string) : 1;

    if (error?.message && (
      error.message.includes('Invalid object name') ||
      error.message.includes('no existe') ||
      error.message.includes('does not exist') ||
      error.code === 'EREQUEST'
    )) {
      console.log('⚠️  Tabla ConfiguracionPOS no existe, usando configuración por defecto');
      return res.json({
        bloquearModificacionPrecio: false,
        bloquearModificacionIVA: true,
        bloquearModificacionTotal: true,
        permitirDescuentos: true,
        porcentajeDescuentoMaximo: 10.00,
        usarCodigoBarras: true,
        mostrarStock: true,
        validarStock: true,
        requerirCliente: false,
        clientePorDefecto: null,
        vendedorPorDefecto: null,
        idEmpresa: idEmpresaError
      });
    }

    return handleDBError(error, res, 'Error al obtener la configuración del punto de venta');
  }
});

// PUT /api/pos/configuracion - Actualizar configuración POS
app.put('/api/pos/configuracion', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      bloquearModificacionPrecio,
      bloquearModificacionIVA,
      bloquearModificacionTotal,
      permitirDescuentos,
      porcentajeDescuentoMaximo,
      usarCodigoBarras,
      mostrarStock,
      validarStock,
      requerirCliente,
      clientePorDefecto,
      vendedorPorDefecto,
      idEmpresa,
      idUsuarioModificacion
    } = req.body;

    const pool = await getConnection();

    // Verificar si existe configuración activa
    const existeResult = await transaction.request()
      .input('idEmpresa', sql.Int, idEmpresa || 1)
      .query(`
        SELECT IdConfiguracionPOS
        FROM ConfiguracionPOS
        WHERE IdEmpresa = @idEmpresa AND Activo = 1
      `);

    if (existeResult.recordset.length > 0) {
      // Actualizar configuración existente
      const idConfig = existeResult.recordset[0].IdConfiguracionPOS;

      await transaction.request()
        .input('idConfig', sql.Int, idConfig)
        .input('bloquearPrecio', sql.Bit, bloquearModificacionPrecio || 0)
        .input('bloquearIVA', sql.Bit, bloquearModificacionIVA || 0)
        .input('bloquearTotal', sql.Bit, bloquearModificacionTotal || 0)
        .input('permitirDescuentos', sql.Bit, permitirDescuentos !== undefined ? permitirDescuentos : 1)
        .input('descuentoMaximo', sql.Decimal(5, 2), porcentajeDescuentoMaximo || null)
        .input('usarCodigoBarras', sql.Bit, usarCodigoBarras !== undefined ? usarCodigoBarras : 1)
        .input('mostrarStock', sql.Bit, mostrarStock !== undefined ? mostrarStock : 1)
        .input('validarStock', sql.Bit, validarStock !== undefined ? validarStock : 1)
        .input('requerirCliente', sql.Bit, requerirCliente || 0)
        .input('clienteDefecto', sql.Int, clientePorDefecto || null)
        .input('vendedorDefecto', sql.Int, vendedorPorDefecto || null)
        .input('idUsuario', sql.Int, idUsuarioModificacion || 1)
        .query(`
          UPDATE ConfiguracionPOS
          SET
            BloquearModificacionPrecio = @bloquearPrecio,
            BloquearModificacionIVA = @bloquearIVA,
            BloquearModificacionTotal = @bloquearTotal,
            PermitirDescuentos = @permitirDescuentos,
            PorcentajeDescuentoMaximo = @descuentoMaximo,
            UsarCodigoBarras = @usarCodigoBarras,
            MostrarStock = @mostrarStock,
            ValidarStock = @validarStock,
            RequerirCliente = @requerirCliente,
            ClientePorDefecto = @clienteDefecto,
            VendedorPorDefecto = @vendedorDefecto,
            FechaModificacion = GETDATE(),
            IdUsuarioModificacion = @idUsuario
          WHERE IdConfiguracionPOS = @idConfig
        `);
    } else {
      // Crear nueva configuración
      await transaction.request()
        .input('bloquearPrecio', sql.Bit, bloquearModificacionPrecio || 0)
        .input('bloquearIVA', sql.Bit, bloquearModificacionIVA || 0)
        .input('bloquearTotal', sql.Bit, bloquearModificacionTotal || 0)
        .input('permitirDescuentos', sql.Bit, permitirDescuentos !== undefined ? permitirDescuentos : 1)
        .input('descuentoMaximo', sql.Decimal(5, 2), porcentajeDescuentoMaximo || null)
        .input('usarCodigoBarras', sql.Bit, usarCodigoBarras !== undefined ? usarCodigoBarras : 1)
        .input('mostrarStock', sql.Bit, mostrarStock !== undefined ? mostrarStock : 1)
        .input('validarStock', sql.Bit, validarStock !== undefined ? validarStock : 1)
        .input('requerirCliente', sql.Bit, requerirCliente || 0)
        .input('clienteDefecto', sql.Int, clientePorDefecto || null)
        .input('vendedorDefecto', sql.Int, vendedorPorDefecto || null)
        .input('idEmpresa', sql.Int, idEmpresa || 1)
        .input('idUsuario', sql.Int, idUsuarioModificacion || 1)
        .query(`
          INSERT INTO ConfiguracionPOS (
            BloquearModificacionPrecio, BloquearModificacionIVA, BloquearModificacionTotal,
            PermitirDescuentos, PorcentajeDescuentoMaximo, UsarCodigoBarras,
            MostrarStock, ValidarStock, RequerirCliente,
            ClientePorDefecto, VendedorPorDefecto, IdEmpresa, IdUsuarioCreacion
          )
          VALUES (
            @bloquearPrecio, @bloquearIVA, @bloquearTotal,
            @permitirDescuentos, @descuentoMaximo, @usarCodigoBarras,
            @mostrarStock, @validarStock, @requerirCliente,
            @clienteDefecto, @vendedorDefecto, @idEmpresa, @idUsuario
          )
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      mensaje: 'Configuración del punto de venta actualizada correctamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al actualizar configuración POS:', error);
    return handleDBError(error, res, 'Error al actualizar la configuración del punto de venta');
  }
});

// POST /api/pos/venta-rapida - Realizar venta rápida desde POS
app.post('/api/pos/venta-rapida', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());

  try {
    await transaction.begin();

    const {
      fecha,
      idCliente,
      idVendedor,
      idEmpresa,
      detalles,
      idUsuarioCreacion
    } = req.body;

    if (!fecha || !detalles || detalles.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'Fecha y al menos un detalle son requeridos'
      });
    }

    const pool = await getConnection();

    // Obtener configuración POS
    const configResult = await transaction.request()
      .input('idEmpresa', sql.Int, idEmpresa || 1)
      .query(`
        SELECT TOP 1
          BloquearModificacionPrecio,
          BloquearModificacionIVA,
          BloquearModificacionTotal,
          ValidarStock,
          RequerirCliente,
          ClientePorDefecto,
          VendedorPorDefecto
        FROM ConfiguracionPOS
        WHERE IdEmpresa = @idEmpresa AND Activo = 1
        ORDER BY IdConfiguracionPOS DESC
      `);

    const config = configResult.recordset.length > 0 ? configResult.recordset[0] : {
      BloquearModificacionPrecio: false,
      BloquearModificacionIVA: true,
      BloquearModificacionTotal: true,
      ValidarStock: true,
      RequerirCliente: false,
      ClientePorDefecto: null,
      VendedorPorDefecto: null
    };

    // Validar cliente si es requerido
    let idClienteFinal = idCliente || config.ClientePorDefecto;
    if (config.RequerirCliente && !idClienteFinal) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'CLIENTE_REQUERIDO',
        mensaje: 'El cliente es obligatorio según la configuración del POS'
      });
    }

    // Usar vendedor por defecto si no se proporciona
    const idVendedorFinal = idVendedor || config.VendedorPorDefecto;

    // Validar stock si está habilitado
    if (config.ValidarStock) {
      for (const det of detalles) {
        const stockResult = await transaction.request()
          .input('idProducto', sql.Int, det.idProducto)
          .query('SELECT CantidadStock FROM Productos WHERE IdProducto = @idProducto');

        if (stockResult.recordset.length === 0) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'PRODUCTO_NO_ENCONTRADO',
            mensaje: `El producto con ID ${det.idProducto} no existe`
          });
        }

        const stock = stockResult.recordset[0].CantidadStock;
        if (stock < det.cantidad) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: 'STOCK_INSUFICIENTE',
            mensaje: `Stock insuficiente para el producto. Disponible: ${stock}, Solicitado: ${det.cantidad}`
          });
        }
      }
    }

    // Generar número de factura
    const numeroFactura = await generarNumeroFactura(pool, fecha);

    // Calcular totales respetando configuraciones
    let subtotal = 0;
    let ivaTotal = 0;

    for (const det of detalles) {
      // Obtener precio e IVA del producto si están bloqueados
      let precio = det.precioUnitario;
      let porcentajeIVA = det.iva || 0;

      if (config.BloquearModificacionPrecio || !det.precioUnitario) {
        const prodResult = await transaction.request()
          .input('idProducto', sql.Int, det.idProducto)
          .query('SELECT PrecioVenta, IVA FROM Productos WHERE IdProducto = @idProducto');

        if (prodResult.recordset.length > 0) {
          precio = parseFloat(prodResult.recordset[0].PrecioVenta);
          porcentajeIVA = parseFloat(prodResult.recordset[0].IVA || 0);
        }
      }

      if (config.BloquearModificacionIVA) {
        const prodResult = await transaction.request()
          .input('idProducto', sql.Int, det.idProducto)
          .query('SELECT IVA FROM Productos WHERE IdProducto = @idProducto');

        if (prodResult.recordset.length > 0) {
          porcentajeIVA = parseFloat(prodResult.recordset[0].IVA || 0);
        }
      }

      const subtotalDetalle = (det.cantidad * precio) - (det.descuento || 0);
      const ivaDetalle = subtotalDetalle * (porcentajeIVA / 100);

      subtotal += subtotalDetalle;
      ivaTotal += ivaDetalle;
    }

    const total = config.BloquearModificacionTotal
      ? subtotal + ivaTotal
      : (req.body.total || subtotal + ivaTotal);

    // Validar cliente - SIEMPRE se requiere un cliente (la tabla Facturas tiene IdCliente NOT NULL)
    if (!idClienteFinal) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'CLIENTE_REQUERIDO',
        mensaje: 'Se requiere un cliente para crear la factura'
      });
    }

    const clienteResult = await transaction.request()
      .input('idCliente', sql.Int, idClienteFinal)
      .query('SELECT IdTercero FROM Clientes WHERE IdCliente = @idCliente AND Activo = 1');

    if (clienteResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'CLIENTE_INVALIDO',
        mensaje: 'El cliente especificado no existe o está inactivo'
      });
    }

    const idTerceroCliente = clienteResult.recordset[0].IdTercero;

    // Insertar factura (reutilizar lógica existente)
    const facturaResult = await transaction.request()
      .input('numeroFactura', sql.VarChar(20), numeroFactura)
      .input('fecha', sql.Date, fecha)
      .input('idTerceroCliente', sql.Int, idTerceroCliente)
      .input('subtotal', sql.Decimal(18, 2), subtotal)
      .input('iva', sql.Decimal(18, 2), ivaTotal)
      .input('total', sql.Decimal(18, 2), total)
      .input('estado', sql.VarChar(20), 'Confirmada')
      .input('idVendedor', sql.Int, idVendedorFinal)
      .input('idEmpresa', sql.Int, idEmpresa || 1)
      .input('idUsuarioCreacion', sql.Int, idUsuarioCreacion || 1)
      .query(`
        INSERT INTO Facturas (
          NumeroFactura, Fecha, IdCliente, Subtotal, IVA, Total, Estado,
          IdVendedor, IdEmpresa, IdUsuarioCreacion
        )
        OUTPUT INSERTED.IdFactura
        VALUES (
          @numeroFactura, @fecha, @idTerceroCliente, @subtotal, @iva, @total, @estado,
          @idVendedor, @idEmpresa, @idUsuarioCreacion
        )
      `);

    const idFactura = facturaResult.recordset[0].IdFactura;

    // Insertar detalles y actualizar inventario
    for (const det of detalles) {
      let precio = det.precioUnitario;
      let porcentajeIVA = det.iva || 0;

      if (config.BloquearModificacionPrecio || !det.precioUnitario) {
        const prodResult = await transaction.request()
          .input('idProducto', sql.Int, det.idProducto)
          .query('SELECT PrecioVenta, IVA FROM Productos WHERE IdProducto = @idProducto');

        if (prodResult.recordset.length > 0) {
          precio = parseFloat(prodResult.recordset[0].PrecioVenta);
          porcentajeIVA = parseFloat(prodResult.recordset[0].IVA || 0);
        }
      }

      if (config.BloquearModificacionIVA) {
        const prodResult = await transaction.request()
          .input('idProducto', sql.Int, det.idProducto)
          .query('SELECT IVA FROM Productos WHERE IdProducto = @idProducto');

        if (prodResult.recordset.length > 0) {
          porcentajeIVA = parseFloat(prodResult.recordset[0].IVA || 0);
        }
      }

      const subtotalDetalle = (det.cantidad * precio) - (det.descuento || 0);
      const ivaDetalle = subtotalDetalle * (porcentajeIVA / 100);

      await transaction.request()
        .input('idFactura', sql.Int, idFactura)
        .input('idProducto', sql.Int, det.idProducto)
        .input('cantidad', sql.Decimal(18, 3), det.cantidad)
        .input('precioUnitario', sql.Decimal(18, 2), precio)
        .input('descuento', sql.Decimal(18, 2), det.descuento || 0)
        .input('subtotal', sql.Decimal(18, 2), subtotalDetalle)
        .input('iva', sql.Decimal(5, 2), porcentajeIVA)
        .input('total', sql.Decimal(18, 2), subtotalDetalle + ivaDetalle)
        .query(`
          INSERT INTO DetalleFactura (
            IdFactura, IdProducto, Cantidad, PrecioUnitario, Descuento,
            Subtotal, IVA, Total
          )
          VALUES (
            @idFactura, @idProducto, @cantidad, @precioUnitario, @descuento,
            @subtotal, @iva, @total
          )
        `);

      // Actualizar inventario (solo si se valida stock)
      if (config.ValidarStock) {
        await transaction.request()
          .input('idProducto', sql.Int, det.idProducto)
          .input('cantidad', sql.Decimal(18, 3), det.cantidad)
          .query(`
            UPDATE Inventario
            SET Cantidad = Cantidad - @cantidad,
                FechaUltimaActualizacion = GETDATE()
            WHERE IdProducto = @idProducto
          `);
      }
    }

    // Crear asiento contable automático (opcional - se omite por ahora para ventas rápidas)
    // El asiento contable se puede crear manualmente o mediante otro proceso
    console.log(`📊 Factura ${numeroFactura} creada sin asiento contable automático (venta rápida POS)`);

    await transaction.commit();

    res.json({
      success: true,
      idFactura,
      numeroFactura,
      total,
      mensaje: 'Venta realizada exitosamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al realizar venta rápida:', error);
    return handleDBError(error, res, 'Error al realizar la venta rápida');
  }
});

// =============================================
// Endpoints: DIAN - Sincronización
// =============================================

// GET /api/dian/configuracion - Obtener configuración DIAN
app.get('/api/dian/configuracion', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    
    if (!idEmpresa) {
      return res.status(400).json({
        success: false,
        error: 'ID_EMPRESA_REQUERIDO',
        mensaje: 'El ID de empresa es requerido'
      });
    }

    const pool = await getConnection();
    const config = await obtenerConfiguracionDIAN(pool, parseInt(idEmpresa as string));

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'CONFIGURACION_NO_ENCONTRADA',
        mensaje: 'No se encontró configuración DIAN para la empresa'
      });
    }

    // No retornar contraseñas
    res.json({
      success: true,
      configuracion: {
        idConfiguracion: config.idConfiguracion,
        idEmpresa: config.idEmpresa,
        ambiente: config.ambiente,
        usuarioDIAN: config.usuarioDIAN,
        fechaVencimientoCertificado: config.fechaVencimientoCertificado,
        urlProduccion: config.urlProduccion,
        urlPruebas: config.urlPruebas,
        softwareId: config.softwareId,
        tieneCertificado: config.certificadoDigital !== null
      }
    });
  } catch (error: any) {
    console.error('Error al obtener configuración DIAN:', error);
    return handleDBError(error, res, 'Error al obtener la configuración DIAN');
  }
});

// PUT /api/dian/configuracion - Actualizar configuración DIAN
app.put('/api/dian/configuracion', async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());
  
  try {
    await transaction.begin();

    const {
      idEmpresa,
      ambiente,
      usuarioDIAN,
      passwordDIAN,
      passwordCertificado,
      fechaVencimientoCertificado,
      urlProduccion,
      urlPruebas,
      softwareId,
      pinSoftware
    } = req.body;

    if (!idEmpresa) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'ID_EMPRESA_REQUERIDO',
        mensaje: 'El ID de empresa es requerido'
      });
    }

    // Verificar si existe configuración
    const existeResult = await transaction.request()
      .input('idEmpresa', sql.Int, idEmpresa)
      .query('SELECT IdConfiguracion FROM ConfiguracionDIAN WHERE IdEmpresa = @idEmpresa AND Activo = 1');

    if (existeResult.recordset.length > 0) {
      // Actualizar configuración existente
      const idConfiguracion = existeResult.recordset[0].IdConfiguracion;
      
      const updateQuery = transaction.request();
      let query = `
        UPDATE ConfiguracionDIAN
        SET Ambiente = @ambiente,
            UsuarioDIAN = @usuarioDIAN,
            FechaModificacion = GETDATE()
      `;

      updateQuery.input('idConfiguracion', sql.Int, idConfiguracion);
      updateQuery.input('ambiente', sql.VarChar(20), ambiente || 'Pruebas');
      updateQuery.input('usuarioDIAN', sql.VarChar(100), usuarioDIAN || '');

      if (passwordDIAN) {
        query += ', PasswordDIAN = @passwordDIAN';
        updateQuery.input('passwordDIAN', sql.NVarChar(500), encrypt(passwordDIAN));
      }

      if (passwordCertificado) {
        query += ', PasswordCertificado = @passwordCertificado';
        updateQuery.input('passwordCertificado', sql.NVarChar(500), encrypt(passwordCertificado));
      }

      if (fechaVencimientoCertificado) {
        query += ', FechaVencimientoCertificado = @fechaVencimientoCertificado';
        updateQuery.input('fechaVencimientoCertificado', sql.Date, fechaVencimientoCertificado);
      }

      if (urlProduccion) {
        query += ', URLProduccion = @urlProduccion';
        updateQuery.input('urlProduccion', sql.NVarChar(500), urlProduccion);
      }

      if (urlPruebas) {
        query += ', URLPruebas = @urlPruebas';
        updateQuery.input('urlPruebas', sql.NVarChar(500), urlPruebas);
      }

      if (softwareId) {
        query += ', SoftwareId = @softwareId';
        updateQuery.input('softwareId', sql.NVarChar(100), softwareId);
      }

      if (pinSoftware) {
        query += ', PinSoftware = @pinSoftware';
        updateQuery.input('pinSoftware', sql.NVarChar(100), pinSoftware);
      }

      query += ' WHERE IdConfiguracion = @idConfiguracion';

      await updateQuery.query(query);
    } else {
      // Crear nueva configuración
      await transaction.request()
        .input('idEmpresa', sql.Int, idEmpresa)
        .input('ambiente', sql.VarChar(20), ambiente || 'Pruebas')
        .input('usuarioDIAN', sql.VarChar(100), usuarioDIAN || '')
        .input('passwordDIAN', sql.NVarChar(500), passwordDIAN ? encrypt(passwordDIAN) : null)
        .input('passwordCertificado', sql.NVarChar(500), passwordCertificado ? encrypt(passwordCertificado) : null)
        .input('fechaVencimientoCertificado', sql.Date, fechaVencimientoCertificado || null)
        .input('urlProduccion', sql.NVarChar(500), urlProduccion || 'https://vpfe.dian.gov.co')
        .input('urlPruebas', sql.NVarChar(500), urlPruebas || 'https://vpfe-hab.dian.gov.co')
        .input('softwareId', sql.NVarChar(100), softwareId || null)
        .input('pinSoftware', sql.NVarChar(100), pinSoftware || null)
        .query(`
          INSERT INTO ConfiguracionDIAN (
            IdEmpresa, Ambiente, UsuarioDIAN, PasswordDIAN, PasswordCertificado,
            FechaVencimientoCertificado, URLProduccion, URLPruebas, SoftwareId, PinSoftware, Activo
          )
          VALUES (
            @idEmpresa, @ambiente, @usuarioDIAN, @passwordDIAN, @passwordCertificado,
            @fechaVencimientoCertificado, @urlProduccion, @urlPruebas, @softwareId, @pinSoftware, 1
          )
        `);
    }

    await transaction.commit();

    res.json({
      success: true,
      mensaje: 'Configuración DIAN actualizada correctamente'
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al actualizar configuración DIAN:', error);
    return handleDBError(error, res, 'Error al actualizar la configuración DIAN');
  }
});

// POST /api/dian/sincronizar - Sincronizar facturas desde DIAN
app.post('/api/dian/sincronizar', async (req, res) => {
  try {
    const { idEmpresa, fechaDesde, fechaHasta, tipoDocumento } = req.body;

    if (!idEmpresa || !fechaDesde || !fechaHasta) {
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'idEmpresa, fechaDesde y fechaHasta son requeridos'
      });
    }

    const fechaDesdeDate = new Date(fechaDesde);
    const fechaHastaDate = new Date(fechaHasta);

    if (isNaN(fechaDesdeDate.getTime()) || isNaN(fechaHastaDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'FECHAS_INVALIDAS',
        mensaje: 'Las fechas proporcionadas no son válidas'
      });
    }

    const pool = await getConnection();
    
    let resultado;
    
    if (tipoDocumento === 'Compras') {
      // TODO: Implementar sincronización de compras
      resultado = {
        exito: false,
        documentosEncontrados: 0,
        documentosProcesados: 0,
        documentosConError: 0,
        errores: ['Sincronización de compras aún no implementada'],
        mensaje: 'Sincronización de compras pendiente de implementación'
      };
    } else {
      // Sincronizar facturas de venta
      resultado = await sincronizarFacturas(pool, idEmpresa, fechaDesdeDate, fechaHastaDate);
    }

    if (resultado.exito) {
      res.json({
        success: true,
        resultado
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'ERROR_SINCRONIZACION',
        resultado
      });
    }
  } catch (error: any) {
    console.error('Error al sincronizar con DIAN:', error);
    return handleDBError(error, res, 'Error al sincronizar con DIAN');
  }
});

// GET /api/dian/estado/:cufe - Consultar estado de factura por CUFE
app.get('/api/dian/estado/:cufe', async (req, res) => {
  try {
    const { cufe } = req.params;

    if (!cufe) {
      return res.status(400).json({
        success: false,
        error: 'CUFE_REQUERIDO',
        mensaje: 'El CUFE es requerido'
      });
    }

    const pool = await getConnection();
    const estado = await consultarEstadoFactura(pool, cufe);

    if (!estado) {
      return res.status(404).json({
        success: false,
        error: 'ESTADO_NO_ENCONTRADO',
        mensaje: 'No se encontró información para el CUFE proporcionado'
      });
    }

    res.json({
      success: true,
      estado
    });
  } catch (error: any) {
    console.error('Error al consultar estado de factura:', error);
    return handleDBError(error, res, 'Error al consultar el estado de la factura');
  }
});

// GET /api/dian/descargar/:cufe - Descargar XML de factura por CUFE
app.get('/api/dian/descargar/:cufe', async (req, res) => {
  try {
    const { cufe } = req.params;
    const { idEmpresa } = req.query;

    if (!cufe || !idEmpresa) {
      return res.status(400).json({
        success: false,
        error: 'DATOS_INCOMPLETOS',
        mensaje: 'CUFE e idEmpresa son requeridos'
      });
    }

    const pool = await getConnection();
    
    // Obtener configuración DIAN
    const config = await obtenerConfiguracionDIAN(pool, parseInt(idEmpresa as string));
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'CONFIGURACION_NO_ENCONTRADA',
        mensaje: 'No se encontró configuración DIAN para la empresa'
      });
    }

    // Obtener TrackId del evento
    const eventoResult = await pool.request()
      .input('cufe', sql.VarChar(100), cufe)
      .query('SELECT TOP 1 TrackId FROM EventosDIAN WHERE CUFE = @cufe ORDER BY FechaConsulta DESC');

    if (eventoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'TRACKID_NO_ENCONTRADO',
        mensaje: 'No se encontró TrackId para el CUFE proporcionado'
      });
    }

    const trackId = eventoResult.recordset[0].TrackId;

    // Descargar XML
    const xml = await descargarXMLFactura(config, trackId);

    // Actualizar XML en la factura si existe
    await pool.request()
      .input('cufe', sql.VarChar(100), cufe)
      .input('xml', sql.Xml, xml)
      .query(`
        UPDATE Facturas
        SET XMLFactura = @xml
        WHERE CUFE = @cufe
      `);

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error: any) {
    console.error('Error al descargar XML de factura:', error);
    return handleDBError(error, res, 'Error al descargar el XML de la factura');
  }
});

// GET /api/dian/test - Probar conexión con DIAN (ambiente de pruebas)
app.get('/api/dian/test', async (req, res) => {
  try {
    const { idEmpresa } = req.query;

    if (!idEmpresa) {
      return res.status(400).json({
        success: false,
        error: 'ID_EMPRESA_REQUERIDO',
        mensaje: 'El ID de empresa es requerido'
      });
    }

    const pool = await getConnection();
    const config = await obtenerConfiguracionDIAN(pool, parseInt(idEmpresa as string));

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'CONFIGURACION_NO_ENCONTRADA',
        mensaje: 'No se encontró configuración DIAN para la empresa. Configure primero usando PUT /api/dian/configuracion',
        sugerencia: 'Use PUT /api/dian/configuracion para configurar las credenciales DIAN'
      });
    }

    // Información de la configuración (sin credenciales sensibles)
    const info = {
      idEmpresa: config.idEmpresa,
      ambiente: config.ambiente,
      usuarioDIAN: config.usuarioDIAN,
      url: config.ambiente === 'Produccion' ? config.urlProduccion : config.urlPruebas,
      softwareId: config.softwareId,
      tieneCertificado: config.certificadoDigital !== null,
      fechaVencimientoCertificado: config.fechaVencimientoCertificado
    };

    // Validar certificado si existe
    if (config.fechaVencimientoCertificado) {
      const hoy = new Date();
      const diasRestantes = Math.ceil(
        (config.fechaVencimientoCertificado.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasRestantes < 0) {
        return res.status(400).json({
          success: false,
          error: 'CERTIFICADO_EXPIRADO',
          mensaje: 'El certificado digital ha vencido. Por favor, renueve el certificado.',
          info
        });
      } else if (diasRestantes < 30) {
        info['advertencia'] = `El certificado vence en ${diasRestantes} días`;
      }
    }

    // Intentar crear cliente SOAP (prueba de conexión básica)
    let testConexion = {
      exitoso: false,
      mensaje: '',
      detalles: ''
    };

    try {
      const wsdlUrl = config.ambiente === 'Produccion'
        ? `${config.urlProduccion}/WcfDianCustomerServices.svc?wsdl`
        : `${config.urlPruebas}/WcfDianCustomerServices.svc?wsdl`;

      // Solo verificar que la URL sea accesible (sin crear cliente completo)
      const axios = require('axios');
      const response = await axios.get(wsdlUrl, {
        timeout: 5000,
        validateStatus: (status: number) => status < 500 // Aceptar incluso errores de autenticación
      });

      testConexion.exitoso = true;
      testConexion.mensaje = 'URL accesible';
      testConexion.detalles = `Código HTTP: ${response.status}`;
    } catch (error: any) {
      testConexion.mensaje = 'Error al verificar conexión';
      testConexion.detalles = error.message || 'No se pudo acceder a la URL del servicio DIAN';
      
      // Errores comunes
      if (error.code === 'ECONNREFUSED') {
        testConexion.detalles = 'No se pudo conectar al servidor. Verifique la URL y su conexión a internet.';
      } else if (error.code === 'ETIMEDOUT') {
        testConexion.detalles = 'Timeout al conectar. El servidor no respondió a tiempo.';
      } else if (error.response) {
        testConexion.exitoso = true; // La URL existe, pero puede requerir autenticación
        testConexion.detalles = `URL accesible pero requiere autenticación (${error.response.status})`;
      }
    }

    res.json({
      success: true,
      mensaje: 'Configuración DIAN verificada',
      info,
      testConexion,
      recomendaciones: [
        config.ambiente === 'Produccion' 
          ? '⚠️ Está configurado en ambiente de PRODUCCIÓN. Use con precaución.'
          : '✅ Configurado en ambiente de PRUEBAS',
        !config.certificadoDigital 
          ? '⚠️ No hay certificado digital configurado. La sincronización puede fallar.'
          : '✅ Certificado digital configurado',
        !config.softwareId || !config.pinSoftware
          ? '⚠️ Software ID o PIN no configurados. Puede ser requerido para algunas operaciones.'
          : '✅ Software ID y PIN configurados'
      ]
    });
  } catch (error: any) {
    console.error('Error al probar conexión DIAN:', error);
    return handleDBError(error, res, 'Error al probar la conexión con DIAN');
  }
});

// GET /api/dian/logs - Obtener logs de sincronización
app.get('/api/dian/logs', async (req, res) => {
  try {
    const { idEmpresa, limite = 50 } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT TOP ${limite}
        IdLog,
        IdEmpresa,
        FechaInicio,
        FechaFin,
        TipoSincronizacion,
        RangoFechas,
        DocumentosEncontrados,
        DocumentosProcesados,
        DocumentosConError,
        Estado,
        MensajeError
      FROM LogSincronizacionDIAN
      WHERE 1=1
    `;

    const request = pool.request();

    if (idEmpresa) {
      query += ' AND IdEmpresa = @idEmpresa';
      request.input('idEmpresa', sql.Int, parseInt(idEmpresa as string));
    }

    query += ' ORDER BY FechaInicio DESC';

    const result = await request.query(query);

    res.json({
      success: true,
      logs: result.recordset.map((log: any) => ({
        idLog: log.IdLog,
        idEmpresa: log.IdEmpresa,
        fechaInicio: log.FechaInicio,
        fechaFin: log.FechaFin,
        tipoSincronizacion: log.TipoSincronizacion,
        rangoFechas: log.RangoFechas,
        documentosEncontrados: log.DocumentosEncontrados,
        documentosProcesados: log.DocumentosProcesados,
        documentosConError: log.DocumentosConError,
        estado: log.Estado,
        mensajeError: log.MensajeError
      }))
    });
  } catch (error: any) {
    console.error('Error al obtener logs de sincronización:', error);
    return handleDBError(error, res, 'Error al obtener los logs de sincronización');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Monitoreo de errores activado`);

  // Mostrar información de zona horaria
  const infoTZ = getInfoZonaHoraria();
  console.log(`\n🕐 Configuración de Zona Horaria:`);
  console.log(`   Zona: ${infoTZ.zonaHoraria}`);
  console.log(`   Offset: ${infoTZ.offset}`);
  console.log(`   Fecha actual: ${infoTZ.fechaActual}`);
  console.log(`   Hora actual: ${infoTZ.fechaHoraActual}\n`);
}).on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
  } else {
    console.error('❌ Error al iniciar el servidor:', error);
  }
  process.exit(1);
});

// Intentar conectar a la base de datos (no bloqueante)
getConnection().catch((error) => {
  console.error('');
  console.error('⚠️  ADVERTENCIA: No se pudo conectar a la base de datos');
  console.error('   El servidor continuará funcionando pero las operaciones de BD fallarán');
  console.error('');
  console.error('📋 Pasos para resolver:');
  console.error('   1. Verificar que SQL Server esté ejecutándose');
  console.error('   2. Ejecutar el script database/schema.sql para crear la BD');
  console.error('   3. Verificar la cadena de conexión en server.ts');
  console.error('');
  console.error('   Error:', error.message);
  console.error('');
});

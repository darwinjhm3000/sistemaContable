# 🔧 Mejoras Críticas - Guía de Implementación

Este documento contiene ejemplos de código para implementar las mejoras críticas identificadas en la validación.

---

## 1. 🔐 Seguridad - Autenticación con JWT

### 1.1 Instalar Dependencias

```bash
cd backend
npm install jsonwebtoken bcrypt
npm install --save-dev @types/jsonwebtoken @types/bcrypt
```

### 1.2 Crear Middleware de Autenticación

**Archivo: `backend/src/middleware/auth.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';

export interface AuthRequest extends Request {
  userId?: number;
  usuario?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token no proporcionado',
      mensaje: 'Se requiere autenticación para acceder a este recurso'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; usuario: string };
    req.userId = decoded.userId;
    req.usuario = decoded.usuario;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Token inválido',
      mensaje: 'El token de autenticación no es válido o ha expirado'
    });
  }
};
```

### 1.3 Actualizar Login con Hash y JWT

**Actualizar: `backend/src/server.ts` - Endpoint POST /api/login`**

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cambiar-en-produccion';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
        .query(`
          SELECT IdUsuario, Usuario, Nombre, Email, Contraseña
          FROM Usuarios
          WHERE Usuario = @usuario
            AND Activo = 1
        `);

      if (result.recordset.length === 0) {
        return res.status(401).json({
          success: false,
          mensaje: 'Usuario o contraseña incorrectos'
        });
      }

      const user = result.recordset[0];

      // Verificar contraseña con bcrypt
      const passwordMatch = await bcrypt.compare(contraseña, user.Contraseña);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          mensaje: 'Usuario o contraseña incorrectos'
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        {
          userId: user.IdUsuario,
          usuario: user.Usuario
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        success: true,
        token,
        usuario: {
          idUsuario: user.IdUsuario,
          usuario: user.Usuario,
          nombre: user.Nombre,
          email: user.Email
        }
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
```

### 1.4 Proteger Endpoints

**Actualizar: `backend/src/server.ts`**

```typescript
import { authenticateToken } from './middleware/auth';

// Proteger todos los endpoints excepto login y health
app.get('/api/puc', authenticateToken, async (req, res) => {
  // ... código existente
});

app.get('/api/terceros', authenticateToken, async (req, res) => {
  // ... código existente
});

app.post('/api/asientos', authenticateToken, async (req, res) => {
  // ... código existente
});

// Aplicar a todos los demás endpoints...
```

---

## 2. 📊 Integración Contable - Asientos Automáticos

### 2.1 Función Helper para Crear Asientos

**Archivo: `backend/src/services/contabilidad.ts`**

```typescript
import sql from 'mssql';
import { ConnectionPool } from 'mssql';

export interface AsientoAutomatico {
  fecha: string;
  descripcion: string;
  movimientos: Array<{
    codigoCuenta: string;
    idTercero?: number;
    valorDebito: number;
    valorCredito: number;
  }>;
  idUsuarioCreacion: number;
  referencia?: string;
  tipoReferencia?: string;
}

export async function crearAsientoAutomatico(
  pool: ConnectionPool,
  asiento: AsientoAutomatico
): Promise<number> {
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Calcular totales
    const totalDebito = asiento.movimientos.reduce(
      (sum, mov) => sum + (mov.valorDebito || 0),
      0
    );
    const totalCredito = asiento.movimientos.reduce(
      (sum, mov) => sum + (mov.valorCredito || 0),
      0
    );

    // Validar partida doble
    if (Math.abs(totalDebito - totalCredito) > 0.01) {
      throw new Error('Los totales de débito y crédito no cuadran');
    }

    // Insertar cabecera del comprobante
    const comprobanteResult = await transaction.request()
      .input('fecha', sql.Date, asiento.fecha)
      .input('descripcion', sql.VarChar(500), asiento.descripcion)
      .input('totalDebito', sql.Decimal(18, 2), totalDebito)
      .input('totalCredito', sql.Decimal(18, 2), totalCredito)
      .input('idUsuarioCreacion', sql.Int, asiento.idUsuarioCreacion)
      .query(`
        INSERT INTO Comprobantes (Fecha, Descripcion, TotalDebito, TotalCredito, IdUsuarioCreacion)
        OUTPUT INSERTED.IdComprobante
        VALUES (@fecha, @descripcion, @totalDebito, @totalCredito, @idUsuarioCreacion)
      `);

    const idComprobante = comprobanteResult.recordset[0].IdComprobante;

    // Insertar detalles del comprobante
    for (const movimiento of asiento.movimientos) {
      await transaction.request()
        .input('idComprobante', sql.Int, idComprobante)
        .input('codigoCuenta', sql.VarChar(20), movimiento.codigoCuenta)
        .input('idTercero', sql.Int, movimiento.idTercero || null)
        .input('valorDebito', sql.Decimal(18, 2), movimiento.valorDebito || 0)
        .input('valorCredito', sql.Decimal(18, 2), movimiento.valorCredito || 0)
        .query(`
          INSERT INTO DetalleComprobante
            (IdComprobante, CodigoCuenta, IdTercero, ValorDebito, ValorCredito)
          VALUES
            (@idComprobante, @codigoCuenta, @idTercero, @valorDebito, @valorCredito)
        `);
    }

    await transaction.commit();
    return idComprobante;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### 2.2 Generar Asiento al Emitir Factura

**Actualizar: `backend/src/server.ts` - POST /api/facturas`**

```typescript
import { crearAsientoAutomatico } from './services/contabilidad';

app.post('/api/facturas', authenticateToken, async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());
  const authReq = req as AuthRequest;

  try {
    await transaction.begin();

    const { numeroFactura, fecha, idCliente, detalles, observaciones, estado, idUsuarioCreacion } = req.body;

    // ... validaciones existentes ...

    const idFactura = facturaResult.recordset[0].IdFactura;

    // ... insertar detalles de factura ...

    // Si la factura está emitida, generar asiento contable
    if (estado === 'Emitida') {
      const pool = await getConnection();

      // Obtener información del cliente
      const clienteResult = await pool.request()
        .input('idCliente', sql.Int, idCliente)
        .query('SELECT NombreRazonSocial FROM Terceros WHERE IdTercero = @idCliente');

      const nombreCliente = clienteResult.recordset[0]?.NombreRazonSocial || 'Cliente';

      // Crear asiento contable
      const movimientos = [
        {
          codigoCuenta: '130505', // Cuentas por Cobrar - Clientes
          idTercero: idCliente,
          valorDebito: total,
          valorCredito: 0
        },
        {
          codigoCuenta: '413500', // Ingresos Operacionales - Ventas
          valorDebito: 0,
          valorCredito: subtotal
        },
        {
          codigoCuenta: '240805', // IVA por Pagar
          valorDebito: 0,
          valorCredito: ivaTotal
        }
      ];

      await crearAsientoAutomatico(pool, {
        fecha,
        descripcion: `Factura ${numeroFactura} - ${nombreCliente}`,
        movimientos,
        idUsuarioCreacion: authReq.userId || idUsuarioCreacion || 1,
        referencia: idFactura.toString(),
        tipoReferencia: 'Factura'
      });
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      idFactura,
      mensaje: 'Factura creada exitosamente'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear factura:', error);
    res.status(500).json({
      error: 'Error al crear la factura',
      detalles: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});
```

### 2.3 Generar Asiento al Recibir Compra

**Actualizar: `backend/src/server.ts` - POST /api/compras`**

```typescript
app.post('/api/compras', authenticateToken, async (req, res) => {
  const transaction = new sql.Transaction(await getConnection());
  const authReq = req as AuthRequest;

  try {
    await transaction.begin();

    // ... código existente para crear compra ...

    // Si la compra está recibida, generar asiento contable
    if (estado === 'Recibida') {
      const pool = await getConnection();

      // Obtener información del proveedor
      const proveedorResult = await pool.request()
        .input('idProveedor', sql.Int, idProveedor)
        .query('SELECT NombreRazonSocial FROM Terceros WHERE IdTercero = @idProveedor');

      const nombreProveedor = proveedorResult.recordset[0]?.NombreRazonSocial || 'Proveedor';

      // Crear asiento contable
      const movimientos = [
        {
          codigoCuenta: '143505', // Inventario
          valorDebito: subtotal,
          valorCredito: 0
        },
        {
          codigoCuenta: '240805', // IVA Descontable
          valorDebito: ivaTotal,
          valorCredito: 0
        },
        {
          codigoCuenta: '220505', // Cuentas por Pagar - Proveedores
          idTercero: idProveedor,
          valorDebito: 0,
          valorCredito: total
        }
      ];

      await crearAsientoAutomatico(pool, {
        fecha,
        descripcion: `Compra ${numeroFactura || idCompra} - ${nombreProveedor}`,
        movimientos,
        idUsuarioCreacion: authReq.userId || idUsuarioCreacion || 1,
        referencia: idCompra.toString(),
        tipoReferencia: 'Compra'
      });
    }

    await transaction.commit();
    // ... resto del código ...
  } catch (error) {
    // ... manejo de errores ...
  }
});
```

---

## 3. ✅ Validación de Stock Antes de Facturar

**Actualizar: `backend/src/server.ts` - POST /api/facturas`**

```typescript
app.post('/api/facturas', authenticateToken, async (req, res) => {
  // ... código existente ...

  // Validar stock disponible antes de crear factura
  const pool = await getConnection();

  for (const detalle of detalles) {
    // Verificar stock disponible
    const stockResult = await pool.request()
      .input('idProducto', sql.Int, detalle.idProducto)
      .query(`
        SELECT i.Cantidad, p.Nombre
        FROM Inventario i
        INNER JOIN Productos p ON i.IdProducto = p.IdProducto
        WHERE i.IdProducto = @idProducto
      `);

    if (stockResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Producto sin registro de inventario',
        mensaje: `El producto ${detalle.idProducto} no tiene registro de inventario`
      });
    }

    const stockDisponible = parseFloat(stockResult.recordset[0].Cantidad);
    const nombreProducto = stockResult.recordset[0].Nombre;

    if (stockDisponible < detalle.cantidad) {
      return res.status(400).json({
        success: false,
        error: 'Stock insuficiente',
        mensaje: `Stock insuficiente para el producto "${nombreProducto}". Disponible: ${stockDisponible}, Solicitado: ${detalle.cantidad}`
      });
    }
  }

  // Si llegamos aquí, hay stock suficiente, proceder con la creación de la factura
  // ... resto del código ...
});
```

---

## 4. 🛡️ Validación de Entrada con express-validator

### 4.1 Instalar Dependencia

```bash
cd backend
npm install express-validator
```

### 4.2 Crear Validadores

**Archivo: `backend/src/validators/asientos.ts`**

```typescript
import { body, ValidationChain } from 'express-validator';

export const validarAsiento: ValidationChain[] = [
  body('fecha')
    .notEmpty().withMessage('La fecha es requerida')
    .isISO8601().withMessage('La fecha debe tener formato ISO (YYYY-MM-DD)'),

  body('descripcion')
    .notEmpty().withMessage('La descripción es requerida')
    .isLength({ min: 5, max: 500 }).withMessage('La descripción debe tener entre 5 y 500 caracteres'),

  body('movimientos')
    .isArray({ min: 2 }).withMessage('Debe haber al menos 2 movimientos contables'),

  body('movimientos.*.codigoCuenta')
    .notEmpty().withMessage('El código de cuenta es requerido')
    .matches(/^\d+$/).withMessage('El código de cuenta debe ser numérico'),

  body('movimientos.*.valorDebito')
    .isFloat({ min: 0 }).withMessage('El valor de débito debe ser un número >= 0'),

  body('movimientos.*.valorCredito')
    .isFloat({ min: 0 }).withMessage('El valor de crédito debe ser un número >= 0')
];
```

### 4.3 Usar Validadores en Endpoints

**Actualizar: `backend/src/server.ts`**

```typescript
import { validationResult } from 'express-validator';
import { validarAsiento } from './validators/asientos';

app.post('/api/asientos', authenticateToken, validarAsiento, async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      mensaje: 'Los datos proporcionados no son válidos',
      detalles: errors.array()
    });
  }

  // ... resto del código ...
});
```

---

## 5. 📝 Estandarizar Respuestas de Error

**Archivo: `backend/src/utils/response.ts`**

```typescript
import { Response } from 'express';

export interface ErrorResponse {
  success: false;
  error: string;
  mensaje: string;
  detalles?: any;
}

export function sendError(
  res: Response,
  statusCode: number,
  error: string,
  mensaje: string,
  detalles?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    error,
    mensaje,
    ...(detalles && { detalles })
  });
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data
  });
}
```

**Uso en endpoints:**

```typescript
import { sendError, sendSuccess } from './utils/response';

// En lugar de:
return res.status(400).json({ error: 'Fecha y descripción son requeridos' });

// Usar:
return sendError(res, 400, 'VALIDACION_ERROR', 'Fecha y descripción son requeridos');
```

---

## 6. 🔄 Script para Hash de Contraseñas Existentes

**Archivo: `backend/scripts/hash-passwords.ts`**

```typescript
import sql from 'mssql';
import bcrypt from 'bcrypt';

const dbConfig = {
  // ... configuración de BD ...
};

async function hashPasswords() {
  try {
    const pool = await sql.connect(dbConfig);

    // Obtener todos los usuarios
    const result = await pool.request().query(`
      SELECT IdUsuario, Usuario, Contraseña
      FROM Usuarios
      WHERE Contraseña IS NOT NULL
    `);

    for (const user of result.recordset) {
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(user.Contraseña, 10);

      // Actualizar en BD
      await pool.request()
        .input('idUsuario', sql.Int, user.IdUsuario)
        .input('contraseña', sql.VarChar(255), hashedPassword)
        .query(`
          UPDATE Usuarios
          SET Contraseña = @contraseña
          WHERE IdUsuario = @idUsuario
        `);

      console.log(`✅ Contraseña hasheada para usuario: ${user.Usuario}`);
    }

    console.log('✅ Proceso completado');
    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

hashPasswords();
```

---

## 📋 Checklist de Implementación

- [ ] Instalar dependencias de seguridad (jwt, bcrypt)
- [ ] Crear middleware de autenticación
- [ ] Actualizar login con hash y JWT
- [ ] Proteger todos los endpoints
- [ ] Crear servicio de asientos automáticos
- [ ] Integrar asientos en facturas
- [ ] Integrar asientos en compras
- [ ] Validar stock antes de facturar
- [ ] Instalar express-validator
- [ ] Crear validadores
- [ ] Estandarizar respuestas de error
- [ ] Ejecutar script de hash de contraseñas
- [ ] Actualizar variables de entorno
- [ ] Probar todas las funcionalidades

---

**Nota:** Recuerda actualizar las variables de entorno:
- `JWT_SECRET`: Clave secreta para JWT (debe ser segura y única)
- `JWT_EXPIRES_IN`: Tiempo de expiración del token (ej: '24h')
- `DB_USER` y `DB_PASSWORD`: Credenciales de BD (sin valores por defecto)


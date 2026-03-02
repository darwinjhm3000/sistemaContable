# 📦 Código de Barras Implementado

## 📋 Resumen de Cambios

Se ha implementado el soporte completo para código de barras en los productos del inventario, permitiendo buscar y agregar productos en facturas y compras mediante código de barras o código interno.

---

## 🎯 Funcionalidades Implementadas

### 1. ✅ Campo CodigoBarras en Productos
- Nuevo campo `CodigoBarras` en la tabla `Productos`
- Campo opcional (puede ser NULL)
- Índice creado para búsquedas rápidas

### 2. ✅ Búsqueda por Código de Barras
- Búsqueda en listado de productos incluye código de barras
- Búsqueda por código también busca en código de barras
- Nuevo endpoint específico para buscar por código/código de barras

### 3. ✅ Endpoints Actualizados
- **GET /api/productos**: Incluye `codigoBarras` en respuesta
- **GET /api/productos/:id**: Incluye `codigoBarras` en respuesta
- **GET /api/productos/buscar/:codigo**: Nuevo endpoint para buscar por código o código de barras
- **POST /api/productos**: Permite crear productos con código de barras
- **PUT /api/productos/:id**: Permite actualizar código de barras

---

## 📝 Script SQL Requerido

**IMPORTANTE**: Ejecuta el siguiente script en tu base de datos antes de usar la funcionalidad:

```sql
-- Archivo: database/agregar-codigo-barras.sql
```

O ejecuta manualmente:

```sql
USE MiBaseDeContabilidad;
GO

-- Agregar columna CodigoBarras
ALTER TABLE Productos
ADD CodigoBarras NVARCHAR(100) NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IX_Productos_CodigoBarras
ON Productos(CodigoBarras)
WHERE CodigoBarras IS NOT NULL;
GO
```

---

## 🔧 Uso de la API

### Crear Producto con Código de Barras

```json
POST /api/productos
{
  "codigo": "PROD001",
  "codigoBarras": "1234567890123",
  "nombre": "Producto Ejemplo",
  "descripcion": "Descripción del producto",
  "unidadMedida": "UN",
  "precioVenta": 1000,
  "precioCompra": 800,
  "iva": 19,
  "activo": true,
  "cantidadMinima": 10,
  "cantidadMaxima": 100,
  "ubicacion": "A-1-1"
}
```

### Buscar Producto por Código o Código de Barras

```http
GET /api/productos/buscar/1234567890123
```

**Response:**
```json
{
  "idProducto": 1,
  "codigo": "PROD001",
  "codigoBarras": "1234567890123",
  "nombre": "Producto Ejemplo",
  "descripcion": "Descripción del producto",
  "unidadMedida": "UN",
  "precioVenta": 1000,
  "precioCompra": 800,
  "iva": 19,
  "activo": true,
  "cantidadStock": 50,
  "cantidadMinima": 10,
  "cantidadMaxima": 100,
  "ubicacion": "A-1-1"
}
```

### Buscar en Listado (incluye código de barras)

```http
GET /api/productos?buscar=1234567890123
```

También busca por código interno o nombre del producto.

### Buscar por Código Específico (código o código de barras)

```http
GET /api/productos?codigo=1234567890123
```

Busca tanto en el campo `Codigo` como en `CodigoBarras`.

### Actualizar Código de Barras

```json
PUT /api/productos/1
{
  "codigo": "PROD001",
  "codigoBarras": "9876543210987",
  "nombre": "Producto Ejemplo",
  ...
}
```

---

## 🎨 Uso en Frontend

### Buscar Producto por Código de Barras

```typescript
import { api } from '../services';

// Al escanear un código de barras
const escanearCodigoBarras = async (codigoBarras: string) => {
  try {
    // Buscar producto por código de barras
    const producto = await api.productos.buscarProductoPorCodigo(codigoBarras);

    // Agregar a la factura/compra
    agregarProductoAFactura(producto);
  } catch (error) {
    if (error.status === 404) {
      mostrarError('Producto no encontrado con ese código de barras');
    } else {
      mostrarError('Error al buscar producto');
    }
  }
};
```

### Ejemplo de Componente React

```typescript
import React, { useState } from 'react';
import { api } from '../services';

const BuscadorProducto: React.FC = () => {
  const [codigo, setCodigo] = useState('');
  const [producto, setProducto] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const buscarProducto = async () => {
    if (!codigo.trim()) return;

    setCargando(true);
    try {
      // Busca por código interno o código de barras
      const resultado = await api.productos.buscarProductoPorCodigo(codigo);
      setProducto(resultado);
    } catch (error: any) {
      if (error.status === 404) {
        alert('Producto no encontrado');
      } else {
        alert('Error al buscar producto');
      }
      setProducto(null);
    } finally {
      setCargando(false);
    }
  };

  const manejarEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      buscarProducto();
    }
  };

  return (
    <div>
      <input
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyPress={manejarEnter}
        placeholder="Código o código de barras"
        autoFocus
      />
      <button onClick={buscarProducto} disabled={cargando}>
        {cargando ? 'Buscando...' : 'Buscar'}
      </button>

      {producto && (
        <div>
          <h3>{producto.nombre}</h3>
          <p>Código: {producto.codigo}</p>
          {producto.codigoBarras && (
            <p>Código de Barras: {producto.codigoBarras}</p>
          )}
          <p>Precio: ${producto.precioVenta.toLocaleString()}</p>
          <p>Stock: {producto.cantidadStock}</p>
        </div>
      )}
    </div>
  );
};

export default BuscadorProducto;
```

### Integración con Lector de Código de Barras

```typescript
// Hook para capturar códigos de barras desde un lector USB
const useLectorCodigoBarras = () => {
  const [codigo, setCodigo] = useState('');

  useEffect(() => {
    const manejarTeclado = (e: KeyboardEvent) => {
      // Los lectores de código de barras envían Enter al final
      if (e.key === 'Enter' && codigo.length > 0) {
        // Procesar código escaneado
        procesarCodigoBarras(codigo);
        setCodigo('');
      } else if (e.key.length === 1) {
        // Acumular caracteres
        setCodigo(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', manejarTeclado);
    return () => window.removeEventListener('keydown', manejarTeclado);
  }, [codigo]);

  return codigo;
};
```

---

## 📊 Estructura de Datos

### Producto (Actualizado)

```typescript
interface Producto {
  idProducto?: number;
  codigo: string;              // Código interno
  codigoBarras?: string | null; // Código de barras (nuevo)
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  precioVenta: number;
  precioCompra: number;
  iva: number;
  activo: boolean;
}
```

### Base de Datos

```sql
ALTER TABLE Productos
ADD CodigoBarras NVARCHAR(100) NULL;

CREATE INDEX IX_Productos_CodigoBarras
ON Productos(CodigoBarras)
WHERE CodigoBarras IS NOT NULL;
```

---

## 🔍 Búsquedas Disponibles

### 1. Búsqueda General (`?buscar=`)
Busca en:
- Código interno
- Nombre del producto
- **Código de barras** (nuevo)

### 2. Búsqueda por Código (`?codigo=`)
Busca en:
- Código interno
- **Código de barras** (nuevo)

### 3. Búsqueda Específica (`/api/productos/buscar/:codigo`)
Busca exactamente en:
- Código interno
- Código de barras

---

## ⚠️ Notas Importantes

1. **Código de barras opcional**: El campo puede ser NULL, no es obligatorio
2. **No único por defecto**: El índice no es UNIQUE, permitiendo códigos duplicados si es necesario
3. **Búsqueda flexible**: Todas las búsquedas ahora incluyen código de barras
4. **Compatibilidad**: Los productos existentes sin código de barras siguen funcionando normalmente

---

## 🧪 Casos de Prueba

### Test 1: Crear producto con código de barras
1. Crear producto con `codigoBarras: "1234567890123"`
2. **Esperado**: Producto creado con código de barras

### Test 2: Buscar por código de barras
1. Buscar producto con `GET /api/productos/buscar/1234567890123`
2. **Esperado**: Producto encontrado

### Test 3: Buscar en listado
1. Buscar con `GET /api/productos?buscar=1234567890123`
2. **Esperado**: Producto aparece en resultados

### Test 4: Producto sin código de barras
1. Crear producto sin `codigoBarras`
2. **Esperado**: Producto creado normalmente, `codigoBarras: null`

### Test 5: Actualizar código de barras
1. Actualizar producto agregando código de barras
2. **Esperado**: Código de barras actualizado

---

## 🔄 Próximos Pasos Recomendados

1. **Validación de formato**: Validar formato de código de barras (EAN-13, UPC, etc.)
2. **Generación automática**: Generar código de barras automáticamente si no se proporciona
3. **Lector integrado**: Integrar lector de código de barras USB en el frontend
4. **Códigos múltiples**: Permitir múltiples códigos de barras por producto (tabla separada)
5. **Impresión de etiquetas**: Generar etiquetas con código de barras para impresión

---

## 📚 Archivos Modificados

### Backend
- `backend/src/server.ts` - Endpoints actualizados
- `database/agregar-codigo-barras.sql` - Script SQL nuevo

### Frontend
- `frontend/src/types/index.ts` - Interface Producto actualizada
- `frontend/src/services/api.ts` - Método `buscarProductoPorCodigo` agregado

---

**Fecha de implementación**: $(date)
**Versión**: 1.2.0


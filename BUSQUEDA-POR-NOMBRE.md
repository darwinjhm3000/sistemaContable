# 🔍 Búsqueda por Nombre de Artículo Implementada

## 📋 Resumen de Cambios

Se ha actualizado el endpoint de búsqueda de productos para permitir buscar también por **nombre del artículo**, además de código interno y código de barras.

---

## 🎯 Funcionalidad Implementada

### Endpoint Actualizado: `GET /api/productos/buscar/:codigo`

Ahora busca productos por:
- ✅ **Código interno** (búsqueda exacta)
- ✅ **Código de barras** (búsqueda exacta)
- ✅ **Nombre del artículo** (búsqueda parcial - nuevo)

---

## 📝 Comportamiento de la Búsqueda

### Caso 1: Coincidencia Exacta (Código o Código de Barras)
Si se encuentra una coincidencia exacta con código o código de barras, devuelve **solo ese producto**:

```json
GET /api/productos/buscar/PROD001

Response:
{
  "idProducto": 1,
  "codigo": "PROD001",
  "codigoBarras": "1234567890123",
  "nombre": "Producto Ejemplo",
  ...
}
```

### Caso 2: Búsqueda por Nombre (Múltiples Resultados)
Si se busca por nombre y hay múltiples coincidencias, devuelve un **array de productos**:

```json
GET /api/productos/buscar/Laptop

Response:
{
  "success": true,
  "cantidad": 3,
  "productos": [
    {
      "idProducto": 1,
      "codigo": "PROD001",
      "nombre": "Laptop Dell",
      ...
    },
    {
      "idProducto": 2,
      "codigo": "PROD002",
      "nombre": "Laptop HP",
      ...
    },
    {
      "idProducto": 3,
      "codigo": "PROD003",
      "nombre": "Laptop Lenovo",
      ...
    }
  ]
}
```

### Caso 3: Un Solo Resultado por Nombre
Si hay solo un resultado, devuelve el objeto directamente:

```json
GET /api/productos/buscar/Producto%20Unico

Response:
{
  "idProducto": 5,
  "codigo": "PROD005",
  "nombre": "Producto Unico",
  ...
}
```

### Caso 4: No Encontrado
Si no se encuentra ningún producto:

```json
Response 404:
{
  "success": false,
  "error": "PRODUCTO_NO_ENCONTRADO",
  "mensaje": "Producto no encontrado con el código, código de barras o nombre proporcionado"
}
```

---

## 🎨 Uso en Frontend

### Ejemplo Básico

```typescript
import { api } from '../services';

const buscarProducto = async (termino: string) => {
  try {
    const resultado = await api.productos.buscarProductoPorCodigo(termino);

    // Verificar si es un array (múltiples resultados) o un objeto (un solo resultado)
    if (resultado.productos && Array.isArray(resultado.productos)) {
      // Múltiples resultados - mostrar lista para seleccionar
      mostrarListaProductos(resultado.productos);
    } else {
      // Un solo resultado - agregar directamente
      agregarProductoAFactura(resultado);
    }
  } catch (error) {
    if (error.status === 404) {
      mostrarError('Producto no encontrado');
    }
  }
};
```

### Componente React Completo

```typescript
import React, { useState } from 'react';
import { api } from '../services';

interface Producto {
  idProducto: number;
  codigo: string;
  codigoBarras?: string | null;
  nombre: string;
  precioVenta: number;
  cantidadStock: number;
}

const BuscadorProducto: React.FC<{ onProductoSeleccionado: (producto: Producto) => void }> = ({
  onProductoSeleccionado
}) => {
  const [termino, setTermino] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);

  const buscar = async () => {
    if (!termino.trim()) return;

    setCargando(true);
    try {
      const respuesta = await api.productos.buscarProductoPorCodigo(termino);

      // Verificar si hay múltiples resultados
      if (respuesta.productos && Array.isArray(respuesta.productos)) {
        setResultados(respuesta.productos);
        setMostrarLista(true);
      } else {
        // Un solo resultado - seleccionar automáticamente
        onProductoSeleccionado(respuesta);
        setTermino('');
        setMostrarLista(false);
      }
    } catch (error: any) {
      if (error.status === 404) {
        alert('Producto no encontrado');
      } else {
        alert('Error al buscar producto');
      }
      setResultados([]);
      setMostrarLista(false);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarProducto = (producto: Producto) => {
    onProductoSeleccionado(producto);
    setTermino('');
    setResultados([]);
    setMostrarLista(false);
  };

  return (
    <div className="buscador-producto">
      <div className="input-group">
        <input
          type="text"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && buscar()}
          placeholder="Código, código de barras o nombre del producto"
          className="form-control"
        />
        <button
          onClick={buscar}
          disabled={cargando || !termino.trim()}
          className="btn btn-primary"
        >
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {mostrarLista && resultados.length > 0 && (
        <div className="lista-resultados">
          <p className="text-muted">
            Se encontraron {resultados.length} producto(s). Seleccione uno:
          </p>
          <ul className="list-group">
            {resultados.map((producto) => (
              <li
                key={producto.idProducto}
                className="list-group-item list-group-item-action"
                onClick={() => seleccionarProducto(producto)}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex justify-content-between">
                  <div>
                    <strong>{producto.nombre}</strong>
                    <br />
                    <small className="text-muted">
                      Código: {producto.codigo}
                      {producto.codigoBarras && ` | Código de Barras: ${producto.codigoBarras}`}
                    </small>
                  </div>
                  <div className="text-end">
                    <div>${producto.precioVenta.toLocaleString()}</div>
                    <small className="text-muted">
                      Stock: {producto.cantidadStock}
                    </small>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BuscadorProducto;
```

### Uso del Componente

```typescript
const FacturacionPage: React.FC = () => {
  const [productosFactura, setProductosFactura] = useState<Producto[]>([]);

  const agregarProducto = (producto: Producto) => {
    setProductosFactura([...productosFactura, producto]);
  };

  return (
    <div>
      <h2>Facturación</h2>
      <BuscadorProducto onProductoSeleccionado={agregarProducto} />
      {/* Resto del formulario de factura */}
    </div>
  );
};
```

---

## 🔍 Ejemplos de Búsqueda

### Por Código Interno
```
GET /api/productos/buscar/PROD001
→ Devuelve el producto con código exacto "PROD001"
```

### Por Código de Barras
```
GET /api/productos/buscar/1234567890123
→ Devuelve el producto con código de barras exacto
```

### Por Nombre (Parcial)
```
GET /api/productos/buscar/Laptop
→ Devuelve todos los productos cuyo nombre contenga "Laptop"
```

### Por Nombre (Completo)
```
GET /api/productos/buscar/Laptop%20Dell%20Inspiron
→ Devuelve productos que contengan "Laptop Dell Inspiron" en el nombre
```

---

## ⚙️ Características

1. **Búsqueda Inteligente**: Prioriza coincidencias exactas (código/código de barras) sobre búsquedas parciales (nombre)

2. **Búsqueda Parcial**: La búsqueda por nombre usa `LIKE` con `%termino%`, permitiendo encontrar productos con nombres parciales

3. **Múltiples Resultados**: Cuando hay múltiples coincidencias por nombre, devuelve un array para que el usuario seleccione

4. **Un Solo Resultado**: Si hay una sola coincidencia, devuelve el objeto directamente para facilitar el uso

5. **Case Insensitive**: La búsqueda no distingue entre mayúsculas y minúsculas (comportamiento de SQL Server)

---

## 📊 Comparación de Endpoints

| Endpoint | Búsqueda por Código | Búsqueda por Código de Barras | Búsqueda por Nombre | Tipo de Búsqueda |
|----------|---------------------|-------------------------------|---------------------|------------------|
| `/api/productos?buscar=` | ✅ Parcial | ✅ Parcial | ✅ Parcial | LIKE (parcial) |
| `/api/productos?codigo=` | ✅ Exacta | ✅ Exacta | ❌ | Exacta |
| `/api/productos/buscar/:codigo` | ✅ Exacta | ✅ Exacta | ✅ Parcial | Mixta |

---

## 🧪 Casos de Prueba

### Test 1: Búsqueda por código exacto
1. Buscar `GET /api/productos/buscar/PROD001`
2. **Esperado**: Un solo producto con código "PROD001"

### Test 2: Búsqueda por código de barras exacto
1. Buscar `GET /api/productos/buscar/1234567890123`
2. **Esperado**: Un solo producto con ese código de barras

### Test 3: Búsqueda por nombre (un resultado)
1. Buscar `GET /api/productos/buscar/Producto%20Unico`
2. **Esperado**: Un solo producto con ese nombre

### Test 4: Búsqueda por nombre (múltiples resultados)
1. Buscar `GET /api/productos/buscar/Laptop`
2. **Esperado**: Array con todos los productos que contengan "Laptop" en el nombre

### Test 5: Producto no encontrado
1. Buscar `GET /api/productos/buscar/NOEXISTE`
2. **Esperado**: Error 404 con mensaje apropiado

---

## 📚 Archivos Modificados

### Backend
- `backend/src/server.ts` - Endpoint `/api/productos/buscar/:codigo` actualizado

### Frontend
- `frontend/src/services/api.ts` - Documentación del método actualizada

---

**Fecha de implementación**: $(date)
**Versión**: 1.2.1


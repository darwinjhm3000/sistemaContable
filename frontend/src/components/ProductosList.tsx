import React, { useState, useEffect } from 'react';
import { api } from '../services';
import { Producto } from '../types';
import Toolbar from './Toolbar';

const ProductosList: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const datos = await api.productos.obtenerProductos({ activo: true, buscar });
      setProductos(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    cargarProductos();
  };

  const handleEditar = (producto: any) => {
    setProductoEditando(producto);
    setMostrarFormulario(true);
  };

  const handleNuevo = () => {
    setProductoEditando(null);
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    setProductoEditando(null);
    cargarProductos();
  };

  if (mostrarFormulario) {
    return (
      <ProductoForm
        producto={productoEditando}
        onCancel={handleCerrarFormulario}
        onSave={handleCerrarFormulario}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📦 Gestión de Productos</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nuevo Producto
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showSearch={true}
        searchValue={buscar}
        onSearchChange={setBuscar}
        onSearch={handleBuscar}
        searchPlaceholder="Buscar por código o nombre..."
        showNew={true}
        onNew={handleNuevo}
        newLabel="➕ Nuevo Producto"
        showPrint={true}
        onPrint={() => window.print()}
      />

      {loading ? (
        <div className="loading">Cargando productos...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Unidad</th>
                <th>Precio Venta</th>
                <th>Precio Compra</th>
                <th>IVA %</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No hay productos registrados
                  </td>
                </tr>
              ) : (
                productos.map((prod: any) => (
                  <tr key={prod.idProducto}>
                    <td>{prod.codigo}</td>
                    <td>{prod.nombre}</td>
                    <td>{prod.unidadMedida}</td>
                    <td>${prod.precioVenta.toLocaleString()}</td>
                    <td>${prod.precioCompra.toLocaleString()}</td>
                    <td>{prod.iva}%</td>
                    <td>
                      <span className={prod.cantidadStock <= prod.cantidadMinima ? 'stock-bajo' : ''}>
                        {prod.cantidadStock}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEditar(prod)}
                        className="btn btn-small btn-secondary"
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ProductoForm: React.FC<{
  producto: Producto | null;
  onCancel: () => void;
  onSave: () => void;
}> = ({ producto, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    unidadMedida: producto?.unidadMedida || 'UN',
    precioVenta: producto?.precioVenta || 0,
    precioCompra: producto?.precioCompra || 0,
    iva: producto?.iva || 19,
    activo: producto?.activo !== false,
    cantidadMinima: (producto as any)?.cantidadMinima || 0,
    cantidadMaxima: (producto as any)?.cantidadMaxima || null,
    ubicacion: (producto as any)?.ubicacion || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (producto?.idProducto) {
        await api.productos.actualizarProducto(producto.idProducto, formData);
      } else {
        await api.productos.crearProducto(formData);
      }
      onSave();
    } catch (err: any) {
      setError('Error al guardar producto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{producto ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showNew={true}
        onNew={() => {
          setFormData({
            codigo: '',
            nombre: '',
            descripcion: '',
            unidadMedida: 'UN',
            precioVenta: 0,
            precioCompra: 0,
            iva: 19,
            activo: true,
            cantidadMinima: 0,
            cantidadMaxima: null,
            ubicacion: '',
          });
        }}
        newLabel="➕ Nuevo"
        showSave={true}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
        }}
        saveLabel="💾 Guardar"
        saveDisabled={loading}
        saving={loading}
        showPrint={true}
        onPrint={() => window.print()}
        showCancel={true}
        onCancel={onCancel}
        cancelLabel="❌ Cancelar"
      />

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="form-group">
            <label>Código *</label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Unidad de Medida</label>
            <select
              value={formData.unidadMedida}
              onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
            >
              <option value="UN">Unidad (UN)</option>
              <option value="KG">Kilogramo (KG)</option>
              <option value="LT">Litro (LT)</option>
              <option value="MT">Metro (MT)</option>
              <option value="M2">Metro Cuadrado (M2)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Nombre *</label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Precio de Venta *</label>
            <input
              type="number"
              step="0.01"
              value={formData.precioVenta}
              onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="form-group">
            <label>Precio de Compra *</label>
            <input
              type="number"
              step="0.01"
              value={formData.precioCompra}
              onChange={(e) => setFormData({ ...formData, precioCompra: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div className="form-group">
            <label>IVA %</label>
            <input
              type="number"
              step="0.01"
              value={formData.iva}
              onChange={(e) => setFormData({ ...formData, iva: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Cantidad Mínima</label>
            <input
              type="number"
              step="0.001"
              value={formData.cantidadMinima}
              onChange={(e) => setFormData({ ...formData, cantidadMinima: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>Cantidad Máxima</label>
            <input
              type="number"
              step="0.001"
              value={formData.cantidadMaxima || ''}
              onChange={(e) => setFormData({ ...formData, cantidadMaxima: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </div>
          <div className="form-group">
            <label>Ubicación</label>
            <input
              type="text"
              value={formData.ubicacion}
              onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              placeholder="Ej: Estante A1"
            />
          </div>
        </div>

      </form>
    </div>
  );
};

export default ProductosList;



import React, { useState, useEffect } from 'react';
import { api } from '../services';
import { Compra, DetalleCompra, Producto, Tercero } from '../types';
import Toolbar from '../components/Toolbar';
import ScanPDFButton from '../components/ScanPDFButton';
import ProveedorFormRapido from '../components/ProveedorFormRapido';
import { getFechaHoyLocal } from '../utils/fechas';

const ComprasPage: React.FC = () => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarCompras();
  }, []);

  const cargarCompras = async () => {
    try {
      setLoading(true);
      const datos = await api.compras.obtenerCompras();
      setCompras(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar compras: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    cargarCompras();
  };

  if (mostrarFormulario) {
    return <CompraForm onCancel={handleCerrarFormulario} onSave={handleCerrarFormulario} />;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🛒 Compras</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nueva Compra
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando compras...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th># Factura</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No hay compras registradas
                  </td>
                </tr>
              ) : (
                compras.map((compra) => (
                  <tr key={compra.idCompra}>
                    <td>{compra.numeroFactura || 'N/A'}</td>
                    <td>{new Date(compra.fecha).toLocaleDateString()}</td>
                    <td>{compra.proveedor?.nombreRazonSocial || 'N/A'}</td>
                    <td>${compra.subtotal.toLocaleString()}</td>
                    <td>${compra.iva.toLocaleString()}</td>
                    <td>${compra.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${compra.estado.toLowerCase()}`}>
                        {compra.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => window.open(`/compras/${compra.idCompra}`, '_blank')}
                        className="btn btn-small btn-secondary"
                      >
                        👁️ Ver
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

const CompraForm: React.FC<{
  onCancel: () => void;
  onSave: () => void;
}> = ({ onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    numeroFactura: '',
    fecha: getFechaHoyLocal(),
    idProveedor: 0, // Este es el IdProveedor de la tabla Proveedores
    observaciones: '',
    estado: 'Borrador' as 'Borrador' | 'Recibida' | 'Anulada',
  });

  const [detalles, setDetalles] = useState<DetalleCompra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarCrearProveedor, setMostrarCrearProveedor] = useState(false);
  const [datosProveedorExtraido, setDatosProveedorExtraido] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [productosData, proveedoresData] = await Promise.all([
        api.productos.obtenerProductos({ activo: true }),
        api.proveedores.obtenerProveedores({ activo: true }),
      ]);
      setProductos(productosData);
      // Mapear proveedores - usar idProveedor para el select
      setProveedores(proveedoresData.map((p: any) => ({
        idProveedor: p.idProveedor,
        idTercero: p.idTercero,
        nit: p.nit,
        nombreRazonSocial: p.nombreRazonSocial,
        direccion: p.direccion,
        tipo: 'Proveedor'
      })));
    } catch (err: any) {
      setError('Error al cargar datos: ' + err.message);
    }
  };

  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      {
        idProducto: 0,
        cantidad: 1,
        precioUnitario: 0,
        descuento: 0,
        iva: 19,
        subtotal: 0,
        total: 0,
      },
    ]);
  };

  const actualizarDetalle = (index: number, campo: string, valor: any) => {
    const nuevosDetalles = [...detalles];
    const detalle = nuevosDetalles[index];

    (detalle as any)[campo] = valor;

    if (campo === 'idProducto') {
      const producto = productos.find((p: any) => p.idProducto === valor);
      if (producto) {
        detalle.precioUnitario = producto.precioCompra;
        detalle.iva = producto.iva;
      }
    }

    const subtotal = detalle.cantidad * detalle.precioUnitario - detalle.descuento;
    detalle.subtotal = subtotal;
    detalle.iva = subtotal * (detalle.iva / 100);
    detalle.total = subtotal + detalle.iva;

    nuevosDetalles[index] = detalle;
    setDetalles(nuevosDetalles);
  };

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const calcularTotales = () => {
    const subtotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);
    const iva = detalles.reduce((sum, d) => sum + d.iva, 0);
    return { subtotal, iva, total: subtotal + iva };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detalles.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const usuario = api.auth.getCurrentUser();
      await api.compras.crearCompra({
        ...formData,
        detalles,
        idUsuarioCreacion: usuario?.idUsuario || 1,
      });
      onSave();
    } catch (err: any) {
      setError('Error al guardar compra: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDataExtracted = (extractedData: any) => {
    // Llenar datos del formulario
    if (extractedData.numeroFactura) {
      setFormData(prev => ({ ...prev, numeroFactura: extractedData.numeroFactura }));
    }
    if (extractedData.fecha) {
      setFormData(prev => ({ ...prev, fecha: extractedData.fecha }));
    }

    // Buscar proveedor por NIT o nombre
    let proveedorEncontrado: any = null;

    if (extractedData.nitProveedor) {
      proveedorEncontrado = proveedores.find((p: any) =>
        p.nit === extractedData.nitProveedor ||
        p.nit?.replace(/[-\s]/g, '') === extractedData.nitProveedor.replace(/[-\s]/g, '')
      );
    }

    if (!proveedorEncontrado && extractedData.nombreProveedor) {
      proveedorEncontrado = proveedores.find((p: any) =>
        p.nombreRazonSocial?.toLowerCase().includes(extractedData.nombreProveedor.toLowerCase())
      );
    }

    if (proveedorEncontrado) {
      setFormData(prev => ({ ...prev, idProveedor: proveedorEncontrado.idProveedor }));
    } else {
      // Proveedor no encontrado - ofrecer crear uno nuevo
      if (extractedData.nitProveedor || extractedData.nombreProveedor) {
        const confirmar = window.confirm(
          `No se encontró el proveedor "${extractedData.nombreProveedor || extractedData.nitProveedor}".\n\n` +
          `¿Desea crear un nuevo proveedor con los datos extraídos de la factura?`
        );

        if (confirmar) {
          setDatosProveedorExtraido({
            nit: extractedData.nitProveedor || '',
            nombreRazonSocial: extractedData.nombreProveedor || '',
            direccion: extractedData.direccionProveedor || '',
            tipoPersona: 'J' as 'N' | 'J',
            activo: true
          });
          setMostrarCrearProveedor(true);
        }
      }
    }

    // Convertir items extraídos a detalles
    if (extractedData.items && extractedData.items.length > 0) {
      const nuevosDetalles: DetalleCompra[] = extractedData.items.map((item: any) => {
        // Buscar producto por descripción o código
        let productoEncontrado = productos.find((p: any) =>
          p.nombre?.toLowerCase().includes(item.descripcion?.toLowerCase()) ||
          p.codigo === item.codigo
        );

        return {
          idProducto: productoEncontrado?.idProducto || 0,
          cantidad: item.cantidad || 1,
          precioUnitario: item.precioUnitario || 0,
          descuento: item.descuento || 0,
          iva: productoEncontrado?.iva || 19,
          subtotal: item.subtotal || (item.cantidad * item.precioUnitario - (item.descuento || 0)),
          total: item.total || (item.subtotal + (item.subtotal * (productoEncontrado?.iva || 19) / 100))
        };
      });
      setDetalles(nuevosDetalles);
    }

    // Mostrar mensaje de éxito solo si no se va a crear proveedor
    if (!mostrarCrearProveedor) {
      setError('');
      alert(`✅ Factura escaneada exitosamente!\n\nConfianza: ${extractedData.confidence.toFixed(1)}%\nItems encontrados: ${extractedData.items?.length || 0}\n\nPor favor, revise y ajuste los datos si es necesario.`);
    }
  };

  const handleCrearProveedor = async (datosProveedor: any) => {
    try {
      setLoading(true);
      const nuevoProveedor = await api.proveedores.crearProveedor(datosProveedor);

      // Recargar lista de proveedores
      const proveedoresData = await api.proveedores.obtenerProveedores({ activo: true });
      setProveedores(proveedoresData.map((p: any) => ({
        idProveedor: p.idProveedor,
        idTercero: p.idTercero,
        nit: p.nit,
        nombreRazonSocial: p.nombreRazonSocial,
        direccion: p.direccion,
        tipo: 'Proveedor'
      })));

      // Seleccionar el nuevo proveedor
      setFormData(prev => ({ ...prev, idProveedor: nuevoProveedor.idProveedor }));
      setMostrarCrearProveedor(false);
      setDatosProveedorExtraido(null);
      setError('');

      alert('✅ Proveedor creado exitosamente y seleccionado en el formulario.');
    } catch (err: any) {
      setError('Error al crear proveedor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarCrearProveedor = () => {
    setMostrarCrearProveedor(false);
    setDatosProveedorExtraido(null);
  };

  const totales = calcularTotales();

  // Mostrar formulario de crear proveedor si es necesario
  if (mostrarCrearProveedor && datosProveedorExtraido) {
    return (
      <div className="container">
        <div className="header">
          <h1>➕ Crear Nuevo Proveedor</h1>
        </div>
        <div style={{
          backgroundColor: '#f0f8ff',
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '5px',
          border: '1px solid #4CAF50'
        }}>
          <strong>ℹ️ Información extraída de la factura:</strong>
          <p style={{ margin: '5px 0' }}>Los siguientes datos fueron extraídos automáticamente. Por favor, revise y complete los campos faltantes.</p>
        </div>
        <ProveedorFormRapido
          datosIniciales={datosProveedorExtraido}
          onSave={handleCrearProveedor}
          onCancel={handleCancelarCrearProveedor}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>➕ Nueva Compra</h1>
        <ScanPDFButton onDataExtracted={handleDataExtracted} disabled={loading} />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <div className="form-group">
            <label>Número de Factura Proveedor</label>
            <input
              type="text"
              value={formData.numeroFactura}
              onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Fecha *</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Proveedor *</label>
            <select
              value={formData.idProveedor}
              onChange={(e) => setFormData({ ...formData, idProveedor: parseInt(e.target.value) })}
              required
            >
              <option value={0}>Seleccione un proveedor</option>
              {proveedores.map((proveedor: any) => (
                <option key={proveedor.idProveedor} value={proveedor.idProveedor}>
                  {proveedor.nombreRazonSocial} - {proveedor.nit}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Observaciones</label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            rows={2}
          />
        </div>

        <div className="section-header">
          <h3>Detalles de la Compra</h3>
          <button type="button" onClick={agregarDetalle} className="btn btn-secondary">
            + Agregar Producto
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Descuento</th>
                <th>IVA %</th>
                <th>Subtotal</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={detalle.idProducto}
                      onChange={(e) => actualizarDetalle(index, 'idProducto', parseInt(e.target.value))}
                      required
                    >
                      <option value={0}>Seleccione producto</option>
                      {productos.map((prod: any) => (
                        <option key={prod.idProducto} value={prod.idProducto}>
                          {prod.codigo} - {prod.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.001"
                      value={detalle.cantidad}
                      onChange={(e) => actualizarDetalle(index, 'cantidad', parseFloat(e.target.value) || 0)}
                      min="0.001"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={detalle.precioUnitario}
                      onChange={(e) => actualizarDetalle(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={detalle.descuento}
                      onChange={(e) => actualizarDetalle(index, 'descuento', parseFloat(e.target.value) || 0)}
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={detalle.iva}
                      onChange={(e) => actualizarDetalle(index, 'iva', parseFloat(e.target.value) || 0)}
                      required
                    />
                  </td>
                  <td>${detalle.subtotal.toLocaleString()}</td>
                  <td>${detalle.total.toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => eliminarDetalle(index)}
                      className="btn btn-small btn-danger"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="text-right"><strong>Total:</strong></td>
                <td><strong>${totales.subtotal.toLocaleString()}</strong></td>
                <td><strong>${totales.total.toLocaleString()}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </form>

      <Toolbar
        showNew={true}
        onNew={() => {
          setFormData({
            numeroFactura: '',
            fecha: getFechaHoyLocal(),
            idProveedor: 0,
            observaciones: '',
            estado: 'Borrador',
          });
          setDetalles([]);
        }}
        newLabel="➕ Nueva Compra"
        showSave={true}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
          }
        }}
        saveLabel="💾 Guardar Compra"
        saveDisabled={loading || detalles.length === 0}
        saving={loading}
        showPrint={true}
        onPrint={() => window.print()}
        showCancel={true}
        onCancel={onCancel}
        cancelLabel="❌ Cancelar"
      />
    </div>
  );
};

export default ComprasPage;



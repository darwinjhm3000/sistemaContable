import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services';
import { Cotizacion, DetalleCotizacion, Producto, Tercero } from '../types';
import Toolbar from '../components/Toolbar';
import { getFechaHoyLocal } from '../utils/fechas';

const CotizacionesPage: React.FC = () => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarCotizaciones();
  }, []);

  const cargarCotizaciones = async () => {
    try {
      setLoading(true);
      const datos = await api.cotizaciones.obtenerCotizaciones();
      setCotizaciones(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar cotizaciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    cargarCotizaciones();
  };

  const handleConvertirAFactura = async (idCotizacion: number) => {
    if (!window.confirm('¿Desea convertir esta cotización en una factura?')) {
      return;
    }

    try {
      await api.cotizaciones.convertirAFactura(idCotizacion, {
        fecha: getFechaHoyLocal(),
        estado: 'Emitida'
      });
      alert('Cotización convertida a factura exitosamente');
      cargarCotizaciones();
    } catch (err: any) {
      alert('Error al convertir cotización: ' + err.message);
    }
  };

  if (mostrarFormulario) {
    return <CotizacionForm onCancel={handleCerrarFormulario} onSave={handleCerrarFormulario} />;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>📋 Cotizaciones</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nueva Cotización
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando cotizaciones...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cotizaciones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No hay cotizaciones registradas
                  </td>
                </tr>
              ) : (
                cotizaciones.map((cotizacion) => (
                  <tr key={cotizacion.idCotizacion}>
                    <td>{cotizacion.numeroCotizacion}</td>
                    <td>{new Date(cotizacion.fecha).toLocaleDateString()}</td>
                    <td>{cotizacion.cliente?.nombreRazonSocial || 'N/A'}</td>
                    <td>${cotizacion.subtotal.toLocaleString()}</td>
                    <td>${cotizacion.iva.toLocaleString()}</td>
                    <td>${cotizacion.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${cotizacion.estado.toLowerCase()}`}>
                        {cotizacion.estado}
                      </span>
                    </td>
                    <td>
                      {cotizacion.estado !== 'Convertida' && (
                        <button
                          onClick={() => handleConvertirAFactura(cotizacion.idCotizacion!)}
                          className="btn btn-small btn-primary"
                          style={{ marginRight: '5px' }}
                        >
                          ➡️ Convertir a Factura
                        </button>
                      )}
                      {cotizacion.idFacturaGenerada && (
                        <button
                          onClick={() => window.open(`/facturas/${cotizacion.idFacturaGenerada}`, '_blank')}
                          className="btn btn-small btn-secondary"
                        >
                          👁️ Ver Factura
                        </button>
                      )}
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

const CotizacionForm: React.FC<{
  onCancel: () => void;
  onSave: () => void;
}> = ({ onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    numeroCotizacion: '',
    fecha: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    idCliente: 0,
    idVendedor: 0,
    observaciones: '',
    estado: 'Borrador' as 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Convertida',
  });

  const [detalles, setDetalles] = useState<Array<DetalleCotizacion & { porcentajeIVA?: number }>>(
    Array(5).fill(null).map(() => ({
      idProducto: 0,
      cantidad: 0,
      precioUnitario: 0,
      descuento: 0,
      iva: 0,
      porcentajeIVA: 19,
      subtotal: 0,
      total: 0,
    }))
  );

  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Tercero[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [productosData, clientesData, vendedoresData] = await Promise.all([
        api.productos.obtenerProductos({ activo: true }),
        api.terceros.obtenerTerceros(),
        api.vendedores.obtenerVendedores({ activo: true }),
      ]);
      setProductos(productosData);
      setClientes(clientesData.filter((c: any) => c.tipo === 'Cliente' || c.tipo === 'C'));
      setVendedores(vendedoresData);
    } catch (err: any) {
      setError('Error al cargar datos: ' + err.message);
    }
  };

  const actualizarDetalle = (index: number, campo: string, valor: any, agregarFila?: boolean) => {
    const nuevosDetalles = [...detalles];
    const detalle = { ...nuevosDetalles[index] };

    if (campo === 'idProducto') {
      const producto = productos.find(p => p.idProducto === valor);
      if (producto && producto.idProducto) {
        detalle.idProducto = producto.idProducto;
        detalle.precioUnitario = producto.precioVenta || 0;
        (detalle as any).porcentajeIVA = producto.iva || 19;
        detalle.iva = 0;
      }
    } else {
      (detalle as any)[campo] = valor;
    }

    const subtotalDetalle = (detalle.cantidad * detalle.precioUnitario) - detalle.descuento;
    const ivaDetalle = subtotalDetalle * (((detalle as any).porcentajeIVA || 0) / 100);
    detalle.subtotal = subtotalDetalle;
    detalle.iva = ivaDetalle;
    detalle.total = subtotalDetalle + ivaDetalle;

    nuevosDetalles[index] = detalle;

    if (agregarFila && index === detalles.length - 1 && detalle.idProducto > 0 && detalle.cantidad > 0) {
      nuevosDetalles.push({
        idProducto: 0,
        cantidad: 0,
        precioUnitario: 0,
        descuento: 0,
        iva: 0,
        porcentajeIVA: 19,
        subtotal: 0,
        total: 0,
      });
    }

    setDetalles(nuevosDetalles);
  };

  const calcularTotales = () => {
    const subtotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);
    const iva = detalles.reduce((sum, d) => sum + d.iva, 0);
    return { subtotal, iva, total: subtotal + iva };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const detallesValidos = detalles.filter(d => d.idProducto > 0 && d.cantidad > 0);

    if (detallesValidos.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const usuario = api.auth.getCurrentUser();
      const detallesParaEnviar = detallesValidos.map(d => ({
        idProducto: d.idProducto,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento,
        iva: (d as any).porcentajeIVA || 19,
        subtotal: d.subtotal,
        total: d.total,
      }));

      const datosCotizacion: any = {
        fecha: formData.fecha,
        fechaVencimiento: formData.fechaVencimiento || null,
        idCliente: formData.idCliente,
        idVendedor: formData.idVendedor > 0 ? formData.idVendedor : null,
        observaciones: formData.observaciones,
        estado: formData.estado,
        detalles: detallesParaEnviar,
        idUsuarioCreacion: usuario?.idUsuario || 1,
      };

      if (formData.numeroCotizacion && formData.numeroCotizacion.trim() !== '') {
        datosCotizacion.numeroCotizacion = formData.numeroCotizacion;
      }

      await api.cotizaciones.crearCotizacion(datosCotizacion);
      onSave();
    } catch (err: any) {
      setError('Error al guardar cotización: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totales = calcularTotales();

  return (
    <div className="container">
      <div className="header">
        <h1>📋 Nueva Cotización</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form ref={formRef} onSubmit={handleSubmit}>
        <Toolbar
          showNew={false}
          showSave={true}
          onSave={() => formRef.current?.requestSubmit()}
          saveLabel="💾 Guardar Cotización"
          saveDisabled={loading}
          saving={loading}
          showCancel={true}
          onCancel={onCancel}
          cancelLabel="❌ Cancelar"
        />

        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Información General</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label>Fecha *</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Fecha de Vencimiento</label>
              <input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
              />
            </div>
            <div>
              <label>Cliente *</label>
              <select
                value={formData.idCliente}
                onChange={(e) => setFormData({ ...formData, idCliente: parseInt(e.target.value) })}
                required
              >
                <option value={0}>Seleccione un cliente</option>
                {clientes.map((c) => (
                  <option key={c.idTercero} value={c.idTercero}>
                    {c.nombreRazonSocial} - {c.nit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Vendedor</label>
              <select
                value={formData.idVendedor}
                onChange={(e) => setFormData({ ...formData, idVendedor: parseInt(e.target.value) })}
              >
                <option value={0}>Sin vendedor</option>
                {vendedores.map((v) => (
                  <option key={v.idVendedor} value={v.idVendedor}>
                    {v.codigoVendedor} - {v.nombreRazonSocial}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
              >
                <option value="Borrador">Borrador</option>
                <option value="Enviada">Enviada</option>
                <option value="Aceptada">Aceptada</option>
                <option value="Rechazada">Rechazada</option>
              </select>
            </div>
          </div>
          <div>
            <label>Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div className="card">
          <h3>Detalles de la Cotización</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', marginTop: '15px' }}>
              <thead>
                <tr style={{ background: '#f0f0f0', color: '#000000' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Reng</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Artículo</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Descripción</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>Cant.</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Precio</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Desc.</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Neto</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>I.V.A %</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>I.V.A</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detalle, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Código o nombre"
                        style={{ width: '100%' }}
                        onBlur={(e) => {
                          const valor = e.target.value.trim();
                          if (valor) {
                            const producto = productos.find(
                              p => p.codigo.toLowerCase() === valor.toLowerCase() ||
                                   p.nombre.toLowerCase().includes(valor.toLowerCase()) ||
                                   (p.codigoBarras && p.codigoBarras === valor)
                            );
                            if (producto) {
                              actualizarDetalle(index, 'idProducto', producto.idProducto, true);
                            }
                          }
                        }}
                      />
                    </td>
                    <td>{productos.find(p => p.idProducto === detalle.idProducto)?.nombre || ''}</td>
                    <td>
                      <input
                        type="number"
                        step="0.001"
                        value={detalle.cantidad || ''}
                        onChange={(e) => actualizarDetalle(index, 'cantidad', parseFloat(e.target.value) || 0, true)}
                        style={{ width: '80px', textAlign: 'right' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.precioUnitario || ''}
                        onChange={(e) => actualizarDetalle(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                        style={{ width: '100px', textAlign: 'right' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.descuento || ''}
                        onChange={(e) => actualizarDetalle(index, 'descuento', parseFloat(e.target.value) || 0)}
                        style={{ width: '80px', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>${detalle.subtotal.toLocaleString()}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={(detalle as any).porcentajeIVA || 19}
                        readOnly
                        style={{ width: '60px', textAlign: 'center', background: '#f5f5f5' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>${detalle.iva.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${detalle.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>Subtotal:</strong>
                <span>${totales.subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <strong>IVA:</strong>
                <span>${totales.iva.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #333', paddingTop: '10px' }}>
                <strong>Total:</strong>
                <strong>${totales.total.toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CotizacionesPage;


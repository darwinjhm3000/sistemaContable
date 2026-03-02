import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services';
import { Factura, DetalleFactura, Producto, Tercero } from '../types';
import Toolbar from '../components/Toolbar';
import { getFechaHoyLocal } from '../utils/fechas';

const FacturacionPage: React.FC = () => {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarFacturas();
  }, []);

  const cargarFacturas = async () => {
    try {
      setLoading(true);
      const datos = await api.facturas.obtenerFacturas();
      setFacturas(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar facturas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    cargarFacturas();
  };

  if (mostrarFormulario) {
    return <FacturaForm onCancel={handleCerrarFormulario} onSave={handleCerrarFormulario} />;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🧾 Facturación</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nueva Factura
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando facturas...</div>
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
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No hay facturas registradas
                  </td>
                </tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.idFactura}>
                    <td>{factura.numeroFactura}</td>
                    <td>{new Date(factura.fecha).toLocaleDateString()}</td>
                    <td>{factura.cliente?.nombreRazonSocial || 'N/A'}</td>
                    <td>${factura.subtotal.toLocaleString()}</td>
                    <td>${factura.iva.toLocaleString()}</td>
                    <td>${factura.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${factura.estado.toLowerCase()}`}>
                        {factura.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => window.open(`/facturas/${factura.idFactura}`, '_blank')}
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

const FacturaForm: React.FC<{
  onCancel: () => void;
  onSave: () => void;
}> = ({ onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    numeroFactura: '',
    fecha: new Date().toISOString().split('T')[0],
    idCliente: 0,
    observaciones: '',
    estado: 'Borrador' as 'Borrador' | 'Emitida' | 'Anulada',
  });

  // Inicializar con 10 filas vacías
  const [detalles, setDetalles] = useState<Array<DetalleFactura & { porcentajeIVA?: number }>>(
    Array(10).fill(null).map(() => ({
      idProducto: 0,
      cantidad: 0,
      precioUnitario: 0,
      descuento: 0,
      iva: 0, // Valor del IVA (calculado)
      porcentajeIVA: 19, // Porcentaje de IVA (fijo del producto)
      subtotal: 0,
      total: 0,
    }))
  );

  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const codigoBarrasRef = useRef<HTMLInputElement>(null);
  const busquedaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Efecto para manejar código de barras (los lectores envían código + Enter)
  useEffect(() => {
    if (codigoBarras) {
      buscarProductoPorCodigo(codigoBarras);
    }
  }, [codigoBarras]);

  // Efecto para filtrar productos mientras se escribe
  useEffect(() => {
    if (busquedaProducto.trim()) {
      const filtrados = productos.filter((p: any) => {
        const busqueda = busquedaProducto.toLowerCase();
        return (
          p.codigo.toLowerCase().includes(busqueda) ||
          p.nombre.toLowerCase().includes(busqueda) ||
          (p.codigoBarras && p.codigoBarras.toLowerCase().includes(busqueda))
        );
      }).slice(0, 10); // Limitar a 10 resultados
      setProductosFiltrados(filtrados);
    } else {
      setProductosFiltrados([]);
    }
  }, [busquedaProducto, productos]);

  const cargarDatos = async () => {
    try {
      const [productosData, clientesData] = await Promise.all([
        api.productos.obtenerProductos({ activo: true }),
        api.terceros.obtenerTerceros(),
      ]);
      setProductos(productosData);
      setClientes(clientesData.filter((c: any) => c.tipo === 'Cliente' || c.tipo === 'C'));
    } catch (err: any) {
      setError('Error al cargar datos: ' + err.message);
    }
  };

  const buscarProductoPorCodigo = (codigo: string) => {
    const producto = productos.find((p: any) =>
      p.codigo === codigo ||
      p.codigoBarras === codigo ||
      p.codigo.toLowerCase() === codigo.toLowerCase()
    );

    if (producto) {
      agregarProductoALaTabla(producto);
      setCodigoBarras('');
      if (codigoBarrasRef.current) {
        codigoBarrasRef.current.focus();
      }
    } else {
      setError(`Producto con código ${codigo} no encontrado`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const agregarProductoALaTabla = (producto: Producto) => {
    // Buscar la primera fila vacía
    const nuevaFilaIndex = detalles.findIndex(d => d.idProducto === 0 || d.cantidad === 0);

    if (nuevaFilaIndex >= 0) {
      actualizarDetalle(nuevaFilaIndex, 'idProducto', (producto as any).idProducto);
      // Enfocar cantidad después de agregar
      setTimeout(() => {
        const cantidadInput = document.querySelector(
          `input[data-row="${nuevaFilaIndex}"][data-field="cantidad"]`
        ) as HTMLInputElement;
        if (cantidadInput) {
          cantidadInput.focus();
          cantidadInput.select();
        }
      }, 100);
    } else {
      // Si no hay filas vacías, agregar una nueva
      const porcentajeIVA = producto.iva || 19;
      const subtotal = producto.precioVenta;
      const ivaValor = subtotal * (porcentajeIVA / 100);
      const nuevosDetalles = [...detalles, {
        idProducto: (producto as any).idProducto,
        cantidad: 1,
        precioUnitario: producto.precioVenta,
        descuento: 0,
        iva: ivaValor,
        porcentajeIVA: porcentajeIVA,
        subtotal: subtotal,
        total: subtotal + ivaValor,
      }];
      setDetalles(nuevosDetalles);
    }
  };

  const actualizarDetalle = (index: number, campo: string, valor: any, agregarFila?: boolean) => {
    const nuevosDetalles = [...detalles];
    const detalle = nuevosDetalles[index];

    (detalle as any)[campo] = valor;

    if (campo === 'idProducto') {
      const producto = productos.find((p: any) => p.idProducto === valor);
      if (producto) {
        detalle.precioUnitario = producto.precioVenta;
        (detalle as any).porcentajeIVA = producto.iva || 19; // Guardar el porcentaje del producto
        if (!detalle.cantidad || detalle.cantidad === 0) {
          detalle.cantidad = 1;
        }
      }
    }

    // Calcular neto (cantidad * precio - descuento)
    const neto = (detalle.cantidad * detalle.precioUnitario) - (detalle.descuento || 0);
    detalle.subtotal = neto;

    // Obtener porcentaje de IVA del producto
    const porcentajeIVA = (detalle as any).porcentajeIVA || 19;

    // Calcular valor del IVA
    const valorIVA = neto * (porcentajeIVA / 100);
    detalle.iva = valorIVA; // Guardar el valor calculado del IVA
    detalle.total = neto + valorIVA;

    nuevosDetalles[index] = detalle;
    setDetalles(nuevosDetalles);

    // Si se presiona Enter, mover a la siguiente fila
    if (agregarFila && (campo === 'cantidad' || campo === 'precioUnitario' || campo === 'descuento')) {
      const siguienteIndex = index + 1;
      if (siguienteIndex < nuevosDetalles.length) {
        setTimeout(() => {
          const nextInput = document.querySelector(
            `input[data-row="${siguienteIndex}"][data-field="codigo"]`
          ) as HTMLInputElement;
          if (nextInput) {
            nextInput.focus();
          }
        }, 100);
      } else {
        // Agregar nueva fila si es la última
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
        setDetalles(nuevosDetalles);
      }
    }
  };

  const calcularTotales = () => {
    const detallesValidos = detalles.filter(d => d.idProducto > 0 && d.cantidad > 0);
    const subtotal = detallesValidos.reduce((sum, d) => sum + d.subtotal, 0);
    const iva = detallesValidos.reduce((sum, d) => sum + d.iva, 0);
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

      // Transformar detalles: enviar porcentajeIVA como iva (el backend espera porcentaje)
      const detallesParaEnviar = detallesValidos.map(d => ({
        idProducto: d.idProducto,
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        descuento: d.descuento || 0,
        iva: (d as any).porcentajeIVA || 19, // Enviar el porcentaje, no el valor calculado
        subtotal: d.subtotal,
        total: d.total,
      }));

      await api.facturas.crearFactura({
        ...formData,
        detalles: detallesParaEnviar,
        idUsuarioCreacion: usuario?.idUsuario || 1,
      });
      onSave();
    } catch (err: any) {
      setError('Error al guardar factura: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totales = calcularTotales();

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>🛒 Punto de Venta - Facturación</h1>
      </div>

      {error && <div className="alert alert-error" style={{ padding: '10px', background: '#fee', color: '#c33', marginBottom: '15px', borderRadius: '5px' }}>{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        {/* Encabezado */}
        <div className="form-section" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '10px' }}>
            <div className="form-group">
              <label>Número Factura</label>
              <input
                type="text"
                value={formData.numeroFactura}
                onChange={(e) => setFormData({ ...formData, numeroFactura: e.target.value })}
                placeholder="Se generará automáticamente"
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div className="form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
            <div className="form-group">
              <label>Cliente *</label>
              <select
                value={formData.idCliente}
                onChange={(e) => setFormData({ ...formData, idCliente: parseInt(e.target.value) })}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value={0}>Seleccione cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.idTercero} value={cliente.idTercero}>
                    {cliente.nit} - {cliente.nombreRazonSocial}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Breve descripción"
                style={{ width: '100%', padding: '8px' }}
              />
            </div>
          </div>
        </div>

        {/* Búsqueda rápida y código de barras */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div style={{ background: '#e8f4f8', padding: '15px', borderRadius: '5px', border: '2px solid #667eea' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#667eea' }}>
              📷 Código de Barras (Escanear)
            </label>
            <input
              ref={codigoBarrasRef}
              type="text"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (codigoBarras.trim()) {
                    buscarProductoPorCodigo(codigoBarras.trim());
                  }
                }
              }}
              placeholder="Escanear código de barras..."
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '2px solid #667eea', borderRadius: '5px' }}
              autoFocus
            />
          </div>
          <div style={{ background: '#f0f8e8', padding: '15px', borderRadius: '5px', border: '2px solid #48bb78', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#48bb78' }}>
              🔍 Búsqueda Rápida de Productos
            </label>
            <input
              ref={busquedaRef}
              type="text"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              placeholder="Buscar por código, nombre o código de barras..."
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '2px solid #48bb78', borderRadius: '5px' }}
            />
            {/* Lista de resultados de búsqueda */}
            {productosFiltrados.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #ddd',
                borderRadius: '5px',
                marginTop: '5px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {productosFiltrados.map((prod: any) => (
                  <div
                    key={prod.idProducto}
                    onClick={() => {
                      agregarProductoALaTabla(prod);
                      setBusquedaProducto('');
                      codigoBarrasRef.current?.focus();
                    }}
                    style={{
                      padding: '10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <div>
                      <strong>{prod.codigo}</strong> - {prod.nombre}
                      {prod.codigoBarras && <span style={{ color: '#666', fontSize: '12px' }}> | 📷 {prod.codigoBarras}</span>}
                    </div>
                    <div style={{ color: '#667eea', fontWeight: 'bold' }}>
                      ${prod.precioVenta.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de Detalles - Estilo POS */}
        <div className="table-container" style={{ marginBottom: '20px', background: 'white', borderRadius: '5px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#667eea', color: 'white' }}>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Reng</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Código/Artículo</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Descripción</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Cant.</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Precio</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Desc.</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Neto</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>IVA%</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>IVA</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((detalle, index) => {
                const producto = productos.find((p: any) => p.idProducto === detalle.idProducto);
                return (
                  <tr
                    key={index}
                    style={{
                      background: detalle.idProducto > 0 && detalle.cantidad > 0 ? '#fff' : '#f9f9f9',
                      borderBottom: '1px solid #e0e0e0'
                    }}
                  >
                    <td style={{ padding: '10px', textAlign: 'center', border: '1px solid #e0e0e0' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', minWidth: '200px' }}>
                      <input
                        type="text"
                        placeholder="Código o escanear..."
                        value={producto ? producto.codigo : ''}
                        onChange={(e) => {
                          const valor = e.target.value.trim();
                          if (valor) {
                            const prod = productos.find((p: any) =>
                              p.codigo === valor ||
                              p.codigoBarras === valor ||
                              p.codigo.toLowerCase() === valor.toLowerCase()
                            );
                            if (prod) {
                              actualizarDetalle(index, 'idProducto', prod.idProducto);
                            }
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const valor = (e.target as HTMLInputElement).value.trim();
                            if (valor) {
                              const prod = productos.find((p: any) =>
                                p.codigo === valor ||
                                p.codigoBarras === valor ||
                                p.codigo.toLowerCase() === valor.toLowerCase()
                              );
                              if (prod) {
                                actualizarDetalle(index, 'idProducto', prod.idProducto);
                                setTimeout(() => {
                                  const cantidadInput = document.querySelector(
                                    `input[data-row="${index}"][data-field="cantidad"]`
                                  ) as HTMLInputElement;
                                  if (cantidadInput) cantidadInput.focus();
                                }, 100);
                              }
                            }
                          }
                        }}
                        data-row={index}
                        data-field="codigo"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '14px' }}
                      />
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', fontSize: '13px', maxWidth: '250px' }}>
                      {producto ? producto.nombre : ''}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>
                      <input
                        type="number"
                        step="0.001"
                        value={detalle.cantidad || ''}
                        onChange={(e) => actualizarDetalle(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            actualizarDetalle(index, 'cantidad', detalle.cantidad, true);
                          }
                        }}
                        min="0"
                        data-row={index}
                        data-field="cantidad"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.precioUnitario || ''}
                        onChange={(e) => actualizarDetalle(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            actualizarDetalle(index, 'precioUnitario', detalle.precioUnitario, true);
                          }
                        }}
                        min="0"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={detalle.descuento || ''}
                        onChange={(e) => actualizarDetalle(index, 'descuento', parseFloat(e.target.value) || 0)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            actualizarDetalle(index, 'descuento', detalle.descuento, true);
                          }
                        }}
                        min="0"
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '3px', textAlign: 'right' }}
                      />
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                      ${detalle.subtotal.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                      {(detalle as any).porcentajeIVA || 19}%
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold' }}>
                      ${detalle.iva.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', textAlign: 'right', fontWeight: 'bold', color: '#667eea', fontSize: '15px' }}>
                      ${detalle.total.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                      {detalle.idProducto > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                          const nuevosDetalles = [...detalles];
                          nuevosDetalles[index] = {
                            idProducto: 0,
                            cantidad: 0,
                            precioUnitario: 0,
                            descuento: 0,
                            iva: 0,
                            porcentajeIVA: 19,
                            subtotal: 0,
                            total: 0,
                          };
                          setDetalles(nuevosDetalles);
                          }}
                          style={{
                            background: '#f56565',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px', borderRadius: '8px', minWidth: '350px', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '18px' }}>
              <strong>Subtotal:</strong>
              <strong>${totales.subtotal.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '18px' }}>
              <strong>I.V.A. (19%):</strong>
              <strong>${totales.iva.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '24px', paddingTop: '15px', borderTop: '2px solid rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
              <span>TOTAL:</span>
              <span>${totales.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={{ padding: '12px 24px', fontSize: '16px', background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            ❌ Cancelar
          </button>
          <button type="submit" disabled={loading} style={{ padding: '12px 24px', fontSize: '16px', background: loading ? '#a0aec0' : '#667eea', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {loading ? '⏳ Guardando...' : '💾 Guardar Factura'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FacturacionPage;

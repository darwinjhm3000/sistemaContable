/**
 * Página de Punto de Venta (POS)
 * Interfaz optimizada para ventas rápidas con impresión térmica
 */
import React, { useState, useEffect, useRef } from 'react';
import { posService, ConfiguracionPOS, DetalleVentaPOS } from '../services/api-pos';
import { api } from '../services';
import { Producto, Tercero } from '../types';
import { getFechaHoyLocal } from '../utils/fechas';
import './PuntoVentaPage.css';

const PuntoVentaPage: React.FC = () => {
  const [configuracion, setConfiguracion] = useState<ConfiguracionPOS | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado del carrito de venta
  const [carrito, setCarrito] = useState<DetalleVentaPOS[]>([]);
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [mostrarProductos, setMostrarProductos] = useState(false);

  const codigoBarrasRef = useRef<HTMLInputElement>(null);
  const busquedaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (codigoBarrasInput && configuracion?.usarCodigoBarras) {
      buscarPorCodigoBarras(codigoBarrasInput);
    }
  }, [codigoBarrasInput]);

  useEffect(() => {
    if (busquedaProducto) {
      filtrarProductos(busquedaProducto);
    } else {
      setProductosFiltrados([]);
    }
  }, [busquedaProducto, productos]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      setError('');

      // Cargar configuración POS
      console.log('📋 Cargando configuración POS...');
      const config = await posService.obtenerConfiguracion();
      console.log('✅ Configuración POS cargada:', config);
      setConfiguracion(config);

      // Cargar productos
      const productosData = await api.productos.obtenerProductos();
      setProductos(productosData);

      // Cargar clientes si es necesario
      if (config.requerirCliente || config.clientePorDefecto) {
        const clientesData = await api.clientes.obtenerClientes();
        setClientes(clientesData);

        if (config.clientePorDefecto) {
          setIdCliente(config.clientePorDefecto);
        }
      }

      // Establecer cliente por defecto si existe
      if (config.clientePorDefecto) {
        setIdCliente(config.clientePorDefecto);
      }

      // Focus en campo de código de barras
      setTimeout(() => {
        codigoBarrasRef.current?.focus();
      }, 100);
    } catch (err: any) {
      console.error('❌ Error al cargar datos del POS:', err);
      const errorMessage = err?.message || 'Error desconocido';
      setError(`Error al cargar la configuración del POS: ${errorMessage}`);

      // Si hay error, intentar usar configuración por defecto
      setConfiguracion({
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
        idEmpresa: 1
      });

      // Cargar productos aunque falle la configuración
      try {
        const productosData = await api.productos.obtenerProductos();
        setProductos(productosData);
      } catch (productosError: any) {
        console.error('Error al cargar productos:', productosError);
      }
    } finally {
      setLoading(false);
    }
  };

  const buscarPorCodigoBarras = (codigo: string) => {
    const producto = productos.find(
      p => p.codigoBarras?.toLowerCase() === codigo.toLowerCase() ||
           p.codigo?.toLowerCase() === codigo.toLowerCase()
    );

    if (producto) {
      agregarAlCarrito(producto);
      setCodigoBarrasInput('');
    }
  };

  const filtrarProductos = (termino: string) => {
    const terminoLower = termino.toLowerCase();
    const filtrados = productos.filter(
      p => p.nombre?.toLowerCase().includes(terminoLower) ||
           p.codigo?.toLowerCase().includes(terminoLower) ||
           p.codigoBarras?.toLowerCase().includes(terminoLower)
    ).slice(0, 10); // Limitar a 10 resultados
    setProductosFiltrados(filtrados);
  };

  const agregarAlCarrito = (producto: Producto, cantidad: number = 1) => {
    if (!configuracion || !producto.idProducto) return;

    // Validar stock si está habilitado
    if (configuracion.validarStock && (producto.cantidadStock || 0) < cantidad) {
      setError(`Stock insuficiente. Disponible: ${producto.cantidadStock || 0}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Verificar si el producto ya está en el carrito
    const existenteIndex = carrito.findIndex(item => item.idProducto === producto.idProducto);

    if (existenteIndex >= 0) {
      // Actualizar cantidad
      const nuevoCarrito = [...carrito];
      const nuevoItem = { ...nuevoCarrito[existenteIndex] };
      nuevoItem.cantidad += cantidad;

      // Recalcular totales
      nuevoItem.subtotal = (nuevoItem.cantidad * nuevoItem.precioUnitario) - (nuevoItem.descuento || 0);
      nuevoItem.total = nuevoItem.subtotal * (1 + nuevoItem.iva / 100);
      nuevoCarrito[existenteIndex] = nuevoItem;
      setCarrito(nuevoCarrito);
    } else {
      // Agregar nuevo producto
      const precio = producto.precioVenta || 0;
      const iva = producto.iva || 0;
      const subtotal = cantidad * precio;
      const total = subtotal * (1 + iva / 100);

      const nuevoItem: DetalleVentaPOS = {
        idProducto: producto.idProducto,
        codigoBarras: producto.codigoBarras || undefined,
        descripcion: producto.nombre || '',
        cantidad,
        precioUnitario: precio,
        iva,
        subtotal,
        total
      };

      setCarrito([...carrito, nuevoItem]);
    }

    setBusquedaProducto('');
    setProductosFiltrados([]);
    setMostrarProductos(false);

    // Volver al focus en código de barras
    setTimeout(() => {
      codigoBarrasRef.current?.focus();
    }, 100);
  };

  const actualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(index);
      return;
    }

    const nuevoCarrito = [...carrito];
    const item = nuevoCarrito[index];

    // Validar stock si está habilitado
    if (configuracion?.validarStock) {
      const producto = productos.find(p => p.idProducto === item.idProducto);
      if (producto && (producto.cantidadStock || 0) < nuevaCantidad) {
        setError(`Stock insuficiente. Disponible: ${producto.cantidadStock || 0}`);
        setTimeout(() => setError(''), 3000);
        return;
      }
    }

    item.cantidad = nuevaCantidad;
    item.subtotal = (item.cantidad * item.precioUnitario) - (item.descuento || 0);
    item.total = item.subtotal * (1 + item.iva / 100);

    setCarrito(nuevoCarrito);
  };

  const actualizarPrecio = (index: number, nuevoPrecio: number) => {
    if (!configuracion || configuracion.bloquearModificacionPrecio) {
      setError('La modificación de precios está bloqueada');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (nuevoPrecio <= 0) return;

    const nuevoCarrito = [...carrito];
    const item = nuevoCarrito[index];
    item.precioUnitario = nuevoPrecio;
    item.subtotal = (item.cantidad * item.precioUnitario) - (item.descuento || 0);
    item.total = item.subtotal * (1 + item.iva / 100);

    setCarrito(nuevoCarrito);
  };

  const actualizarIVA = (index: number, nuevoIVA: number) => {
    if (!configuracion || configuracion.bloquearModificacionIVA) {
      setError('La modificación de IVA está bloqueada');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const nuevoCarrito = [...carrito];
    const item = nuevoCarrito[index];
    item.iva = nuevoIVA;
    item.subtotal = (item.cantidad * item.precioUnitario) - (item.descuento || 0);
    item.total = item.subtotal * (1 + item.iva / 100);

    setCarrito(nuevoCarrito);
  };

  const eliminarDelCarrito = (index: number) => {
    const nuevoCarrito = carrito.filter((_, i) => i !== index);
    setCarrito(nuevoCarrito);
  };

  const calcularTotales = () => {
    const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
    const iva = carrito.reduce((sum, item) => sum + (item.total - item.subtotal), 0);
    const total = carrito.reduce((sum, item) => sum + item.total, 0);

    return { subtotal, iva, total };
  };

  const realizarVenta = async () => {
    if (!configuracion) return;

    try {
      setError('');

      // Validar cliente si es requerido
      if (configuracion.requerirCliente && !idCliente) {
        setError('Debe seleccionar un cliente');
        return;
      }

      // Validar carrito
      if (carrito.length === 0) {
        setError('El carrito está vacío');
        return;
      }

      const { total } = calcularTotales();

      const ventaData = {
        fecha: getFechaHoyLocal(),
        idCliente: idCliente || undefined,
        idVendedor: configuracion.vendedorPorDefecto || undefined,
        idEmpresa: configuracion.idEmpresa,
        detalles: carrito.map(item => ({
          idProducto: item.idProducto,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          iva: item.iva,
          descuento: item.descuento || 0
        })),
        idUsuarioCreacion: 1 // TODO: Obtener del contexto de autenticación
      };

      const resultado = await posService.realizarVentaRapida(ventaData);

      // Limpiar carrito después de venta exitosa
      setCarrito([]);
      setCodigoBarrasInput('');

      // Mostrar mensaje de éxito
      alert(`✅ Venta realizada exitosamente\n\nFactura: ${resultado.numeroFactura}\nTotal: $${resultado.total.toLocaleString()}`);

      // TODO: Imprimir factura térmica
      imprimirFacturaTermica(resultado.idFactura, resultado.numeroFactura);

      // Volver al focus en código de barras
      setTimeout(() => {
        codigoBarrasRef.current?.focus();
      }, 100);
    } catch (err: any) {
      setError('Error al realizar venta: ' + err.message);
    }
  };

  const imprimirFacturaTermica = (idFactura: number, numeroFactura: string) => {
    // TODO: Implementar impresión térmica
    console.log(`Imprimiendo factura térmica: ${numeroFactura}`);
    // Abrir ventana de impresión con formato térmico
    window.open(`/facturas/termica/${idFactura}`, '_blank');
  };

  if (loading) {
    return (
      <div className="pos-container">
        <div className="loading">Cargando punto de venta...</div>
      </div>
    );
  }

  if (!configuracion) {
    return (
      <div className="pos-container">
        <div className="error">Error: No se pudo cargar la configuración del POS</div>
      </div>
    );
  }

  const { subtotal, iva, total } = calcularTotales();

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>🛒 Punto de Venta</h1>
        <div className="pos-actions">
          <button onClick={() => setCarrito([])} className="btn btn-secondary">
            🗑️ Limpiar
          </button>
          <button onClick={() => window.open('/pos/configuracion', '_blank')} className="btn btn-secondary">
            ⚙️ Configuración
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="pos-content">
        {/* Panel izquierdo - Entrada de productos */}
        <div className="pos-left-panel">
          {/* Campo de código de barras */}
          {configuracion.usarCodigoBarras && (
            <div className="codigo-barras-input">
              <label>📷 Escanear Código de Barras:</label>
              <input
                ref={codigoBarrasRef}
                type="text"
                value={codigoBarrasInput}
                onChange={(e) => setCodigoBarrasInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && codigoBarrasInput) {
                    buscarPorCodigoBarras(codigoBarrasInput);
                  }
                }}
                placeholder="Escanear o escribir código..."
                autoFocus
              />
            </div>
          )}

          {/* Búsqueda de productos */}
          <div className="busqueda-productos">
            <label>🔍 Buscar Producto:</label>
            <input
              ref={busquedaRef}
              type="text"
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              onFocus={() => setMostrarProductos(true)}
              placeholder="Nombre, código o código de barras..."
            />

            {mostrarProductos && productosFiltrados.length > 0 && (
              <div className="productos-lista">
                {productosFiltrados.map(producto => (
                  <div
                    key={producto.idProducto}
                    className="producto-item"
                    onClick={() => agregarAlCarrito(producto)}
                  >
                    <div className="producto-info">
                      <strong>{producto.nombre}</strong>
                      <span>Código: {producto.codigo}</span>
                      {configuracion.mostrarStock && (
                        <span>Stock: {producto.cantidadStock || 0}</span>
                      )}
                    </div>
                    <div className="producto-precio">
                      ${(producto.precioVenta || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cliente (si es requerido o configurado) */}
          {(configuracion.requerirCliente || configuracion.clientePorDefecto) && (
            <div className="cliente-select">
              <label>👤 Cliente:</label>
              <select
                value={idCliente || ''}
                onChange={(e) => setIdCliente(e.target.value ? parseInt(e.target.value) : null)}
                required={configuracion.requerirCliente}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(cliente => (
                  <option key={cliente.idTercero} value={cliente.idTercero}>
                    {cliente.nombreRazonSocial} - {cliente.nit}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Carrito de venta */}
          <div className="carrito-venta">
            <h2>Carrito de Venta ({carrito.length})</h2>
            <div className="carrito-items">
              {carrito.length === 0 ? (
                <div className="carrito-vacio">El carrito está vacío</div>
              ) : (
                carrito.map((item, index) => (
                  <div key={index} className="carrito-item">
                    <div className="item-info">
                      <strong>{item.descripcion}</strong>
                      <div className="item-detalles">
                        <span>
                          Cantidad:
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => actualizarCantidad(index, parseFloat(e.target.value) || 1)}
                            className="input-cantidad"
                          />
                        </span>
                        <span>
                          Precio:
                          {configuracion.bloquearModificacionPrecio ? (
                            <strong>${item.precioUnitario.toLocaleString()}</strong>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precioUnitario}
                              onChange={(e) => actualizarPrecio(index, parseFloat(e.target.value) || 0)}
                              className="input-precio"
                            />
                          )}
                        </span>
                        <span>
                          IVA:
                          {configuracion.bloquearModificacionIVA ? (
                            <strong>{item.iva}%</strong>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.iva}
                              onChange={(e) => actualizarIVA(index, parseFloat(e.target.value) || 0)}
                              className="input-iva"
                            />
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="item-total">
                      ${item.total.toLocaleString()}
                      <button onClick={() => eliminarDelCarrito(index)} className="btn-eliminar">
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho - Totales y acciones */}
        <div className="pos-right-panel">
          <div className="totales-venta">
            <h2>Totales</h2>
            <div className="total-item">
              <span>Subtotal:</span>
              <strong>${subtotal.toLocaleString()}</strong>
            </div>
            <div className="total-item">
              <span>IVA:</span>
              <strong>${iva.toLocaleString()}</strong>
            </div>
            <div className="total-item total-final">
              <span>TOTAL:</span>
              <strong>${total.toLocaleString()}</strong>
            </div>
          </div>

          <div className="acciones-venta">
            <button
              onClick={realizarVenta}
              disabled={carrito.length === 0 || (configuracion.requerirCliente && !idCliente)}
              className="btn btn-primary btn-grande"
            >
              💰 Realizar Venta
            </button>
            <button onClick={() => setCarrito([])} className="btn btn-secondary">
              🗑️ Cancelar
            </button>
          </div>

          {/* Indicadores de bloqueos */}
          <div className="indicadores-bloqueo">
            {configuracion.bloquearModificacionPrecio && (
              <span className="badge badge-warning">🔒 Precios bloqueados</span>
            )}
            {configuracion.bloquearModificacionIVA && (
              <span className="badge badge-warning">🔒 IVA bloqueado</span>
            )}
            {configuracion.bloquearModificacionTotal && (
              <span className="badge badge-warning">🔒 Total bloqueado</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuntoVentaPage;


import React, { useState, useEffect } from 'react';
import { api } from '../services';
import { Inventario, MovimientoInventario } from '../types';
import Toolbar from '../components/Toolbar';

const InventarioPage: React.FC = () => {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [bajoStock, setBajoStock] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    cargarInventario();
  }, [bajoStock, buscar]);

  const cargarInventario = async () => {
    try {
      setLoading(true);
      const datos = await api.inventario.obtenerInventario({
        bajoStock: bajoStock || undefined,
        buscar: buscar || undefined,
      });
      setInventario(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar inventario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const verMovimientos = (idProducto: number) => {
    setProductoSeleccionado(idProducto);
  };

  if (productoSeleccionado) {
    return (
      <MovimientosInventario
        idProducto={productoSeleccionado}
        onBack={() => setProductoSeleccionado(null)}
      />
    );
  }

  const valorTotalInventario = 0; // TODO: Calcular valor total si se necesita

  return (
    <div className="container">
      <div className="header">
        <h1>📦 Inventario</h1>
        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Valor Total</div>
            <div className="stat-value">${valorTotalInventario.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showSearch={true}
        searchValue={buscar}
        onSearchChange={setBuscar}
        onSearch={cargarInventario}
        searchPlaceholder="Buscar por código o nombre..."
        showPrint={true}
        onPrint={() => window.print()}
      />

      <div className="filters" style={{ marginTop: '10px', marginBottom: '20px' }}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={bajoStock}
            onChange={(e) => setBajoStock(e.target.checked)}
          />
          Solo productos bajo stock mínimo
        </label>
      </div>

      {loading ? (
        <div className="loading">Cargando inventario...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Unidad</th>
                <th>Cantidad</th>
                <th>Mínimo</th>
                <th>Máximo</th>
                <th>Ubicación</th>
                <th>Valor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventario.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center">
                    No hay productos en inventario
                  </td>
                </tr>
              ) : (
                inventario.map((item: any) => {
                  const cantidadStock = item.cantidadStock || 0;
                  const cantidadMinima = item.cantidadMinima || 0;
                  const cantidadMaxima = item.cantidadMaxima || 0;
                  const bajoStock = cantidadStock <= cantidadMinima && cantidadMinima > 0;

                  return (
                    <tr
                      key={item.idProducto}
                      className={bajoStock ? 'row-bajo-stock' : ''}
                    >
                      <td>{item.codigo || '-'}</td>
                      <td>{item.nombre || '-'}</td>
                      <td>{item.unidadMedida || '-'}</td>
                      <td>
                        <span className={bajoStock ? 'stock-bajo' : ''}>
                          {cantidadStock.toLocaleString()}
                        </span>
                      </td>
                      <td>{cantidadMinima.toLocaleString()}</td>
                      <td>{cantidadMaxima > 0 ? cantidadMaxima.toLocaleString() : '-'}</td>
                      <td>{item.ubicacion || '-'}</td>
                      <td>-</td>
                      <td>
                        <button
                          onClick={() => verMovimientos(item.idProducto)}
                          className="btn btn-small btn-secondary"
                        >
                          📊 Movimientos
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const MovimientosInventario: React.FC<{
  idProducto: number;
  onBack: () => void;
}> = ({ idProducto, onBack }) => {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarMovimientos();
  }, [idProducto]);

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      const datos = await api.inventario.obtenerMovimientos(idProducto);
      setMovimientos(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Movimientos de Inventario</h1>
        <button onClick={onBack} className="btn btn-secondary">
          ← Volver
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading">Cargando movimientos...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Cant. Anterior</th>
                <th>Cant. Nueva</th>
                <th>Concepto</th>
                <th>Referencia</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                movimientos.map((mov: any) => (
                  <tr key={mov.idMovimiento}>
                    <td>{mov.fecha ? new Date(mov.fecha).toLocaleString() : '-'}</td>
                    <td>
                      <span className={`badge badge-${mov.tipoMovimiento.toLowerCase()}`}>
                        {mov.tipoMovimiento}
                      </span>
                    </td>
                    <td>{(mov.cantidad || 0).toLocaleString()}</td>
                    <td>{(mov.cantidadAnterior || 0).toLocaleString()}</td>
                    <td>{(mov.cantidadNueva || 0).toLocaleString()}</td>
                    <td>{mov.observaciones || mov.concepto || '-'}</td>
                    <td>{mov.referencia || '-'}</td>
                    <td>-</td>
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

export default InventarioPage;



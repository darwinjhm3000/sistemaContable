import React, { useState, useEffect } from 'react';
import { api } from '../services';
import { Vendedor } from '../types';
import Toolbar from './Toolbar';

const VendedoresList: React.FC = () => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vendedorEditando, setVendedorEditando] = useState<Vendedor | null>(null);
  const [indiceActual, setIndiceActual] = useState(0);

  useEffect(() => {
    cargarVendedores();
  }, []);

  const cargarVendedores = async () => {
    try {
      setLoading(true);
      const datos = await api.vendedores.obtenerVendedores({ activo: true, buscar });
      setVendedores(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar vendedores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    cargarVendedores();
  };

  const handleEditar = (vendedor: any) => {
    const indice = vendedores.findIndex(v => v.idVendedor === vendedor.idVendedor);
    setIndiceActual(indice >= 0 ? indice : 0);
    setVendedorEditando(vendedor);
    setMostrarFormulario(true);
  };

  const handleNuevo = () => {
    setVendedorEditando(null);
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    setVendedorEditando(null);
    cargarVendedores();
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este vendedor?')) {
      return;
    }

    try {
      await api.vendedores.eliminarVendedor(id);
      cargarVendedores();
    } catch (err: any) {
      alert('Error al eliminar vendedor: ' + err.message);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handlePrimero = () => {
    if (vendedores.length > 0) {
      setIndiceActual(0);
      handleEditar(vendedores[0]);
    }
  };

  const handleAnterior = () => {
    if (indiceActual > 0) {
      const nuevoIndice = indiceActual - 1;
      setIndiceActual(nuevoIndice);
      handleEditar(vendedores[nuevoIndice]);
    }
  };

  const handleSiguiente = () => {
    if (indiceActual < vendedores.length - 1) {
      const nuevoIndice = indiceActual + 1;
      setIndiceActual(nuevoIndice);
      handleEditar(vendedores[nuevoIndice]);
    }
  };

  const handleUltimo = () => {
    if (vendedores.length > 0) {
      const ultimoIndice = vendedores.length - 1;
      setIndiceActual(ultimoIndice);
      handleEditar(vendedores[ultimoIndice]);
    }
  };

  if (mostrarFormulario) {
    return (
      <VendedorForm
        vendedor={vendedorEditando}
        onCancel={handleCerrarFormulario}
        onSave={handleCerrarFormulario}
        onEditar={handleEditar}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>👔 Gestión de Vendedores</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nuevo Vendedor
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showSearch={true}
        searchValue={buscar}
        onSearchChange={setBuscar}
        onSearch={handleBuscar}
        searchPlaceholder="Buscar por nombre, código o NIT..."
        showNew={true}
        onNew={handleNuevo}
        newLabel="➕ Nuevo Vendedor"
        showPrint={true}
        onPrint={handleImprimir}
      />

      {loading ? (
        <div className="loading">Cargando vendedores...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>NIT</th>
                <th>Nombre/Razón Social</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Comisión (%)</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center">
                    No hay vendedores registrados
                  </td>
                </tr>
              ) : (
                vendedores.map((ven: any) => (
                  <tr key={ven.idVendedor}>
                    <td>{ven.codigoVendedor || '-'}</td>
                    <td>{ven.nit}</td>
                    <td>{ven.nombreRazonSocial}</td>
                    <td>{ven.direccion || '-'}</td>
                    <td>{ven.telefono || '-'}</td>
                    <td>{ven.email || '-'}</td>
                    <td>{ven.comision?.toFixed(2) || '0.00'}%</td>
                    <td>
                      <button
                        onClick={() => handleEditar(ven)}
                        className="btn btn-small btn-secondary"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(ven.idVendedor)}
                        className="btn btn-small btn-danger"
                        style={{ marginLeft: '5px' }}
                      >
                        🗑️ Eliminar
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

const VendedorForm: React.FC<{
  vendedor: Vendedor | null;
  onCancel: () => void;
  onSave: () => void;
  onEditar?: (vendedor: Vendedor) => void;
}> = ({ vendedor, onCancel, onSave, onEditar }) => {
  const [formData, setFormData] = useState({
    nit: vendedor?.nit || '',
    nombreRazonSocial: vendedor?.nombreRazonSocial || '',
    direccion: vendedor?.direccion || '',
    telefono: vendedor?.telefono || '',
    email: vendedor?.email || '',
    codigoVendedor: vendedor?.codigoVendedor || '',
    comision: vendedor?.comision || 0,
    activo: vendedor?.activo !== false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [indiceFormActual, setIndiceFormActual] = useState(0);
  const [totalFormItems, setTotalFormItems] = useState(0);
  const [todosVendedores, setTodosVendedores] = useState<Vendedor[]>([]);

  useEffect(() => {
    // Cargar todos los vendedores para navegación
    api.vendedores.obtenerVendedores({ activo: true }).then(data => {
      setTodosVendedores(data);
      setTotalFormItems(data.length);
      if (vendedor) {
        const indice = data.findIndex((v: any) => v.idVendedor === vendedor.idVendedor);
        setIndiceFormActual(indice >= 0 ? indice : 0);
      }
    });
  }, [vendedor]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setLoading(true);
    setError('');

    try {
      if (vendedor?.idVendedor) {
        await api.vendedores.actualizarVendedor(vendedor.idVendedor, formData);
      } else {
        console.log('Creando vendedor con datos:', formData);
        const resultado = await api.vendedores.crearVendedor(formData);
        console.log('Resultado:', resultado);
      }
      onSave();
    } catch (err: any) {
      console.error('Error completo al guardar vendedor:', err);
      const mensajeError = err.response?.data?.mensaje || err.response?.data?.error || err.message || 'Error desconocido';
      const detallesError = err.response?.data?.detalles || '';
      setError(`Error al guardar vendedor: ${mensajeError}${detallesError ? `\nDetalles: ${detallesError}` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimeroForm = () => {
    if (todosVendedores.length > 0 && onEditar) {
      onEditar(todosVendedores[0]);
    }
  };

  const handleAnteriorForm = () => {
    if (indiceFormActual > 0 && onEditar) {
      onEditar(todosVendedores[indiceFormActual - 1]);
    }
  };

  const handleSiguienteForm = () => {
    if (indiceFormActual < todosVendedores.length - 1 && onEditar) {
      onEditar(todosVendedores[indiceFormActual + 1]);
    }
  };

  const handleUltimoForm = () => {
    if (todosVendedores.length > 0 && onEditar) {
      onEditar(todosVendedores[todosVendedores.length - 1]);
    }
  };

  const handleImprimirForm = () => {
    window.print();
  };

  const handleNuevoForm = () => {
    onCancel();
    // El componente padre manejará crear nuevo
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{vendedor ? '✏️ Editar Vendedor' : '➕ Nuevo Vendedor'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showNavigation={!!vendedor}
        currentIndex={indiceFormActual}
        totalItems={totalFormItems}
        onFirst={handlePrimeroForm}
        onPrevious={handleAnteriorForm}
        onNext={handleSiguienteForm}
        onLast={handleUltimoForm}
        showNew={true}
        onNew={handleNuevoForm}
        newLabel="➕ Nuevo"
        showSave={true}
        onSave={() => handleSubmit()}
        saveLabel="💾 Guardar"
        saveDisabled={loading}
        saving={loading}
        showPrint={true}
        onPrint={handleImprimirForm}
        showCancel={true}
        onCancel={onCancel}
        cancelLabel="❌ Cancelar"
      />

      <form onSubmit={handleSubmit} className="form">
        <div className="form-section">
          <h2>Información del Vendedor</h2>
          <div className="form-row">
            <div className="form-group">
              <label>NIT *</label>
              <input
                type="text"
                value={formData.nit}
                onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                required
                disabled={!!vendedor}
              />
            </div>
            <div className="form-group">
              <label>Nombre/Razón Social *</label>
              <input
                type="text"
                value={formData.nombreRazonSocial}
                onChange={(e) => setFormData({ ...formData, nombreRazonSocial: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dirección</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Código Vendedor</label>
              <input
                type="text"
                value={formData.codigoVendedor}
                onChange={(e) => setFormData({ ...formData, codigoVendedor: e.target.value })}
                placeholder="Se generará automáticamente si se deja vacío"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Comisión (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.comision}
                onChange={(e) => setFormData({ ...formData, comision: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={formData.activo ? '1' : '0'}
                onChange={(e) => setFormData({ ...formData, activo: e.target.value === '1' })}
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VendedoresList;


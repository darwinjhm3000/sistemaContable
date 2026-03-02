import React, { useState, useEffect } from 'react';
import { api } from '../services';
import { Proveedor } from '../types';
import Toolbar from './Toolbar';

const ProveedoresList: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const datos = await api.proveedores.obtenerProveedores({ activo: true, buscar });
      setProveedores(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar proveedores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    cargarProveedores();
  };

  const handleEditar = (proveedor: any) => {
    setProveedorEditando(proveedor);
    setMostrarFormulario(true);
  };

  const handleNuevo = () => {
    setProveedorEditando(null);
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    setProveedorEditando(null);
    cargarProveedores();
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este proveedor?')) {
      return;
    }

    try {
      await api.proveedores.eliminarProveedor(id);
      cargarProveedores();
    } catch (err: any) {
      alert('Error al eliminar proveedor: ' + err.message);
    }
  };

  if (mostrarFormulario) {
    return (
      <ProveedorForm
        proveedor={proveedorEditando}
        onCancel={handleCerrarFormulario}
        onSave={handleCerrarFormulario}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🏭 Gestión de Proveedores</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nuevo Proveedor
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showSearch={true}
        searchValue={buscar}
        onSearchChange={setBuscar}
        onSearch={handleBuscar}
        searchPlaceholder="Buscar por nombre, NIT, código o email..."
        showNew={true}
        onNew={handleNuevo}
        newLabel="➕ Nuevo Proveedor"
        showPrint={true}
        onPrint={() => window.print()}
      />

      {loading ? (
        <div className="loading">Cargando proveedores...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>NIT</th>
                <th>Nombre/Razón Social</th>
                <th>Ciudad</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Condición Pago</th>
                <th>Plazo Entrega</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center">
                    No hay proveedores registrados
                  </td>
                </tr>
              ) : (
                proveedores.map((prov: any) => (
                  <tr key={prov.idProveedor}>
                    <td>{prov.codigoProveedor || '-'}</td>
                    <td>{prov.nit}</td>
                    <td>{prov.nombreRazonSocial}</td>
                    <td>{prov.ciudad || '-'}</td>
                    <td>{prov.telefono || prov.celular || '-'}</td>
                    <td>{prov.email || '-'}</td>
                    <td>{prov.condicionPago || '-'}</td>
                    <td>{prov.plazoEntrega ? `${prov.plazoEntrega} días` : '-'}</td>
                    <td>
                      <button
                        onClick={() => handleEditar(prov)}
                        className="btn btn-small btn-secondary"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(prov.idProveedor)}
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

const ProveedorForm: React.FC<{
  proveedor: Proveedor | null;
  onCancel: () => void;
  onSave: () => void;
}> = ({ proveedor, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    nit: proveedor?.nit || '',
    nombreRazonSocial: proveedor?.nombreRazonSocial || '',
    direccion: proveedor?.direccion || '',
    codigoProveedor: proveedor?.codigoProveedor || '',
    telefono: proveedor?.telefono || '',
    celular: proveedor?.celular || '',
    email: proveedor?.email || '',
    ciudad: proveedor?.ciudad || '',
    departamento: proveedor?.departamento || '',
    tipoPersona: proveedor?.tipoPersona || 'J' as 'N' | 'J',
    regimenTributario: proveedor?.regimenTributario || '',
    condicionPago: proveedor?.condicionPago || 'Contado',
    plazoEntrega: proveedor?.plazoEntrega || 0,
    observaciones: proveedor?.observaciones || '',
    activo: proveedor?.activo !== false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (proveedor?.idProveedor) {
        await api.proveedores.actualizarProveedor(proveedor.idProveedor, formData);
      } else {
        await api.proveedores.crearProveedor(formData);
      }
      onSave();
    } catch (err: any) {
      setError('Error al guardar proveedor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{proveedor ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showNew={true}
        onNew={() => {
          setFormData({
            nit: '',
            nombreRazonSocial: '',
            direccion: '',
            codigoProveedor: '',
            telefono: '',
            celular: '',
            email: '',
            ciudad: '',
            departamento: '',
            tipoPersona: 'J' as 'N' | 'J',
            regimenTributario: '',
            condicionPago: 'Contado',
            plazoEntrega: 0,
            observaciones: '',
            activo: true,
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
        <h3>Información Básica</h3>
        <div className="form-row">
          <div className="form-group">
            <label>NIT *</label>
            <input
              type="text"
              value={formData.nit}
              onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              required
              disabled={!!proveedor}
            />
          </div>
          <div className="form-group">
            <label>Código Proveedor</label>
            <input
              type="text"
              value={formData.codigoProveedor}
              onChange={(e) => setFormData({ ...formData, codigoProveedor: e.target.value })}
              placeholder="Se genera automáticamente si se deja vacío"
            />
          </div>
          <div className="form-group">
            <label>Tipo Persona *</label>
            <select
              value={formData.tipoPersona}
              onChange={(e) => setFormData({ ...formData, tipoPersona: e.target.value as 'N' | 'J' })}
            >
              <option value="J">Jurídica</option>
              <option value="N">Natural</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Nombre / Razón Social *</label>
          <input
            type="text"
            value={formData.nombreRazonSocial}
            onChange={(e) => setFormData({ ...formData, nombreRazonSocial: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Dirección</label>
          <input
            type="text"
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Ciudad</label>
            <input
              type="text"
              value={formData.ciudad}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Departamento</label>
            <input
              type="text"
              value={formData.departamento}
              onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
            />
          </div>
        </div>

        <h3>Información de Contacto</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Celular</label>
            <input
              type="text"
              value={formData.celular}
              onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <h3>Información Comercial</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Régimen Tributario</label>
            <select
              value={formData.regimenTributario}
              onChange={(e) => setFormData({ ...formData, regimenTributario: e.target.value })}
            >
              <option value="">Seleccione...</option>
              <option value="Simplificado">Simplificado</option>
              <option value="Común">Común</option>
              <option value="Gran Contribuyente">Gran Contribuyente</option>
            </select>
          </div>
          <div className="form-group">
            <label>Condición de Pago</label>
            <select
              value={formData.condicionPago}
              onChange={(e) => setFormData({ ...formData, condicionPago: e.target.value })}
            >
              <option value="Contado">Contado</option>
              <option value="15 días">15 días</option>
              <option value="30 días">30 días</option>
              <option value="60 días">60 días</option>
              <option value="90 días">90 días</option>
            </select>
          </div>
          <div className="form-group">
            <label>Plazo Entrega (días)</label>
            <input
              type="number"
              min="0"
              value={formData.plazoEntrega}
              onChange={(e) => setFormData({ ...formData, plazoEntrega: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Observaciones</label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            rows={3}
          />
        </div>

      </form>
    </div>
  );
};

export default ProveedoresList;


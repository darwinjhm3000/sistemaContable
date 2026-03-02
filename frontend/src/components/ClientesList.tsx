import React, { useState, useEffect } from 'react';
import { api } from '../services';
import { Cliente } from '../types';
import Toolbar from './Toolbar';

const ClientesList: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const datos = await api.clientes.obtenerClientes({ activo: true, buscar });
      setClientes(datos);
      setError('');
    } catch (err: any) {
      setError('Error al cargar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    cargarClientes();
  };

  const handleEditar = (cliente: any) => {
    setClienteEditando(cliente);
    setMostrarFormulario(true);
  };

  const handleNuevo = () => {
    setClienteEditando(null);
    setMostrarFormulario(true);
  };

  const handleCerrarFormulario = () => {
    setMostrarFormulario(false);
    setClienteEditando(null);
    cargarClientes();
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este cliente?')) {
      return;
    }

    try {
      await api.clientes.eliminarCliente(id);
      cargarClientes();
    } catch (err: any) {
      alert('Error al eliminar cliente: ' + err.message);
    }
  };

  if (mostrarFormulario) {
    return (
      <ClienteForm
        cliente={clienteEditando}
        onCancel={handleCerrarFormulario}
        onSave={handleCerrarFormulario}
      />
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>👥 Gestión de Clientes</h1>
        <button onClick={handleNuevo} className="btn btn-primary">
          + Nuevo Cliente
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
        newLabel="➕ Nuevo Cliente"
        showPrint={true}
        onPrint={() => window.print()}
      />

      {loading ? (
        <div className="loading">Cargando clientes...</div>
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
                <th>Límite Crédito</th>
                <th>Saldo Actual</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center">
                    No hay clientes registrados
                  </td>
                </tr>
              ) : (
                clientes.map((cli: any) => (
                  <tr key={cli.idCliente}>
                    <td>{cli.codigoCliente || '-'}</td>
                    <td>{cli.nit}</td>
                    <td>{cli.nombreRazonSocial}</td>
                    <td>{cli.ciudad || '-'}</td>
                    <td>{cli.telefono || cli.celular || '-'}</td>
                    <td>{cli.email || '-'}</td>
                    <td>${cli.limiteCredito?.toLocaleString() || '0'}</td>
                    <td>
                      <span className={cli.saldoActual && cli.saldoActual > 0 ? 'text-warning' : ''}>
                        ${cli.saldoActual?.toLocaleString() || '0'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEditar(cli)}
                        className="btn btn-small btn-secondary"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleEliminar(cli.idCliente)}
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

const ClienteForm: React.FC<{
  cliente: Cliente | null;
  onCancel: () => void;
  onSave: () => void;
}> = ({ cliente, onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    nit: cliente?.nit || '',
    nombreRazonSocial: cliente?.nombreRazonSocial || '',
    direccion: cliente?.direccion || '',
    codigoCliente: cliente?.codigoCliente || '',
    telefono: cliente?.telefono || '',
    celular: cliente?.celular || '',
    email: cliente?.email || '',
    ciudad: cliente?.ciudad || '',
    departamento: cliente?.departamento || '',
    tipoPersona: cliente?.tipoPersona || 'J' as 'N' | 'J',
    regimenTributario: cliente?.regimenTributario || '',
    condicionPago: cliente?.condicionPago || 'Contado',
    limiteCredito: cliente?.limiteCredito || 0,
    descuento: cliente?.descuento || 0,
    observaciones: cliente?.observaciones || '',
    activo: cliente?.activo !== false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (cliente?.idCliente) {
        await api.clientes.actualizarCliente(cliente.idCliente, formData);
      } else {
        await api.clientes.crearCliente(formData);
      }
      onSave();
    } catch (err: any) {
      setError('Error al guardar cliente: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>{cliente ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <Toolbar
        showNew={true}
        onNew={() => {
          setFormData({
            nit: '',
            nombreRazonSocial: '',
            direccion: '',
            codigoCliente: '',
            telefono: '',
            celular: '',
            email: '',
            ciudad: '',
            departamento: '',
            tipoPersona: 'J' as 'N' | 'J',
            regimenTributario: '',
            condicionPago: 'Contado',
            limiteCredito: 0,
            descuento: 0,
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
              disabled={!!cliente}
            />
          </div>
          <div className="form-group">
            <label>Código Cliente</label>
            <input
              type="text"
              value={formData.codigoCliente}
              onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })}
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
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Límite de Crédito</label>
            <input
              type="number"
              step="0.01"
              value={formData.limiteCredito}
              onChange={(e) => setFormData({ ...formData, limiteCredito: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>Descuento %</label>
            <input
              type="number"
              step="0.01"
              value={formData.descuento}
              onChange={(e) => setFormData({ ...formData, descuento: parseFloat(e.target.value) || 0 })}
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

export default ClientesList;


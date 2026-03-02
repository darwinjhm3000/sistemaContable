import React, { useState } from 'react';
import { api } from '../services';

interface ProveedorFormRapidoProps {
  datosIniciales: {
    nit?: string;
    nombreRazonSocial?: string;
    direccion?: string;
    tipoPersona?: 'N' | 'J';
    activo?: boolean;
  };
  onSave: (datos: any) => Promise<void>;
  onCancel: () => void;
}

const ProveedorFormRapido: React.FC<ProveedorFormRapidoProps> = ({ datosIniciales, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nit: datosIniciales.nit || '',
    nombreRazonSocial: datosIniciales.nombreRazonSocial || '',
    direccion: datosIniciales.direccion || '',
    codigoProveedor: '',
    telefono: '',
    celular: '',
    email: '',
    ciudad: '',
    departamento: '',
    tipoPersona: datosIniciales.tipoPersona || 'J' as 'N' | 'J',
    regimenTributario: '',
    condicionPago: 'Contado',
    plazoEntrega: 0,
    observaciones: '',
    activo: datosIniciales.activo !== false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nit || !formData.nombreRazonSocial) {
      setError('NIT y Nombre/Razón Social son requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(formData);
    } catch (err: any) {
      setError('Error al guardar proveedor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label>NIT *</label>
          <input
            type="text"
            value={formData.nit}
            onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
            required
            placeholder="Número de identificación tributaria"
          />
        </div>
        <div className="form-group">
          <label>Nombre/Razón Social *</label>
          <input
            type="text"
            value={formData.nombreRazonSocial}
            onChange={(e) => setFormData({ ...formData, nombreRazonSocial: e.target.value })}
            required
            placeholder="Nombre completo o razón social"
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
            placeholder="Dirección del proveedor"
          />
        </div>
        <div className="form-group">
          <label>Código Proveedor</label>
          <input
            type="text"
            value={formData.codigoProveedor}
            onChange={(e) => setFormData({ ...formData, codigoProveedor: e.target.value })}
            placeholder="Código interno (opcional)"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Teléfono</label>
          <input
            type="text"
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            placeholder="Teléfono fijo"
          />
        </div>
        <div className="form-group">
          <label>Celular</label>
          <input
            type="text"
            value={formData.celular}
            onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
            placeholder="Número de celular"
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
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div className="form-group">
          <label>Tipo de Persona</label>
          <select
            value={formData.tipoPersona}
            onChange={(e) => setFormData({ ...formData, tipoPersona: e.target.value as 'N' | 'J' })}
          >
            <option value="J">Jurídica</option>
            <option value="N">Natural</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Ciudad</label>
          <input
            type="text"
            value={formData.ciudad}
            onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
            placeholder="Ciudad"
          />
        </div>
        <div className="form-group">
          <label>Departamento</label>
          <input
            type="text"
            value={formData.departamento}
            onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
            placeholder="Departamento"
          />
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Crear Proveedor y Continuar'}
        </button>
      </div>
    </form>
  );
};

export default ProveedorFormRapido;


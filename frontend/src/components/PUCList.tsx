import React, { useState, useEffect } from 'react';
import { CuentaPUC } from '../types';
import { api, ApiException } from '../services';

const PUCList: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaPUC[]>([]);
  const [cuentasFiltradas, setCuentasFiltradas] = useState<CuentaPUC[]>([]);
  const [nivelSeleccionado, setNivelSeleccionado] = useState<number | null>(null);
  const [codigoPadreSeleccionado, setCodigoPadreSeleccionado] = useState<string | null>(null);
  const [rutaNavegacion, setRutaNavegacion] = useState<CuentaPUC[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    cargarCuentas();
  }, []);

  useEffect(() => {
    filtrarCuentas();
  }, [cuentas, nivelSeleccionado, codigoPadreSeleccionado]);

  const cargarCuentas = async () => {
    try {
      setLoading(true);
      const data = await api.puc.obtenerCuentas();
      setCuentas(data);

      // Por defecto, mostrar las clases (nivel 1)
      setNivelSeleccionado(1);
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Error al cargar las cuentas del PUC');
      }
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtrarCuentas = () => {
    let filtradas = cuentas;

    if (codigoPadreSeleccionado) {
      filtradas = cuentas.filter(c => c.codigoPadre === codigoPadreSeleccionado);
    } else if (nivelSeleccionado !== null) {
      filtradas = cuentas.filter(c => c.nivel === nivelSeleccionado);
    }

    setCuentasFiltradas(filtradas);
  };

  const navegarACuenta = (cuenta: CuentaPUC) => {
    // Agregar a la ruta de navegación
    setRutaNavegacion([...rutaNavegacion, cuenta]);

    // Filtrar por hijos de esta cuenta
    setCodigoPadreSeleccionado(cuenta.codigoCuenta);
    setNivelSeleccionado(null);
  };

  const navegarAtras = () => {
    if (rutaNavegacion.length > 0) {
      const nuevaRuta = rutaNavegacion.slice(0, -1);
      setRutaNavegacion(nuevaRuta);

      if (nuevaRuta.length > 0) {
        const cuentaPadre = nuevaRuta[nuevaRuta.length - 1];
        setCodigoPadreSeleccionado(cuentaPadre.codigoCuenta);
      } else {
        setCodigoPadreSeleccionado(null);
        setNivelSeleccionado(1);
      }
    } else {
      setCodigoPadreSeleccionado(null);
      setNivelSeleccionado(1);
    }
  };

  const navegarARuta = (index: number) => {
    const nuevaRuta = rutaNavegacion.slice(0, index + 1);
    setRutaNavegacion(nuevaRuta);

    if (nuevaRuta.length > 0) {
      const cuentaPadre = nuevaRuta[nuevaRuta.length - 1];
      setCodigoPadreSeleccionado(cuentaPadre.codigoCuenta);
    } else {
      setCodigoPadreSeleccionado(null);
      setNivelSeleccionado(1);
    }
  };

  const tieneHijos = (codigoCuenta: string): boolean => {
    return cuentas.some(c => c.codigoPadre === codigoCuenta);
  };

  const obtenerNombreNivel = (nivel: number): string => {
    const nombres: { [key: number]: string } = {
      1: 'Clase',
      2: 'Grupo',
      3: 'Cuenta',
      4: 'Subcuenta'
    };
    return nombres[nivel] || `Nivel ${nivel}`;
  };

  if (loading) {
    return (
      <div className="puc-container">
        <div className="loading">Cargando cuentas del PUC...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="puc-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="puc-container">
      <h2>Plan Único de Cuentas (PUC) - Colombia</h2>

      {/* Breadcrumb de navegación */}
      <div className="breadcrumb">
        <button onClick={() => {
          setRutaNavegacion([]);
          setCodigoPadreSeleccionado(null);
          setNivelSeleccionado(1);
        }} className="breadcrumb-item">
          Inicio
        </button>
        {rutaNavegacion.map((cuenta, index) => (
          <React.Fragment key={cuenta.codigoCuenta}>
            <span className="breadcrumb-separator">›</span>
            <button
              onClick={() => navegarARuta(index)}
              className="breadcrumb-item"
            >
              {cuenta.codigoCuenta} - {cuenta.nombreCuenta}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Filtros por nivel */}
      <div className="filtros">
        <button
          onClick={() => {
            setRutaNavegacion([]);
            setCodigoPadreSeleccionado(null);
            setNivelSeleccionado(1);
          }}
          className={`filtro-btn ${nivelSeleccionado === 1 && !codigoPadreSeleccionado ? 'active' : ''}`}
        >
          Clases (Nivel 1)
        </button>
        <button
          onClick={() => {
            setRutaNavegacion([]);
            setCodigoPadreSeleccionado(null);
            setNivelSeleccionado(2);
          }}
          className={`filtro-btn ${nivelSeleccionado === 2 && !codigoPadreSeleccionado ? 'active' : ''}`}
        >
          Grupos (Nivel 2)
        </button>
        <button
          onClick={() => {
            setRutaNavegacion([]);
            setCodigoPadreSeleccionado(null);
            setNivelSeleccionado(3);
          }}
          className={`filtro-btn ${nivelSeleccionado === 3 && !codigoPadreSeleccionado ? 'active' : ''}`}
        >
          Cuentas (Nivel 3)
        </button>
        <button
          onClick={() => {
            setRutaNavegacion([]);
            setCodigoPadreSeleccionado(null);
            setNivelSeleccionado(4);
          }}
          className={`filtro-btn ${nivelSeleccionado === 4 && !codigoPadreSeleccionado ? 'active' : ''}`}
        >
          Subcuentas (Nivel 4)
        </button>
      </div>

      {/* Tabla de cuentas */}
      <div className="table-container">
        <table className="puc-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Nivel</th>
              <th>Naturaleza</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cuentasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">
                  No hay cuentas en este nivel
                </td>
              </tr>
            ) : (
              cuentasFiltradas.map((cuenta) => (
                <tr key={cuenta.codigoCuenta}>
                  <td className="codigo-cell">
                    <strong>{cuenta.codigoCuenta}</strong>
                  </td>
                  <td>{cuenta.nombreCuenta}</td>
                  <td>
                    <span className="badge badge-nivel">{obtenerNombreNivel(cuenta.nivel)}</span>
                  </td>
                  <td>
                    <span className={`badge badge-naturaleza ${cuenta.naturaleza === 'D' ? 'debito' : 'credito'}`}>
                      {cuenta.naturaleza === 'D' ? 'Débito' : 'Crédito'}
                    </span>
                  </td>
                  <td>
                    {tieneHijos(cuenta.codigoCuenta) ? (
                      <button
                        onClick={() => navegarACuenta(cuenta)}
                        className="btn btn-primary btn-sm"
                      >
                        Ver Hijos →
                      </button>
                    ) : (
                      <span className="no-children">Sin hijos</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .puc-container {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .puc-container h2 {
          margin-bottom: 30px;
          color: #333;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 5px;
        }

        .breadcrumb-item {
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          padding: 5px 10px;
          font-size: 14px;
        }

        .breadcrumb-item:hover {
          text-decoration: underline;
        }

        .breadcrumb-separator {
          color: #999;
          margin: 0 5px;
        }

        .filtros {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filtro-btn {
          padding: 8px 16px;
          border: 2px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }

        .filtro-btn:hover {
          border-color: #667eea;
        }

        .filtro-btn.active {
          background-color: #667eea;
          color: white;
          border-color: #667eea;
        }

        .table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .puc-table {
          width: 100%;
          border-collapse: collapse;
        }

        .puc-table th {
          background-color: #f8f9fa;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }

        .puc-table td {
          padding: 12px;
          border-bottom: 1px solid #e9ecef;
        }

        .puc-table tbody tr:hover {
          background-color: #f8f9fa;
        }

        .codigo-cell {
          font-family: 'Courier New', monospace;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-nivel {
          background-color: #e9ecef;
          color: #495057;
        }

        .badge-naturaleza.debito {
          background-color: #d4edda;
          color: #155724;
        }

        .badge-naturaleza.credito {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s;
        }

        .btn-primary {
          background-color: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background-color: #5568d3;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .no-children {
          color: #999;
          font-size: 12px;
          font-style: italic;
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .loading, .error {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }

        .error {
          color: #dc3545;
        }
      `}</style>
    </div>
  );
};

export default PUCList;


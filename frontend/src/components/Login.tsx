import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginRequest } from '../types';
import { api, ApiException } from '../services';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginRequest>({
    usuario: '',
    contraseña: ''
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.login(formData);

      if (data.success && data.token) {
        // Mostrar información de empresa si está disponible
        if (data.empresa) {
          console.log('Empresa:', data.empresa.nombreRazonSocial);
        }
        // Redirigir al dashboard
        navigate('/dashboard');
      } else {
        setError(data.mensaje || 'Error al iniciar sesión');
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.message);
      } else {
        setError('Error de conexión con el servidor');
      }
      console.error('Error en login:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Sistema Contable</h1>
        <h2>Iniciar Sesión</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="usuario">Usuario:</label>
            <input
              type="text"
              id="usuario"
              value={formData.usuario}
              onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
              required
              autoFocus
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contraseña">Contraseña:</label>
            <input
              type="password"
              id="contraseña"
              value={formData.contraseña}
              onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
              required
              className="form-control"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="login-info">
          <p><strong>Usuario de prueba:</strong> admin</p>
          <p><strong>Contraseña:</strong> admin123</p>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .login-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          width: 100%;
          max-width: 400px;
        }

        @media (max-width: 576px) {
          .login-card {
            padding: 30px 20px;
          }

          .login-card h1 {
            font-size: 24px;
          }

          .login-card h2 {
            font-size: 18px;
          }
        }

        .login-card h1 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 28px;
          text-align: center;
        }

        .login-card h2 {
          margin: 0 0 30px 0;
          color: #666;
          font-size: 20px;
          font-weight: 400;
          text-align: center;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
        }

        .form-control {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-size: 16px;
          transition: border-color 0.3s;
          box-sizing: border-box;
        }

        .form-control:focus {
          outline: none;
          border-color: #667eea;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-primary {
          background-color: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-block {
          width: 100%;
        }

        .alert {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
        }

        .alert-error {
          background-color: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .login-info {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        .login-info p {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
};

export default Login;


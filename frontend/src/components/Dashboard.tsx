import React from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const usuario = api.auth.getCurrentUser();

  const handleLogout = () => {
    api.auth.logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Sistema Contable Básico - SGE V1.0</h1>
        <div className="user-info">
          <span>Bienvenido, {usuario?.nombre || 'Usuario'}</span>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <button onClick={() => navigate('/facturacion')} className="nav-card">
          <div className="nav-icon">🧾</div>
          <h3>Facturación</h3>
          <p>Crear y gestionar facturas de venta</p>
        </button>

        <button onClick={() => navigate('/cotizaciones')} className="nav-card">
          <div className="nav-icon">📋</div>
          <h3>Cotizaciones</h3>
          <p>Crear y gestionar cotizaciones de venta</p>
        </button>

        <button onClick={() => navigate('/ordenes-compra')} className="nav-card">
          <div className="nav-icon">📝</div>
          <h3>Órdenes de Compra</h3>
          <p>Crear y gestionar órdenes de compra</p>
        </button>

        <button onClick={() => navigate('/compras')} className="nav-card">
          <div className="nav-icon">🛒</div>
          <h3>Compras</h3>
          <p>Registrar compras a proveedores</p>
        </button>

        <button onClick={() => navigate('/punto-venta')} className="nav-card" style={{ backgroundColor: '#4CAF50', color: 'white' }}>
          <div className="nav-icon">🛒</div>
          <h3>Punto de Venta</h3>
          <p>Venta rápida con impresión térmica</p>
        </button>

        <button onClick={() => navigate('/productos')} className="nav-card">
          <div className="nav-icon">📦</div>
          <h3>Productos</h3>
          <p>Gestionar catálogo de productos</p>
        </button>

        <button onClick={() => navigate('/clientes')} className="nav-card">
          <div className="nav-icon">👥</div>
          <h3>Clientes</h3>
          <p>Gestionar base de clientes</p>
        </button>

        <button onClick={() => navigate('/vendedores')} className="nav-card">
          <div className="nav-icon">👔</div>
          <h3>Vendedores</h3>
          <p>Gestionar vendedores y comisiones</p>
        </button>

        <button onClick={() => navigate('/proveedores')} className="nav-card">
          <div className="nav-icon">🏭</div>
          <h3>Proveedores</h3>
          <p>Gestionar base de proveedores</p>
        </button>

        <button onClick={() => navigate('/inventario')} className="nav-card">
          <div className="nav-icon">📦</div>
          <h3>Inventario</h3>
          <p>Consultar stock y movimientos</p>
        </button>

        <button onClick={() => navigate('/asientos')} className="nav-card">
          <div className="nav-icon">📝</div>
          <h3>Asientos Contables</h3>
          <p>Crear y gestionar asientos contables</p>
        </button>

        <button onClick={() => navigate('/puc')} className="nav-card">
          <div className="nav-icon">📊</div>
          <h3>Plan Único de Cuentas</h3>
          <p>Consultar cuentas del PUC</p>
        </button>
      </nav>

      <style>{`
        .dashboard-container {
          min-height: 100vh;
          background-color: #f5f7fa;
        }

        .dashboard-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          flex-wrap: wrap;
          gap: 15px;
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 28px;
          flex: 1;
          min-width: 200px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .user-info span {
          white-space: nowrap;
        }

        .dashboard-nav {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .nav-card {
          background: white;
          border: none;
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          width: 100%;
        }

        .nav-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .nav-card:active {
          transform: translateY(-2px);
        }

        .nav-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .nav-card h3 {
          margin: 0 0 10px 0;
          color: #333;
          font-size: 22px;
        }

        .nav-card p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-secondary {
          background-color: rgba(255,255,255,0.2);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
        }

        .btn-secondary:hover {
          background-color: rgba(255,255,255,0.3);
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard-header {
            padding: 20px;
            flex-direction: column;
            align-items: flex-start;
          }

          .dashboard-header h1 {
            font-size: 22px;
            width: 100%;
          }

          .user-info {
            width: 100%;
            justify-content: space-between;
          }

          .user-info span {
            font-size: 14px;
          }

          .dashboard-nav {
            grid-template-columns: 1fr;
            padding: 20px;
            gap: 20px;
          }

          .nav-card {
            padding: 30px 20px;
          }

          .nav-icon {
            font-size: 40px;
            margin-bottom: 15px;
          }

          .nav-card h3 {
            font-size: 18px;
          }

          .nav-card p {
            font-size: 13px;
          }
        }

        @media (max-width: 576px) {
          .dashboard-header {
            padding: 15px;
          }

          .dashboard-header h1 {
            font-size: 20px;
          }

          .dashboard-nav {
            padding: 15px;
            gap: 15px;
          }

          .nav-card {
            padding: 25px 15px;
          }

          .nav-icon {
            font-size: 36px;
            margin-bottom: 12px;
          }

          .nav-card h3 {
            font-size: 16px;
          }

          .nav-card p {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;


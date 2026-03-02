import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AsientosPage from './pages/AsientosPage';
import PUCList from './components/PUCList';
import ProductosList from './components/ProductosList';
import ClientesList from './components/ClientesList';
import VendedoresList from './components/VendedoresList';
import ProveedoresList from './components/ProveedoresList';
import FacturacionPage from './pages/FacturacionPage';
import FacturaDetallePage from './pages/FacturaDetallePage';
import CotizacionesPage from './pages/CotizacionesPage';
import OrdenesCompraPage from './pages/OrdenesCompraPage';
import ComprasPage from './pages/ComprasPage';
import InventarioPage from './pages/InventarioPage';
import PuntoVentaPage from './pages/PuntoVentaPage';
import { api } from './services';

// Componente de ruta protegida
const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  return api.auth.isAuthenticated() ? children : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asientos"
          element={
            <ProtectedRoute>
              <AsientosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/puc"
          element={
            <ProtectedRoute>
              <PUCList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute>
              <ProductosList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute>
              <ClientesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendedores"
          element={
            <ProtectedRoute>
              <VendedoresList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/proveedores"
          element={
            <ProtectedRoute>
              <ProveedoresList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facturacion"
          element={
            <ProtectedRoute>
              <FacturacionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facturas/:id"
          element={
            <ProtectedRoute>
              <FacturaDetallePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cotizaciones"
          element={
            <ProtectedRoute>
              <CotizacionesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ordenes-compra"
          element={
            <ProtectedRoute>
              <OrdenesCompraPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compras"
          element={
            <ProtectedRoute>
              <ComprasPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <ProtectedRoute>
              <InventarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/punto-venta"
          element={
            <ProtectedRoute>
              <PuntoVentaPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;


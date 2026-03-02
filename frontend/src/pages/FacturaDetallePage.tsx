import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services';
import { Factura } from '../types';

const FacturaDetallePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      cargarFactura(parseInt(id));
    }
  }, [id]);

  const cargarFactura = async (idFactura: number) => {
    try {
      setLoading(true);
      setError('');
      const datos = await api.facturas.obtenerFactura(idFactura);
      setFactura(datos);
    } catch (err: any) {
      setError('Error al cargar la factura: ' + err.message);
      console.error('Error al cargar factura:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleVolver = () => {
    navigate('/facturacion');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Cargando factura...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-error">{error}</div>
        <button onClick={handleVolver} className="btn btn-primary">
          ← Volver a Facturación
        </button>
      </div>
    );
  }

  if (!factura) {
    return (
      <div className="container">
        <div className="alert alert-error">Factura no encontrada</div>
        <button onClick={handleVolver} className="btn btn-primary">
          ← Volver a Facturación
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🧾 Factura #{factura.numeroFactura}</h1>
        <div>
          <button onClick={handleImprimir} className="btn btn-info" style={{ marginRight: '10px' }}>
            🖨️ Imprimir
          </button>
          <button onClick={handleVolver} className="btn btn-secondary">
            ← Volver
          </button>
        </div>
      </div>

      {/* Información de la Empresa */}
      {factura.empresa && (
        <div className="card" style={{ marginBottom: '20px', background: '#f9f9f9', padding: '20px', border: '2px solid #333' }}>
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>{factura.empresa.nombreRazonSocial}</h2>
            <p style={{ margin: '5px 0', color: '#666' }}><strong>NIT:</strong> {factura.empresa.nit}</p>
            {factura.empresa.direccion && (
              <p style={{ margin: '5px 0', color: '#666' }}>{factura.empresa.direccion}</p>
            )}
            {factura.empresa.ciudad && factura.empresa.departamento && (
              <p style={{ margin: '5px 0', color: '#666' }}>{factura.empresa.ciudad}, {factura.empresa.departamento}</p>
            )}
            {factura.empresa.telefono && (
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Tel:</strong> {factura.empresa.telefono}</p>
            )}
            {factura.empresa.email && (
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Email:</strong> {factura.empresa.email}</p>
            )}
            {factura.empresa.regimenTributario && (
              <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}><strong>Régimen:</strong> {factura.empresa.regimenTributario}</p>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <h3>Información de la Factura</h3>
            <p><strong>Número:</strong> {factura.numeroFactura}</p>
            <p><strong>Fecha:</strong> {new Date(factura.fecha).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p><strong>Estado:</strong>
              <span className={`badge badge-${factura.estado.toLowerCase()}`} style={{ marginLeft: '10px' }}>
                {factura.estado}
              </span>
            </p>
          </div>
          <div>
            <h3>Cliente</h3>
            <p><strong>Nombre:</strong> {factura.cliente?.nombreRazonSocial || 'N/A'}</p>
            <p><strong>NIT:</strong> {factura.cliente?.nit || 'N/A'}</p>
            <p><strong>Dirección:</strong> {factura.cliente?.direccion || 'N/A'}</p>
            {factura.idVendedor && (
              <div style={{ marginTop: '15px' }}>
                <h4>Vendedor</h4>
                <p><strong>Código:</strong> {factura.codigoVendedor || 'N/A'}</p>
                <p><strong>Nombre:</strong> {factura.nombreVendedor || 'N/A'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Detalles de la Factura</h3>
        <table style={{ width: '100%', marginTop: '15px' }}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th style={{ textAlign: 'right' }}>Cantidad</th>
              <th style={{ textAlign: 'right' }}>Precio Unit.</th>
              <th style={{ textAlign: 'right' }}>Descuento</th>
              <th style={{ textAlign: 'right' }}>IVA %</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {factura.detalles && factura.detalles.length > 0 ? (
              factura.detalles.map((detalle, index) => (
                <tr key={detalle.idDetalleFactura || index}>
                  <td>{detalle.producto?.codigo || 'N/A'}</td>
                  <td>{detalle.producto?.nombre || 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>{detalle.cantidad.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>${detalle.precioUnitario.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>${detalle.descuento.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{((detalle as any).iva || 0)}%</td>
                  <td style={{ textAlign: 'right' }}>${detalle.subtotal.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>${detalle.total.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center">
                  No hay detalles disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong>Subtotal:</strong>
              <span>${factura.subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <strong>IVA:</strong>
              <span>${factura.iva.toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '10px',
              borderTop: '2px solid #333',
              fontSize: '1.2em',
              fontWeight: 'bold'
            }}>
              <strong>Total:</strong>
              <span>${factura.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {factura.observaciones && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <strong>Observaciones:</strong>
            <p style={{ marginTop: '5px' }}>{factura.observaciones}</p>
          </div>
        )}

        {/* Código QR y CUFE */}
        {(factura.qrCode || factura.cufe) && (
          <div style={{
            marginTop: '30px',
            padding: '20px',
            backgroundColor: '#f9f9f9',
            borderRadius: '5px',
            border: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            {factura.qrCode && (
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>Código QR</h4>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '5px',
                  display: 'inline-block',
                  border: '1px solid #ccc'
                }}>
                  <QRCodeSVG
                    value={factura.qrCode}
                    size={150}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                  Escanee para validar la factura
                </p>
              </div>
            )}
            {factura.cufe && (
              <div style={{ textAlign: 'center', maxWidth: '300px' }}>
                <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>CUFE</h4>
                <div style={{
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  wordBreak: 'break-all',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}>
                  {factura.cufe}
                </div>
                <p style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                  Código Único de Facturación Electrónica
                </p>
              </div>
            )}
            {factura.ambienteDIAN && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                  <strong>Ambiente:</strong> {factura.ambienteDIAN}
                </p>
                {factura.estadoValidacionDIAN && (
                  <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                    <strong>Estado DIAN:</strong> {factura.estadoValidacionDIAN}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          button {
            display: none;
          }
          .container {
            max-width: 100%;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
};

export default FacturaDetallePage;


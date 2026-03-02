import React, { useState, useRef } from 'react';
import { api } from '../services';

interface ScanPDFButtonProps {
  onDataExtracted: (data: any) => void;
  disabled?: boolean;
}

const ScanPDFButton: React.FC<ScanPDFButtonProps> = ({ onDataExtracted, disabled = false }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      setError('Solo se permiten archivos PDF o imágenes');
      return;
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 10MB');
      return;
    }

    setError('');
    setScanning(true);

    try {
      const response = await api.compras.scanPDFFacturaCompra(file);

      if (response.success && response.data) {
        onDataExtracted(response.data);
      } else {
        setError('No se pudieron extraer datos de la factura');
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar el archivo');
    } finally {
      setScanning(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ display: 'inline-block' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || scanning}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || scanning}
        style={{
          padding: '8px 16px',
          backgroundColor: scanning ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: disabled || scanning ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        title="Escanear factura PDF"
      >
        {scanning ? (
          <>
            <span>⏳</span>
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <span>📄</span>
            <span>Escanear PDF</span>
          </>
        )}
      </button>
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ScanPDFButton;


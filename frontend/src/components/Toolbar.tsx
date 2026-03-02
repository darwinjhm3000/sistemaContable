import React from 'react';

interface ToolbarProps {
  // Búsqueda
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearch?: () => void;
  searchPlaceholder?: string;

  // Navegación
  showNavigation?: boolean;
  currentIndex?: number;
  totalItems?: number;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLast?: () => void;

  // Acciones
  showNew?: boolean;
  onNew?: () => void;
  newLabel?: string;

  showSave?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  saving?: boolean;

  showPrint?: boolean;
  onPrint?: () => void;

  showCancel?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;

  // Estilo
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  showSearch = false,
  searchValue = '',
  onSearchChange,
  onSearch,
  searchPlaceholder = 'Buscar...',
  showNavigation = false,
  currentIndex = 0,
  totalItems = 0,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  showNew = false,
  onNew,
  newLabel = '➕ Nuevo',
  showSave = false,
  onSave,
  saveLabel = '💾 Guardar',
  saveDisabled = false,
  saving = false,
  showPrint = false,
  onPrint,
  showCancel = false,
  onCancel,
  cancelLabel = '❌ Cancelar',
  className = ''
}) => {
  const canGoFirst = showNavigation && currentIndex > 0;
  const canGoPrevious = showNavigation && currentIndex > 0;
  const canGoNext = showNavigation && currentIndex < totalItems - 1;
  const canGoLast = showNavigation && currentIndex < totalItems - 1;

  return (
    <div className={`toolbar ${className}`}>
      {/* Búsqueda */}
      {showSearch && (
        <div className="toolbar-search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch?.()}
            className="toolbar-search-input"
          />
          <button
            onClick={onSearch}
            className="btn btn-secondary toolbar-search-btn"
            title="Buscar"
          >
            🔍
          </button>
        </div>
      )}

      {/* Navegación */}
      {showNavigation && (
        <div className="toolbar-navigation">
          <button
            onClick={onFirst}
            disabled={!canGoFirst}
            className="btn btn-secondary toolbar-nav-btn"
            title="Primero"
          >
            ⏮️
          </button>
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="btn btn-secondary toolbar-nav-btn"
            title="Anterior"
          >
            ⏪
          </button>
          <span className="toolbar-nav-info">
            {currentIndex + 1} de {totalItems}
          </span>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="btn btn-secondary toolbar-nav-btn"
            title="Siguiente"
          >
            ⏩
          </button>
          <button
            onClick={onLast}
            disabled={!canGoLast}
            className="btn btn-secondary toolbar-nav-btn"
            title="Último"
          >
            ⏭️
          </button>
        </div>
      )}

      {/* Acciones */}
      <div className="toolbar-actions">
        {showNew && (
          <button
            onClick={onNew}
            className="btn btn-primary toolbar-action-btn"
          >
            {newLabel}
          </button>
        )}

        {showPrint && (
          <button
            onClick={onPrint}
            className="btn btn-secondary toolbar-action-btn"
            title="Imprimir"
          >
            🖨️ Imprimir
          </button>
        )}

        {showCancel && (
          <button
            onClick={onCancel}
            className="btn btn-secondary toolbar-action-btn"
          >
            {cancelLabel}
          </button>
        )}

        {showSave && (
          <button
            onClick={onSave}
            disabled={saveDisabled || saving}
            className="btn btn-primary toolbar-action-btn"
          >
            {saving ? '⏳ Guardando...' : saveLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;


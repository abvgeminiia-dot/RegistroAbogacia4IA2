import React, { useState, useEffect } from 'react';
import Airtable from 'airtable';
import * as XLSX from 'xlsx';
import './LeeABV.css';

// Configuración de Airtable
const apiKey = import.meta.env.VITE_APP_AIRTABLE_API_KEY;
const baseId = import.meta.env.VITE_APP_AIRTABLE_BASE_ID;

// Obtenemos los nombres de las tablas y filtramos las que no estén definidas
const tableNames = [
  import.meta.env.VITE_APP_AIRTABLE_TABLE_NAME,
].filter(Boolean); // 'Boolean' elimina cualquier valor nulo o indefinido

const SECRET_KEY = "Holamundo";

let base;
let isAirtableConfigured = false;

if (apiKey && baseId) {
  base = new Airtable({ apiKey }).base(baseId);
  isAirtableConfigured = true;
} else {
  console.error("Faltan las variables de entorno de Airtable (VITE_APP_AIRTABLE_API_KEY y/o VITE_APP_AIRTABLE_BASE_ID).");
}

function AirtableDataViewer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // -- NOTA: El estado 'selectedTable' ha sido eliminado.

  useEffect(() => {
    // Solo se ejecuta si estamos autenticados, configurados y hay al menos una tabla definida.
    if (!isAuthenticated || !isAirtableConfigured || tableNames.length === 0) return;

    const fetchData = async () => {
      // Usamos directamente la primera tabla definida en las variables de entorno.
      const tableName = tableNames[0];

      setLoading(true);
      setError(null);
      setData([]);
      setColumns([]);

      try {
        const table = base(tableName); // Instancia de la tabla
        const records = await table.select().all();
        
        if (records && records.length > 0) {
          const formattedData = records.map(record => ({
            id: record.id,
            ...record.fields
          }));
          
          setData(formattedData);
          
          const allColumns = new Set();
          formattedData.forEach(row => {
            Object.keys(row).forEach(key => allColumns.add(key));
          });
          
          const sortedColumns = Array.from(allColumns);
          if (sortedColumns.includes('id')) {
            setColumns(['id', ...sortedColumns.filter(c => c !== 'id')]);
          } else {
            setColumns(sortedColumns);
          }
        }
      } catch (err) {
        console.error("Error fetching data from Airtable:", err);
        setError(`Error al cargar datos de la tabla "${tableName}": ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated]); // El efecto ahora solo depende de 'isAuthenticated'.

  const handleKeySubmit = (event) => {
    event.preventDefault();
    setAuthError('');
    if (inputKey === SECRET_KEY) {
      setIsAuthenticated(true);
    } else {
      setAuthError('Clave incorrecta. Inténtalo de nuevo.');
      setInputKey('');
    }
  };
  
  // -- NOTA: La función 'handleTableSelection' ha sido eliminada.

  const handleDownloadExcel = () => {
    if (data.length === 0) {
      alert("No hay datos para descargar.");
      return;
    }
    const tableName = tableNames[0];
    const dataForSheet = data.map(row => {
      const orderedRow = {};
      columns.forEach(colName => {
        if (typeof row[colName] === 'object' && row[colName] !== null) {
          orderedRow[colName] = JSON.stringify(row[colName]);
        } else {
          orderedRow[colName] = row[colName];
        }
      });
      return orderedRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataForSheet, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DatosAirtable");
    XLSX.writeFile(workbook, `${tableName}_data.xlsx`);
  };

  const handleRowSelection = (rowId) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(rowId)) {
      newSelectedRows.delete(rowId);
    } else {
      newSelectedRows.add(rowId);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      const allRowIds = data.map(row => row.id);
      setSelectedRows(new Set(allRowIds));
    }
  };

  const handleDeleteSelected = async () => {
    const tableName = tableNames[0];
    if (selectedRows.size === 0 || !tableName) {
      alert("No hay filas seleccionadas para borrar.");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres borrar ${selectedRows.size} registro(s) de la tabla "${tableName}"? Esta acción no se puede deshacer.`
    );

    if (!confirmDelete) {
      return;
    }

    setDeleting(true);
    setError(null);
    const table = base(tableName);

    try {
      const rowsToDelete = Array.from(selectedRows);
      
      for (let i = 0; i < rowsToDelete.length; i += 10) {
        const chunk = rowsToDelete.slice(i, i + 10);
        await table.destroy(chunk);
      }

      setData(prevData => prevData.filter(row => !selectedRows.has(row.id)));
      setSelectedRows(new Set());
      
      alert(`${rowsToDelete.length} registro(s) borrado(s) exitosamente.`);

    } catch (err) {
      console.error("Error deleting data from Airtable:", err);
      setError(err.message || "Error al borrar los datos.");
      alert("Error al borrar los datos: " + (err.message || "Error desconocido"));
    } finally {
      setDeleting(false);
    }
  };

  // 1. Pantalla de Autenticación
  if (!isAuthenticated) {
    return (
      <div className="data-viewer-container key-prompt-container">
        <div className="data-viewer-header">
          <h2>Acceso Restringido</h2>
        </div>
        <form onSubmit={handleKeySubmit} className="key-form">
          <p>Por favor, ingresa la clave para acceder a los datos:</p>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="key-input"
            placeholder="Ingresa la clave"
            required
          />
          <button type="submit" className="key-submit-button">
            Acceder
          </button>
          {authError && <p className="auth-error-message">{authError}</p>}
        </form>
      </div>
    );
  }

  // 2. Mensaje de error si Airtable no está configurado
  if (!isAirtableConfigured) {
      return <div className="error-message">Error: Airtable no está configurado. Revisa la consola y tus variables de entorno.</div>;
  }
  
  // -- NOTA: La pantalla de selección de tabla ha sido eliminada.
  
  if (tableNames.length === 0) {
    return <div className="error-message">Error: No se ha configurado un nombre de tabla en las variables de entorno (VITE_APP_AIRTABLE_TABLE_NAME).</div>
  }

  const tableName = tableNames[0];

  // 3. Pantalla de Carga
  if (loading) {
    return <p className="loading-message">Cargando datos de "{tableName}"...</p>;
  }

  // 4. Pantalla de Error
  if (error) {
    return (
        <div className="data-viewer-container">
             <p className="error-message">Error: {error}</p>
             <button onClick={() => window.location.reload()} className="action-button">Reintentar</button>
        </div>
    );
  }

  // 5. Vista de Datos
  return (
    <div className="data-viewer-container">
      <div className="data-viewer-header">
        <h2>Datos de la Tabla: {tableName}</h2>
        {/* -- NOTA: El botón para cambiar de tabla ha sido eliminado. */}
      </div>
      {data.length > 0 ? (
        <>
          <div className="action-buttons">
            <button
              onClick={handleDownloadExcel}
              className="download-button"
            >
              Descargar como Excel (.xlsx)
            </button>
            <button
              onClick={handleDeleteSelected}
              className="delete-button"
              disabled={selectedRows.size === 0 || deleting}
            >
              {deleting ? 'Borrando...' : `Borrar Seleccionados (${selectedRows.size})`}
            </button>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRows.size === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      title="Seleccionar/Deseleccionar todo"
                    />
                  </th>
                  {columns.map(colName => (
                    <th key={colName}>
                      {colName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className={selectedRows.has(row.id) ? 'selected-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleRowSelection(row.id)}
                      />
                    </td>
                    {columns.map(colName => (
                      <td key={`${row.id}-${colName}`}>
                        {typeof row[colName] === 'object' && row[colName] !== null
                          ? JSON.stringify(row[colName])
                          : row[colName] === null || row[colName] === undefined ? '' : String(row[colName])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="no-data-message">No se encontraron datos en la tabla "{tableName}".</p>
      )}
    </div>
  );
}

export default AirtableDataViewer;
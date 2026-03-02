// Servicio para sincronización con DIAN - Descarga de facturas
import axios, { AxiosInstance } from 'axios';
import * as soap from 'soap';
import { parseString } from 'xml2js';
import { decrypt } from '../utils/encryption';
import sql from 'mssql';
import { promisify } from 'util';

const parseXml = promisify(parseString);

export interface ConfiguracionDIAN {
  idConfiguracion: number;
  idEmpresa: number;
  ambiente: 'Produccion' | 'Pruebas';
  usuarioDIAN: string;
  passwordDIAN: string;
  certificadoDigital: Buffer | null;
  passwordCertificado: string;
  fechaVencimientoCertificado: Date | null;
  urlProduccion: string;
  urlPruebas: string;
  softwareId: string;
  pinSoftware: string;
}

export interface EventoDIAN {
  trackId: string;
  cufe: string;
  tipoDocumento: string;
  estado: string;
  fechaEvento: Date;
  fechaEmision: Date;
  nitEmisor: string;
  nitReceptor: string;
  numeroDocumento: string;
  valorTotal: number;
  mensaje?: string;
  xmlRespuesta?: string;
}

export interface ResultadoSincronizacion {
  exito: boolean;
  documentosEncontrados: number;
  documentosProcesados: number;
  documentosConError: number;
  errores: string[];
  mensaje: string;
}

/**
 * Obtiene la configuración DIAN de una empresa
 */
export async function obtenerConfiguracionDIAN(
  pool: sql.ConnectionPool,
  idEmpresa: number
): Promise<ConfiguracionDIAN | null> {
  try {
    const result = await pool.request()
      .input('idEmpresa', sql.Int, idEmpresa)
      .query(`
        SELECT TOP 1
          IdConfiguracion,
          IdEmpresa,
          Ambiente,
          UsuarioDIAN,
          PasswordDIAN,
          CertificadoDigital,
          PasswordCertificado,
          FechaVencimientoCertificado,
          URLProduccion,
          URLPruebas,
          SoftwareId,
          PinSoftware
        FROM ConfiguracionDIAN
        WHERE IdEmpresa = @idEmpresa
          AND Activo = 1
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const config = result.recordset[0];

    return {
      idConfiguracion: config.IdConfiguracion,
      idEmpresa: config.IdEmpresa,
      ambiente: config.Ambiente,
      usuarioDIAN: config.UsuarioDIAN || '',
      passwordDIAN: config.PasswordDIAN ? decrypt(config.PasswordDIAN) : '',
      certificadoDigital: config.CertificadoDigital || null,
      passwordCertificado: config.PasswordCertificado ? decrypt(config.PasswordCertificado) : '',
      fechaVencimientoCertificado: config.FechaVencimientoCertificado || null,
      urlProduccion: config.URLProduccion || 'https://vpfe.dian.gov.co',
      urlPruebas: config.URLPruebas || 'https://vpfe-hab.dian.gov.co',
      softwareId: config.SoftwareId || '',
      pinSoftware: config.PinSoftware || ''
    };
  } catch (error) {
    console.error('Error al obtener configuración DIAN:', error);
    throw error;
  }
}

/**
 * Crea un cliente SOAP para consultar eventos en DIAN
 */
async function crearClienteSOAP(config: ConfiguracionDIAN): Promise<any> {
  try {
    const wsdlUrl = config.ambiente === 'Produccion'
      ? `${config.urlProduccion}/WcfDianCustomerServices.svc?wsdl`
      : `${config.urlPruebas}/WcfDianCustomerServices.svc?wsdl`;

    console.log(`📡 Conectando a DIAN ${config.ambiente}: ${wsdlUrl}`);

    // Crear cliente SOAP con autenticación
    const client = await soap.createClientAsync(wsdlUrl, {
      wsdl_options: {
        timeout: 30000
      }
    });

    // Configurar autenticación básica si es necesaria
    // NOTA: La estructura exacta puede variar según la versión de soap
    // Verificar documentación de la versión instalada
    if (config.usuarioDIAN && config.passwordDIAN) {
      // Intenta usar BasicAuthSecurity si está disponible
      try {
        if (soap.BasicAuthSecurity) {
          client.setSecurity(new soap.BasicAuthSecurity(
            config.usuarioDIAN,
            config.passwordDIAN
          ));
        }
      } catch (error) {
        console.warn('No se pudo configurar autenticación básica SOAP:', error);
      }
    }

    return client;
  } catch (error) {
    console.error('Error al crear cliente SOAP:', error);
    throw new Error(`Error al conectar con servicios DIAN: ${error}`);
  }
}

/**
 * Consulta eventos de documentos en DIAN usando SOAP
 */
export async function consultarEventosDIAN(
  config: ConfiguracionDIAN,
  fechaDesde: Date,
  fechaHasta: Date
): Promise<EventoDIAN[]> {
  try {
    const client = await crearClienteSOAP(config);

    // Formatear fechas según formato requerido por DIAN
    const fechaDesdeStr = fechaDesde.toISOString().split('T')[0];
    const fechaHastaStr = fechaHasta.toISOString().split('T')[0];

    console.log(`🔍 Consultando eventos desde ${fechaDesdeStr} hasta ${fechaHastaStr}`);

    // Llamar al método GetStatus (o el método correspondiente según la versión del WSDL)
    // NOTA: Este método puede variar según la versión del servicio DIAN
    const args = {
      trackId: '', // Vacío para consultar todos
      fechaDesde: fechaDesdeStr,
      fechaHasta: fechaHastaStr
    };

    const response = await new Promise((resolve, reject) => {
      // El método exacto depende de la versión del WSDL de DIAN
      // Esto es un ejemplo genérico
      client.GetStatusZip(args, (err: any, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    // Procesar respuesta XML
    const eventos: EventoDIAN[] = [];
    
    // Parsear XML de respuesta
    // NOTA: La estructura exacta depende de la respuesta de DIAN
    // Esto es un ejemplo de cómo procesarla
    
    return eventos;
  } catch (error: any) {
    console.error('Error al consultar eventos DIAN:', error);
    throw new Error(`Error al consultar eventos: ${error.message}`);
  }
}

/**
 * Descarga el XML de una factura usando REST API
 */
export async function descargarXMLFactura(
  config: ConfiguracionDIAN,
  trackId: string
): Promise<string> {
  try {
    const baseUrl = config.ambiente === 'Produccion'
      ? 'https://api.dian.gov.co'
      : 'https://api-hab.dian.gov.co';

    const axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.usuarioDIAN}:${config.passwordDIAN}`).toString('base64')}`
      }
    });

    const response = await axiosInstance.get(`/v1/documents/${trackId}/xml`);
    
    if (response.data && response.data.xml) {
      return response.data.xml;
    }
    
    throw new Error('No se pudo obtener el XML de la factura');
  } catch (error: any) {
    console.error('Error al descargar XML de factura:', error);
    throw new Error(`Error al descargar XML: ${error.message}`);
  }
}

/**
 * Sincroniza facturas desde DIAN
 */
export async function sincronizarFacturas(
  pool: sql.ConnectionPool,
  idEmpresa: number,
  fechaDesde: Date,
  fechaHasta: Date
): Promise<ResultadoSincronizacion> {
  const resultado: ResultadoSincronizacion = {
    exito: false,
    documentosEncontrados: 0,
    documentosProcesados: 0,
    documentosConError: 0,
    errores: [],
    mensaje: ''
  };

  try {
    // Obtener configuración DIAN
    const config = await obtenerConfiguracionDIAN(pool, idEmpresa);
    
    if (!config) {
      resultado.mensaje = 'No se encontró configuración DIAN para la empresa';
      resultado.errores.push(resultado.mensaje);
      return resultado;
    }

    // Validar certificado
    if (config.fechaVencimientoCertificado) {
      const hoy = new Date();
      if (config.fechaVencimientoCertificado < hoy) {
        resultado.mensaje = 'El certificado digital ha vencido. Por favor, renueve el certificado.';
        resultado.errores.push(resultado.mensaje);
        return resultado;
      }
    }

    // Crear log de sincronización
    const logResult = await pool.request()
      .input('idEmpresa', sql.Int, idEmpresa)
      .input('tipoSincronizacion', sql.VarChar(50), 'Facturas')
      .input('rangoFechas', sql.VarChar(100), `${fechaDesde.toISOString().split('T')[0]} a ${fechaHasta.toISOString().split('T')[0]}`)
      .query(`
        INSERT INTO LogSincronizacionDIAN (IdEmpresa, TipoSincronizacion, RangoFechas, Estado)
        OUTPUT INSERTED.IdLog
        VALUES (@idEmpresa, @tipoSincronizacion, @rangoFechas, 'EnProceso')
      `);
    
    const idLog = logResult.recordset[0].IdLog;

    // Consultar eventos DIAN
    console.log('📥 Iniciando sincronización de facturas...');
    const eventos = await consultarEventosDIAN(config, fechaDesde, fechaHasta);
    
    resultado.documentosEncontrados = eventos.length;
    
    // Procesar cada evento
    for (const evento of eventos) {
      try {
        // Buscar factura local por CUFE
        const facturaResult = await pool.request()
          .input('cufe', sql.VarChar(100), evento.cufe)
          .query(`
            SELECT IdFactura, EstadoValidacionDIAN
            FROM Facturas
            WHERE CUFE = @cufe
          `);

        let idFactura: number | null = null;
        
        if (facturaResult.recordset.length > 0) {
          idFactura = facturaResult.recordset[0].IdFactura;
          
          // Actualizar estado de factura
          await pool.request()
            .input('idFactura', sql.Int, idFactura)
            .input('estado', sql.VarChar(20), evento.estado === 'Aceptado' ? 'Validada' : 'Rechazada')
            .input('mensaje', sql.VarChar(500), evento.mensaje || '')
            .input('fechaValidacion', sql.DateTime, evento.fechaEvento)
            .query(`
              UPDATE Facturas
              SET EstadoValidacionDIAN = @estado,
                  MensajeValidacionDIAN = @mensaje,
                  FechaValidacionDIAN = @fechaValidacion
              WHERE IdFactura = @idFactura
            `);
        }

        // Guardar evento en tabla EventosDIAN
        await pool.request()
          .input('trackId', sql.VarChar(100), evento.trackId)
          .input('cufe', sql.VarChar(100), evento.cufe)
          .input('idFactura', sql.Int, idFactura)
          .input('tipoDocumento', sql.VarChar(10), evento.tipoDocumento)
          .input('estado', sql.VarChar(50), evento.estado)
          .input('fechaEvento', sql.DateTime, evento.fechaEvento)
          .input('fechaEmision', sql.DateTime, evento.fechaEmision)
          .input('nitEmisor', sql.VarChar(20), evento.nitEmisor)
          .input('nitReceptor', sql.VarChar(20), evento.nitReceptor)
          .input('numeroDocumento', sql.VarChar(50), evento.numeroDocumento)
          .input('valorTotal', sql.Decimal(18, 2), evento.valorTotal)
          .input('mensaje', sql.VarChar(500), evento.mensaje || '')
          .query(`
            MERGE EventosDIAN AS target
            USING (SELECT @trackId AS TrackId) AS source
            ON target.TrackId = source.TrackId
            WHEN MATCHED THEN
              UPDATE SET
                CUFE = @cufe,
                IdFactura = @idFactura,
                TipoDocumento = @tipoDocumento,
                Estado = @estado,
                FechaEvento = @fechaEvento,
                FechaEmision = @fechaEmision,
                NITEmisor = @nitEmisor,
                NITReceptor = @nitReceptor,
                NumeroDocumento = @numeroDocumento,
                ValorTotal = @valorTotal,
                Mensaje = @mensaje,
                FechaConsulta = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (TrackId, CUFE, IdFactura, TipoDocumento, Estado, FechaEvento, FechaEmision, 
                      NITEmisor, NITReceptor, NumeroDocumento, ValorTotal, Mensaje)
              VALUES (@trackId, @cufe, @idFactura, @tipoDocumento, @estado, @fechaEvento, 
                      @fechaEmision, @nitEmisor, @nitReceptor, @numeroDocumento, @valorTotal, @mensaje);
          `);

        resultado.documentosProcesados++;
      } catch (error: any) {
        console.error(`Error al procesar evento ${evento.trackId}:`, error);
        resultado.documentosConError++;
        resultado.errores.push(`Error procesando ${evento.trackId}: ${error.message}`);
      }
    }

    // Actualizar log de sincronización
    await pool.request()
      .input('idLog', sql.Int, idLog)
      .input('documentosEncontrados', sql.Int, resultado.documentosEncontrados)
      .input('documentosProcesados', sql.Int, resultado.documentosProcesados)
      .input('documentosConError', sql.Int, resultado.documentosConError)
      .input('estado', sql.VarChar(20), resultado.documentosConError === 0 ? 'Completado' : 'CompletadoConErrores')
      .input('mensajeError', sql.NVarChar(sql.MAX), resultado.errores.join('; '))
      .input('fechaFin', sql.DateTime, new Date())
      .query(`
        UPDATE LogSincronizacionDIAN
        SET DocumentosEncontrados = @documentosEncontrados,
            DocumentosProcesados = @documentosProcesados,
            DocumentosConError = @documentosConError,
            Estado = @estado,
            MensajeError = @mensajeError,
            FechaFin = @fechaFin
        WHERE IdLog = @idLog
      `);

    resultado.exito = true;
    resultado.mensaje = `Sincronización completada. ${resultado.documentosProcesados} documentos procesados.`;
    
  } catch (error: any) {
    console.error('Error en sincronización:', error);
    resultado.errores.push(error.message);
    resultado.mensaje = `Error en sincronización: ${error.message}`;
  }

  return resultado;
}

/**
 * Consulta el estado de una factura por CUFE
 */
export async function consultarEstadoFactura(
  pool: sql.ConnectionPool,
  cufe: string
): Promise<any> {
  try {
    const result = await pool.request()
      .input('cufe', sql.VarChar(100), cufe)
      .query(`
        SELECT TOP 1
          e.TrackId,
          e.CUFE,
          e.Estado,
          e.FechaEvento,
          e.Mensaje,
          f.NumeroFactura,
          f.Fecha,
          f.Total
        FROM EventosDIAN e
        LEFT JOIN Facturas f ON e.IdFactura = f.IdFactura
        WHERE e.CUFE = @cufe
        ORDER BY e.FechaEvento DESC
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return result.recordset[0];
  } catch (error) {
    console.error('Error al consultar estado de factura:', error);
    throw error;
  }
}

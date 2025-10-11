// api/register-participants.js

import Airtable from 'airtable';

/**
 * Inicializa la conexión con la base de Airtable usando las variables de entorno.
 * @returns {Airtable.Base} La instancia de la base de Airtable.
 * @throws {Error} Si faltan variables de entorno esenciales.
 */
const initAirtable = () => {
    try {
        // Vercel inyecta las variables de entorno (secrets) en process.env
        const apiKey = process.env.AIRTABLE_API_KEY;
        const baseId = process.env.AIRTABLE_BASE_ID;

        if (!apiKey || !baseId) {
            console.error("Faltan variables de entorno: API Key o Base ID.");
            throw new Error("Error de configuración interna del servidor (Variables de Entorno).");
        }

        Airtable.configure({
            apiKey: apiKey,
            endpointUrl: 'https://api.airtable.com'
        });

        // Retorna la instancia de la base específica
        const base = Airtable.base(baseId);
        
        return base;

    } catch (error) {
        // Propaga el error para que sea capturado por el manejador principal
        throw error;
    }
};

/**
 * Función principal (handler) para la API de Vercel.
 * Procesa la solicitud POST para validar IDs y registrar la inscripción en Airtable.
 */
export default async function handler(req, res) {
    
    // 1. Verificar el Método de la Solicitud
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido. Solo se acepta POST.' });
    }

    try {
        const { billingData, participants } = req.body;
        
        // 2. Validación de Datos Básica
        if (!billingData || !participants || participants.length === 0) {
            return res.status(400).json({ message: 'Datos incompletos: Se requieren datos de facturación y al menos un participante.' });
        }

        const base = initAirtable(); // Inicializa la conexión con Airtable
        
        // Obtener nombres de las tablas desde las variables de entorno
        const INSCRIPTION_TABLE = process.env.AIRTABLE_TABLE_NAME;
        const VALIDATION_TABLE = process.env.AIRTABLE_VALIDATION_TABLE_NAME;

        // --- 3. VALIDACIÓN DE IDs EN AIRTABLE (SEGURIDAD) ---
        
        const participantIDs = participants.map(p => p.IDValidadorParticipante.trim());
        const uniqueParticipantIDs = [...new Set(participantIDs)];

        // Construir la fórmula para buscar todos los IDs únicos en la tabla de validación
        const idFormula = `OR(${uniqueParticipantIDs.map(id => `{ID Validador} = '${id}'`).join(',')})`;
        
        // Consultar la tabla de validación para los IDs proporcionados
        const validIDsRecords = await base(VALIDATION_TABLE).select({
            filterByFormula: idFormula,
            fields: ['ID Validador', 'Usado'], // Solo necesitamos estos campos para el check
        }).all();

        // Mapear IDs encontrados y los que ya han sido usados
        const usedIDs = validIDsRecords
            .filter(record => record.get('Usado'))
            .map(record => record.get('ID Validador'));

        const foundIDs = validIDsRecords.map(record => record.get('ID Validador'));

        // 3.1. Verificar IDs no encontrados (no válidos)
        const missingIDs = uniqueParticipantIDs.filter(id => !foundIDs.includes(id));
        if (missingIDs.length > 0) {
            return res.status(409).json({ message: `Error de validación: Los siguientes ID(s) de Validador no son válidos o no existen: ${missingIDs.join(', ')}.` });
        }

        // 3.2. Verificar IDs ya usados (duplicados)
        if (usedIDs.length > 0) {
            return res.status(409).json({ message: `Error de validación: Los siguientes ID(s) de Validador ya han sido utilizados: ${usedIDs.join(', ')}.` });
        }

        // --- 4. PREPARAR DATOS DE REGISTRO ---
        
        // Usar una clave única para relacionar todos los participantes con una sola entrada de facturación (opcional, pero útil)
        const facturacionKey = `${billingData.RIFCedulaFacturacion.replace(/[^A-Z0-9]/g, '')}-${Date.now()}`;
        
        // Datos de facturación
        const billingRecordFields = {
            'RIF/Cédula Facturación': billingData.RIFCedulaFacturacion,
            'Denominación Fiscal': billingData.DenominacionFiscalFacturacion,
            'Dirección Fiscal': billingData.DireccionFiscalFacturacion,
            'Teléfono Facturación': billingData.TelefonoFacturacion,
            'Sector Facturación': billingData.SectorOrganizacionFacturacion,
            'Tipo de Factura': billingData.TFactura || 'Pro forma', // Asume 'Pro forma' si no está
            'Clave Facturación': facturacionKey
        };

        // Preparar registros finales (combinando facturación y participante)
        const finalRecords = participants.map(p => ({
            fields: {
                ...billingRecordFields, // Datos de facturación
                
                // Datos del participante
                'ID Validador': p.IDValidadorParticipante,
                'Nacionalidad': p.NacionalidadParticipante,
                'Cédula': p.CedulaParticipante,
                'Tipo de Ticket': p.TipoTicketParticipante,
                'Nombre': p.NombreParticipante,
                'Apellido': p.ApellidoParticipante,
                'Teléfono Celular': p.TelefonoCelularParticipante,
                'Teléfono Oficina': p.TelefonoOficinaParticipante,
                'Email': p.EmailParticipante,
                'Organización': p.NombreOrganizacionParticipante,
                'RIF Organización': p.RIFOrganizacionParticipante,
                'Cargo': p.CargoOrganizacionParticipante,
                'Sector Organización': p.SectorOrganizacionParticipante,
                'Fecha de Registro': new Date().toISOString().split('T')[0] // Opcional: añade fecha
            }
        }));


        // --- 5. ESCRITURA EN AIRTABLE ---
        
        // 5.1. Crear registros de inscripción
        const createdRecords = await base(INSCRIPTION_TABLE).create(finalRecords, { typecast: true });

        // 5.2. Marcar IDs como usados en la tabla de Validación
        const validationUpdates = validIDsRecords
            // Filtrar solo los records que fueron usados en esta solicitud
            .filter(record => participantIDs.includes(record.get('ID Validador'))) 
            .map(record => ({
                id: record.id,
                fields: {
                    'Usado': true // El nombre de tu columna de Checkbox/Booleano
                }
            }));

        if (validationUpdates.length > 0) {
             // Ejecuta la actualización en el servidor de Airtable
             await base(VALIDATION_TABLE).update(validationUpdates, { typecast: true });
        }


        // --- 6. RESPUESTA AL CLIENTE ---
        res.status(200).json({ 
            message: '¡Inscripción y validación de IDs exitosa! Los datos han sido registrados.', 
            recordCount: createdRecords.length 
        });

    } catch (error) {
        console.error('Error durante el procesamiento de la solicitud:', error);
        // Devolver un mensaje de error legible al front-end
        res.status(500).json({ message: error.message || 'Error interno del servidor al procesar la solicitud.' });
    }
}
// api/register-participants.js

import Airtable from 'airtable';

/**
 * Inicializa la conexión con la base de Airtable usando las variables de entorno.
 * @returns {Airtable.Base} La instancia de la base de Airtable.
 * @throws {Error} Si faltan variables de entorno esenciales.
 */
const initAirtable = () => {
    try {
        // CORRECCIÓN: Usando nombres estándar de variables de entorno (sin prefijo VITE_APP_)
        const apiKey = process.env.AIRTABLE_API_KEY; 
        const baseId = process.env.AIRTABLE_BASE_ID;

        if (!apiKey || !baseId) {
            console.error("Faltan variables de entorno: API Key o Base ID.");
            // Mensaje de error ajustado para reflejar los nuevos nombres de variables
            throw new Error(`Error de configuración interna: Faltan AIRTABLE_API_KEY o AIRTABLE_BASE_ID. (Verifique los secretos de Vercel).`);
        }

        Airtable.configure({
            apiKey: apiKey,
            endpointUrl: 'https://api.airtable.com'
        });

        // Retorna la instancia de la base específica
        const base = Airtable.base(baseId);
        
        return base;

    } catch (error) {
        throw error;
    }
};

// ----------------------------------------------------------------------

/**
 * Función principal (handler) para la API de Vercel.
 * Procesa la solicitud POST para validar IDs y registrar la inscripción en Airtable.
 */
export default async function handler(req, res) {
    
    // 1. Verificar el Método de la Solicitud
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ message: 'Método no permitido. Solo se acepta POST.' });
    }

    try {
        const { billingData, participants } = req.body;
        
        // 2. Validación de Datos Básica
        if (!billingData || !participants || participants.length === 0) {
            return res.status(400).json({ message: 'Datos incompletos: Se requieren datos de facturación y al menos un participante.' });
        }

        const base = initAirtable(); 
        
        // CORRECCIÓN: Usando nombres estándar de variables de entorno
        const INSCRIPTION_TABLE = process.env.AIRTABLE_TABLE_NAME;
        const VALIDATION_TABLE = process.env.AIRTABLE_VALIDATION_TABLE_NAME;

        if (!INSCRIPTION_TABLE || !VALIDATION_TABLE) {
             throw new Error("Error de configuración interna: Faltan nombres de tablas de Airtable.");
        }

        // --- 3. VALIDACIÓN DE IDs EN AIRTABLE (SEGURIDAD) ---
        
        const participantIDs = participants.map(p => p.IDValidadorParticipante.trim());
        const uniqueParticipantIDs = [...new Set(participantIDs)];

        const idFormula = `OR(${uniqueParticipantIDs.map(id => `{ID Validador} = '${id}'`).join(',')})`;
        
        // Consultar la tabla de validación
        const validIDsRecords = await base(VALIDATION_TABLE).select({
            filterByFormula: idFormula,
            fields: ['ID Validador', 'Usado'],
        }).all();

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
        
        // Clave única basada en RIF + Timestamp
        const facturacionKey = `${billingData.RIFCedulaFacturacion.replace(/[^A-Z0-9]/g, '')}-${Date.now()}`;
        
        // Datos de facturación
        const billingRecordFields = {
            'RIF/Cédula Facturación': billingData.RIFCedulaFacturacion,
            'Denominación Fiscal': billingData.DenominacionFiscalFacturacion,
            'Dirección Fiscal': billingData.DireccionFiscalFacturacion,
            'Teléfono Facturación': billingData.TelefonoFacturacion,
            'Sector Facturación': billingData.SectorOrganizacionFacturacion,
            'Tipo de Factura': billingData.TFactura || 'Pro forma', 
            'Clave Facturación': facturacionKey
        };

        // Preparar registros finales
        const finalRecords = participants.map(p => ({
            fields: {
                ...billingRecordFields, 
                
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
                'Fecha de Registro': new Date().toISOString().split('T')[0] 
            }
        }));


        // --- 5. ESCRITURA EN AIRTABLE ---
        
        const createdRecords = await base(INSCRIPTION_TABLE).create(finalRecords, { typecast: true });

        // 5.2. Marcar IDs como usados en la tabla de Validación
        const validationUpdates = validIDsRecords
            .filter(record => participantIDs.includes(record.get('ID Validador'))) 
            .map(record => ({
                id: record.id,
                fields: {
                    'Usado': true 
                }
            }));

        if (validationUpdates.length > 0) {
            await base(VALIDATION_TABLE).update(validationUpdates, { typecast: true });
        }


        // --- 6. RESPUESTA AL CLIENTE ---
        res.status(200).json({ 
            message: '¡Inscripción y validación de IDs exitosa! Los datos han sido registrados.', 
            recordCount: createdRecords.length 
        });

    } catch (error) {
        console.error('Error durante el procesamiento de la solicitud:', error);
        res.status(500).json({ message: error.message || 'Error interno del servidor al procesar la solicitud.' });
    }
}
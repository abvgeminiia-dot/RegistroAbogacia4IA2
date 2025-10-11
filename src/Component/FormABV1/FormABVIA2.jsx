// FormABV2.jsx (o FormABV2.js)
import React, { useState, useEffect, useRef } from 'react';
import './FormABV1.css'; 
// Asumiendo que 'logoA' y el CSS están en los directorios correctos
import logoA from './LogoABV.png'; 

const FormABV2 = () => {
    // ----------------------------------------------------
    // ESTADO
    // ----------------------------------------------------
    const [numParticipants, setNumParticipants] = useState(1);
    // Inicialización segura para renderizado del servidor (SSR)
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    
    // Estado para los datos de facturación
    const [billingData, setBillingData] = useState({
        RIFCedulaFacturacion: '',
        DenominacionFiscalFacturacion: '',
        DireccionFiscalFacturacion: '',
        TelefonoFacturacion: '',
        SectorOrganizacionFacturacion: '',
    });

    // Estado inicial de un participante
    const initialParticipantState = {
        NacionalidadParticipante: 'V',
        CedulaParticipante: '',
        TipoTicketParticipante: 'Venta',
        IDValidadorParticipante: '',
        NombreParticipante: '',
        ApellidoParticipante: '',
        TelefonoCelularParticipante: '',
        TelefonoOficinaParticipante: '',
        EmailParticipante: '',
        NombreOrganizacionParticipante: '',
        RIFOrganizacionParticipante: '',
        CargoOrganizacionParticipante: '',
        SectorOrganizacionParticipante: ''
    };

    // Estado para la lista de participantes
    const [participants, setParticipants] = useState([{ ...initialParticipantState }]);
    
    // Estado para el envío
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('');

    // Referencia para la tabla (usada en la lógica de redimensionamiento)
    const tableRef = useRef(null);

    // Lista de sectores predefinidos
    const sectores = [
        'Banca Privada', 'Banca Pública', 'Seguros', 'Bolsa de Valores', 'Fintech', 'Criptomonedas / Activos Digitales', 'Microfinanzas', 'Casas de Cambio', 'Gobierno / Sector Público', 'Administración Tributaria', 'Registros Públicos (Propiedad, Mercantil)', 'Notarías', 'Defensa y Seguridad Nacional', 'Salud / Servicios Médicos', 'Industria Farmacéutica', 'Biotecnología', 'Investigación Médica', 'Industrial / Manufactura', 'Automotriz', 'Alimentos y Bebidas', 'Textil y Confección', 'Construcción', 'Tecnología de la Información (TI)', 'Desarrollo de Software', 'Telecomunicaciones', 'Ciberseguridad', 'Inteligencia Artificial', 'Internet de las Cosas (IoT)', 'Educación' , 'Investigación y Desarrollo (I+D)', 'Comercio Minorista (Retail)', 'Comercio Mayorista', 'Logística y Cadena de Suministro', 'Transporte', 'Turismo y Hotelería', 'Entretenimiento y Medios', 'Consultoría (Legal, Financiera, Tecnológica)', 'Servicios', 'Ingenieria', 'Energía (Petróleo, Gas, Renovables)', 'Minería', 'Agricultura / Agroindustria', 'Organizaciones No Gubernamentales (ONG)', 'Fundaciones', 'Legal / Despachos de Abogados', 'Marketing y Publicidad', 'Inmobiliario', 'Otros'
    ];

    // Encabezados de la tabla de participantes
    const participantTableHeaders = [
        { label: '#', width: '45px', isResizable: false },
        { label: 'Nacionalidad*', width: '110px' },
        { label: 'Cédula*', width: '110px' },
        { label: 'Tipo Ticket*', width: '120px' },
        { label: 'ID Validador*', width: '130px' },
        { label: 'Nombre*', width: '180px' },
        { label: 'Apellido*', width: '180px' },
        { label: 'Tel. Celular*', width: '140px' },
        { label: 'Tel. Oficina', width: '140px' },
        { label: 'Email*', width: '240px' },
        { label: 'Organización*', width: '220px' },
        { label: 'RIF*', width: '130px' },
        { label: 'Cargo en la empresa*', width: '200px' },
        { label: 'Sector de la empresa*', width: '190px' }
    ];

    // ----------------------------------------------------
    // EFECTOS
    // ----------------------------------------------------

    // 1. Efecto para detectar si es móvil y actualizar el estado
    useEffect(() => {
        const checkIsMobile = () => {
            if (typeof window !== 'undefined') setIsMobile(window.innerWidth <= 768);
        };
        if (typeof window !== 'undefined') {
            checkIsMobile();
            window.addEventListener('resize', checkIsMobile);
        }
        return () => {
            if (typeof window !== 'undefined') window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    // 2. Efecto para ajustar el número de participantes
    useEffect(() => {
        setParticipants(currentParticipants => {
            const newCount = parseInt(numParticipants, 10) || 1;
            const currentCount = currentParticipants.length;
            if (newCount === currentCount) return currentParticipants;
            
            if (newCount > currentCount) {
                // Añadir nuevos participantes con estado inicial
                const additionalParticipants = Array(newCount - currentCount).fill(null).map(() => ({ ...initialParticipantState }));
                return [...currentParticipants, ...additionalParticipants];
            }
            // Recortar la lista de participantes
            return currentParticipants.slice(0, newCount);
        });
    }, [numParticipants]);

    // 3. Efecto para la lógica de redimensionamiento de columnas (expandido para claridad)
    useEffect(() => {
        if (isMobile || typeof document === 'undefined') return;
        const table = tableRef.current;
        if (!table) return;

        const cols = Array.from(table.querySelectorAll('th'));
        const activeResizers = [];

        cols.forEach((col) => {
            const resizer = col.querySelector('.resize-handle');
            if (!resizer) return;

            let x = 0;
            let w = 0;

            const mouseDownHandler = (e) => {
                e.preventDefault();
                x = e.clientX;
                w = col.offsetWidth;
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                resizer.classList.add('resizing');
            };

            const mouseMoveHandler = (e) => {
                const dx = e.clientX - x;
                const newWidth = w + dx;
                if (newWidth > 40) { // Mínimo 40px
                    col.style.width = `${newWidth}px`;
                }
            };

            const mouseUpHandler = () => {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                resizer.classList.remove('resizing');
            };

            resizer.addEventListener('mousedown', mouseDownHandler);
            activeResizers.push({ resizer, handler: mouseDownHandler });
        });

        return () => {
            // Limpieza de event listeners
            activeResizers.forEach(({ resizer, handler }) => {
                if (resizer) {
                    resizer.removeEventListener('mousedown', handler);
                }
            });
        };
    }, [participants.length, isMobile]);

    // ----------------------------------------------------
    // HANDLERS Y LÓGICA DE NEGOCIO
    // ----------------------------------------------------

    /**
     * Formatea el RIF o Cédula aplicando reglas venezolanas (V/E/P/J/G-números).
     */
    const formatIdentifier = (value) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleaned.length === 0) return '';
        
        const letter = cleaned.charAt(0);
        if (!/^[VEJPG]$/.test(letter)) {
            return cleaned.slice(0, 1);
        }
        
        let numbers = cleaned.slice(1).replace(/[^0-9]/g, '');
        
        const isRifJG = /^[JG]$/.test(letter);
        // J/G acepta 9 dígitos. V/E/P acepta hasta 10 dígitos.
        const maxNumericDigits = isRifJG ? 9 : 10;
        
        if (numbers.length > maxNumericDigits) {
            numbers = numbers.slice(0, maxNumericDigits);
        }

        if (numbers.length === 0 && letter) {
            return `${letter}-`;
        }

        // Limita la longitud total
        return `${letter}-${numbers}`.slice(0, maxNumericDigits + 1 + 1); 
    };
    
    /**
     * Maneja el cambio en el número de participantes.
     */
    const handleNumParticipantsChange = (e) => {
        let count = parseInt(e.target.value, 10);
        if (isNaN(count) || count < 1) count = 1;
        if (count > 10) count = 10; // Límite de 10
        setNumParticipants(count);
    };

    /**
     * Maneja el cambio en los campos de facturación.
     */
    const handleBillingChange = (field, value) => {
        let processedValue = value;
        if (field === 'TelefonoFacturacion') {
            // Solo dígitos, máximo 11
            processedValue = value.replace(/\D/g, '').slice(0, 11);
        } else if (field === 'RIFCedulaFacturacion') {
            // Aplica el formato RIF/Cédula
            processedValue = formatIdentifier(value); 
        }
        setBillingData(prev => ({ ...prev, [field]: processedValue }));
    };

    /**
     * Abre un cliente de correo para adjuntar el RIF (Requisito manual).
     */
    const handleAttachRIF = () => {
        const toEmail = 'abv.gemini.ia@gmail.com';
        const rifToUse = billingData.RIFCedulaFacturacion || 'PENDIENTE'; 
        const subject = encodeURIComponent(`Adjunto RIF - Facturación ${rifToUse}`);
        const body = encodeURIComponent(
            `Estimados,\n\nAdjunto en este correo el RIF/Cédula correspondiente al número ${rifToUse} y a la Denominación Fiscal: ${billingData.DenominacionFiscalFacturacion || 'PENDIENTE'}.\n\nPor favor, adjunte el documento del RIF/Cédula a este correo y envíelo.\n\nSaludos.`
        );
        
        const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${body}`;
        
        window.location.href = mailtoLink;
    };
    
    /**
     * Maneja el cambio en los campos de los participantes.
     */
    const handleParticipantChange = (index, field, value) => {
        const updatedParticipants = [...participants];
        let processedValue = value;

        if (['TelefonoCelularParticipante', 'TelefonoOficinaParticipante'].includes(field)) {
            // Solo dígitos, máximo 11
            processedValue = value.replace(/\D/g, '').slice(0, 11);
        } else if (field === 'RIFOrganizacionParticipante') {
            // Aplica el formato RIF/Cédula
            processedValue = formatIdentifier(value); 
        } else if (field === 'IDValidadorParticipante' || field === 'CedulaParticipante') {
            // Solo dígitos
            processedValue = value.replace(/\D/g, '');
        } else {
            processedValue = value;
        }

        updatedParticipants[index] = { ...updatedParticipants[index], [field]: processedValue };
        setParticipants(updatedParticipants);
    };
    
    /**
     * Envía el formulario y realiza las validaciones de front-end.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus('');
        setIsSubmitting(true);

        // --- VALIDACIONES DE RIF (Front-end) ---
        
        const rifJGCedulaRegex = /^[VEP]-\d{7,10}$/; 
        const rifJGRegex = /^[JG]-\d{9}$/; 
        
        // 1. Validar Datos de Facturación
        const billingId = billingData.RIFCedulaFacturacion;
        const billingPrefix = billingId.charAt(0);

        if (/^[JG]$/.test(billingPrefix) && !rifJGRegex.test(billingId)) {
            alert('El RIF de facturación (J o G) no es válido. Debe ser J/G-EXACTAMENTE 9 dígitos (incluyendo ceros a la izquierda). Ej: J-001234567');
            setIsSubmitting(false);
            return;
        } else if (!/^[JG]$/.test(billingPrefix) && !rifJGCedulaRegex.test(billingId)) {
             alert('La Cédula o RIF (V, E, P) no es válida. Debe tener la letra y al menos 7 dígitos. Ej: V-1234567');
             setIsSubmitting(false);
             return;
        }
        
        if (billingData.TelefonoFacturacion.length !== 11) {
            alert('El teléfono de facturación debe tener exactamente 11 dígitos.');
            setIsSubmitting(false);
            return;
        }
        if (billingData.DenominacionFiscalFacturacion.trim() === '' || billingData.DireccionFiscalFacturacion.trim() === '' || billingData.SectorOrganizacionFacturacion.trim() === '') {
             alert('Por favor, complete todos los campos obligatorios de Facturación.');
             setIsSubmitting(false);
             return;
        }
        
        // 2. Validar Datos de Participantes
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            const participantNumber = i + 1;
            const requiredFields = {
                CedulaParticipante: 'Cédula', IDValidadorParticipante: 'ID Validador',
                NombreParticipante: 'Nombre', ApellidoParticipante: 'Apellido',
                EmailParticipante: 'Correo Electrónico', NombreOrganizacionParticipante: 'Nombre de la Organización',
                RIFOrganizacionParticipante: 'RIF de la Organización', CargoOrganizacionParticipante: 'Cargo',
                SectorOrganizacionParticipante: 'Sector', TelefonoCelularParticipante: 'Teléfono Celular'
            };
            for (const [field, label] of Object.entries(requiredFields)) {
                if (!p[field] || p[field].trim() === '') {
                    alert(`Por favor, complete el campo '${label}' para el participante #${participantNumber}.`);
                    setIsSubmitting(false);
                    return;
                }
            }
            if (p.IDValidadorParticipante.length !== 6) {
                alert(`El ID Validador del participante #${participantNumber} debe tener 6 dígitos.`);
                setIsSubmitting(false);
                return;
            }
            
            // Validar RIF de la Organización
            const participantRif = p.RIFOrganizacionParticipante;
            const participantPrefix = participantRif.charAt(0);
            
            if (/^[JG]$/.test(participantPrefix) && !rifJGRegex.test(participantRif)) {
                 alert(`El RIF de la Organización (J o G) del participante #${participantNumber} no es válido. Debe ser J/G-EXACTAMENTE 9 dígitos (incluyendo ceros a la izquierda). Ej: J-001234567`);
                 setIsSubmitting(false);
                 return;
            } else if (!/^[JG]$/.test(participantPrefix) && !rifJGCedulaRegex.test(participantRif)) {
                 alert(`El RIF/Cédula (V, E, P) de la Organización del participante #${participantNumber} no es válido. Debe tener la letra y un formato numérico válido. Ej: V-1234567`);
                 setIsSubmitting(false);
                 return;
            }
        }
        
        // --- LLAMADA AL BACKEND SEGURO (/api/register-participants) ---
        try {
            setSubmissionStatus('Validando y enviando datos de forma segura...');
            
            // Añade el tipo de factura (requerido por el backend)
            const finalBillingData = { ...billingData, TFactura: 'Pro forma' };

            const response = await fetch('/api/register-participants', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billingData: finalBillingData, participants }),
            });

            const result = await response.json(); 
            
            if (!response.ok) {
                // El backend maneja el error 409 (conflictos de ID)
                throw new Error(result.message || 'Ocurrió un error en el servidor o en la validación de IDs.');
            }

            setSubmissionStatus('¡Inscripción enviada exitosamente! Redirigiendo...');
            alert('Formulario enviado y registrado correctamente. Recibirá confirmación por correo.');

            // Redirigir al inicio o a una página de éxito
            window.location.href = '/'; 

        } catch (error) {
            console.error('Error durante el envío a la API segura:', error);
            const displayMessage = error.message.includes("JSON") 
                                 ? "Error de conexión: El servidor no respondió con datos válidos."
                                 : error.message;

            setSubmissionStatus(`Error: ${displayMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ----------------------------------------------------
    // FUNCIONES DE RENDERIZADO (EXPANDIDAS)
    // ----------------------------------------------------
    
    const isBillingDataReady = billingData.RIFCedulaFacturacion && billingData.RIFCedulaFacturacion.length >= 2 && billingData.DenominacionFiscalFacturacion.trim() !== '';

    /**
     * Renderiza los participantes en formato de tarjeta (para móviles).
     */
    const renderParticipantCards = () => {
        return (
            <div className="participants-cards">
                {participants.map((participant, index) => (
                    <div key={`card-${index}`} className="participant-card">
                        <div className="participant-card-header">Participante #{index + 1}</div>
                        <div className="participant-card-grid">
                            
                            {/* Nacionalidad */}
                            <div className="participant-field">
                                <label htmlFor={`NacionalidadParticipante-${index}`}>Nacionalidad<span style={{ color: 'red' }}>*</span></label>
                                <select id={`NacionalidadParticipante-${index}`} name={`NacionalidadParticipante-${index}`} value={participant.NacionalidadParticipante} onChange={(e) => handleParticipantChange(index, 'NacionalidadParticipante', e.target.value)} className="form-select" required>
                                    <option value="V">V</option>
                                    <option value="E">E</option>
                                    <option value="P">P</option>
                                </select>
                            </div>

                            {/* Cédula */}
                            <div className="participant-field">
                                <label htmlFor={`CedulaParticipante-${index}`}>Cédula<span style={{ color: 'red' }}>*</span></label>
                                <input id={`CedulaParticipante-${index}`} name={`CedulaParticipante-${index}`} type="text" value={participant.CedulaParticipante} onChange={(e) => handleParticipantChange(index, 'CedulaParticipante', e.target.value)} className="form-input" placeholder="Ej: 12345678" required />
                            </div>

                            {/* Tipo de Ticket */}
                            <div className="participant-field">
                                <label htmlFor={`TipoTicketParticipante-${index}`}>Tipo de Ticket<span style={{ color: 'red' }}>*</span></label>
                                <select id={`TipoTicketParticipante-${index}`} name={`TipoTicketParticipante-${index}`} value={participant.TipoTicketParticipante} onChange={(e) => handleParticipantChange(index, 'TipoTicketParticipante', e.target.value)} className="form-select" required>
                                    <option value="Venta">Venta</option>
                                    <option value="Cortesia">Cortesía</option>
                                </select>
                            </div>
                            
                            {/* ID Validador */}
                            <div className="participant-field">
                                <label htmlFor={`IDValidadorParticipante-${index}`}>ID Validador<span style={{ color: 'red' }}>*</span></label>
                                <input id={`IDValidadorParticipante-${index}`} name={`IDValidadorParticipante-${index}`} type="text" value={participant.IDValidadorParticipante} onChange={(e) => handleParticipantChange(index, 'IDValidadorParticipante', e.target.value)} className="form-input" placeholder="Código de 6 dígitos" maxLength="6" required />
                            </div>

                            {/* Nombre */}
                            <div className="participant-field">
                                <label htmlFor={`NombreParticipante-${index}`}>Nombre<span style={{ color: 'red' }}>*</span></label>
                                <input id={`NombreParticipante-${index}`} name={`NombreParticipante-${index}`} type="text" value={participant.NombreParticipante} onChange={(e) => handleParticipantChange(index, 'NombreParticipante', e.target.value)} className="form-input" required />
                            </div>

                            {/* Apellido */}
                            <div className="participant-field">
                                <label htmlFor={`ApellidoParticipante-${index}`}>Apellido<span style={{ color: 'red' }}>*</span></label>
                                <input id={`ApellidoParticipante-${index}`} name={`ApellidoParticipante-${index}`} type="text" value={participant.ApellidoParticipante} onChange={(e) => handleParticipantChange(index, 'ApellidoParticipante', e.target.value)} className="form-input" required />
                            </div>

                            {/* Teléfono Celular */}
                            <div className="participant-field">
                                <label htmlFor={`TelefonoCelularParticipante-${index}`}>Teléfono Celular<span style={{ color: 'red' }}>*</span></label>
                                <input id={`TelefonoCelularParticipante-${index}`} name={`TelefonoCelularParticipante-${index}`} type="tel" value={participant.TelefonoCelularParticipante} onChange={(e) => handleParticipantChange(index, 'TelefonoCelularParticipante', e.target.value)} className="form-input" placeholder="04141234567" maxLength="11" required />
                            </div>

                            {/* Teléfono Oficina */}
                            <div className="participant-field">
                                <label htmlFor={`TelefonoOficinaParticipante-${index}`}>Teléfono Oficina</label>
                                <input id={`TelefonoOficinaParticipante-${index}`} name={`TelefonoOficinaParticipante-${index}`} type="tel" value={participant.TelefonoOficinaParticipante} onChange={(e) => handleParticipantChange(index, 'TelefonoOficinaParticipante', e.target.value)} className="form-input" placeholder="02121234567" maxLength="11" />
                            </div>

                            {/* Email */}
                            <div className="participant-field full-width">
                                <label htmlFor={`EmailParticipante-${index}`}>Email<span style={{ color: 'red' }}>*</span></label>
                                <input id={`EmailParticipante-${index}`} name={`EmailParticipante-${index}`} type="email" value={participant.EmailParticipante} onChange={(e) => handleParticipantChange(index, 'EmailParticipante', e.target.value)} className="form-input" placeholder="usuario@dominio.com" required />
                            </div>

                            {/* Nombre de la Organización */}
                            <div className="participant-field full-width">
                                <label htmlFor={`NombreOrganizacionParticipante-${index}`}>Nombre de la Organización<span style={{ color: 'red' }}>*</span></label>
                                <input id={`NombreOrganizacionParticipante-${index}`} name={`NombreOrganizacionParticipante-${index}`} type="text" value={participant.NombreOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'NombreOrganizacionParticipante', e.target.value)} className="form-input" required />
                            </div>

                            {/* RIF de la Organización */}
                            <div className="participant-field">
                                <label htmlFor={`RIFOrganizacionParticipante-${index}`}>RIF de la Organización<span style={{ color: 'red' }}>*</span></label>
                                <input id={`RIFOrganizacionParticipante-${index}`} name={`RIFOrganizacionParticipante-${index}`} type="text" value={participant.RIFOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'RIFOrganizacionParticipante', e.target.value)} className="form-input" placeholder="J-001234567" required />
                            </div>

                            {/* Cargo en la Organización */}
                            <div className="participant-field">
                                <label htmlFor={`CargoOrganizacionParticipante-${index}`}>Cargo en la Organización<span style={{ color: 'red' }}>*</span></label>
                                <input id={`CargoOrganizacionParticipante-${index}`} name={`CargoOrganizacionParticipante-${index}`} type="text" value={participant.CargoOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'CargoOrganizacionParticipante', e.target.value)} className="form-input" required />
                            </div>

                            {/* Sector de la Organización */}
                            <div className="participant-field">
                                <label htmlFor={`SectorOrganizacionParticipante-${index}`}>Sector de la Organización<span style={{ color: 'red' }}>*</span></label>
                                <select id={`SectorOrganizacionParticipante-${index}`} name={`SectorOrganizacionParticipante-${index}`} value={participant.SectorOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'SectorOrganizacionParticipante', e.target.value)} className="form-select" required>
                                    <option value="">Seleccione</option>
                                    {sectores.map(sector => (<option key={`card-${index}-${sector}`} value={sector}>{sector}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    /**
     * Renderiza los participantes en formato de tabla (para escritorio).
     */
    const renderParticipantsTable = () => {
        return (
            <div className="table-wrapper">
                <table className="participants-table" ref={tableRef}>
                    <thead>
                        <tr>
                            {participantTableHeaders.map((headerInfo, idx) => (
                                <th key={`th-${idx}`} style={{ position: 'relative', whiteSpace: 'nowrap', width: headerInfo.width }}>
                                    {headerInfo.label.endsWith('*') ? <>{headerInfo.label.slice(0, -1)}<span style={{ color: 'red' }}>*</span></> : headerInfo.label}
                                    {(headerInfo.isResizable !== false && idx > 0) && <div className="resize-handle"></div>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map((participant, index) => (
                            <tr key={`tr-${index}`}>
                                <td>{index + 1}</td>
                                
                                {/* Nacionalidad */}
                                <td>
                                    <select id={`NacionalidadParticipante-table-${index}`} name={`NacionalidadParticipante-${index}`} aria-label={`Nacionalidad participante ${index + 1}`} value={participant.NacionalidadParticipante} onChange={(e) => handleParticipantChange(index, 'NacionalidadParticipante', e.target.value)} className="form-select compact" required>
                                        <option value="V">V</option><option value="E">E</option><option value="P">P</option>
                                    </select>
                                </td>
                                
                                {/* Cédula */}
                                <td>
                                    <input id={`CedulaParticipante-table-${index}`} name={`CedulaParticipante-${index}`} aria-label={`Cédula participante ${index + 1}`} type="text" value={participant.CedulaParticipante} onChange={(e) => handleParticipantChange(index, 'CedulaParticipante', e.target.value)} className="form-input compact" placeholder="Ej: 12345678" required />
                                </td>

                                {/* Tipo de Ticket */}
                                <td>
                                    <select id={`TipoTicketParticipante-table-${index}`} name={`TipoTicketParticipante-${index}`} aria-label={`Tipo de ticket participante ${index + 1}`} value={participant.TipoTicketParticipante} onChange={(e) => handleParticipantChange(index, 'TipoTicketParticipante', e.target.value)} className="form-select compact" required>
                                        <option value="Venta">Venta</option><option value="Cortesia">Cortesía</option>
                                    </select>
                                </td>
                                
                                {/* ID Validador */}
                                <td>
                                    <input id={`IDValidadorParticipante-table-${index}`} name={`IDValidadorParticipante-${index}`} aria-label={`ID Validador participante ${index + 1}`} type="text" value={participant.IDValidadorParticipante} onChange={(e) => handleParticipantChange(index, 'IDValidadorParticipante', e.target.value)} className="form-input compact" placeholder="6 dígitos" maxLength="6" required />
                                </td>

                                {/* Nombre */}
                                <td>
                                    <input id={`NombreParticipante-table-${index}`} name={`NombreParticipante-${index}`} aria-label={`Nombre participante ${index + 1}`} type="text" value={participant.NombreParticipante} onChange={(e) => handleParticipantChange(index, 'NombreParticipante', e.target.value)} className="form-input compact" required />
                                </td>

                                {/* Apellido */}
                                <td>
                                    <input id={`ApellidoParticipante-table-${index}`} name={`ApellidoParticipante-${index}`} aria-label={`Apellido participante ${index + 1}`} type="text" value={participant.ApellidoParticipante} onChange={(e) => handleParticipantChange(index, 'ApellidoParticipante', e.target.value)} className="form-input compact" required />
                                </td>

                                {/* Teléfono Celular */}
                                <td>
                                    <input id={`TelefonoCelularParticipante-table-${index}`} name={`TelefonoCelularParticipante-${index}`} aria-label={`Teléfono celular participante ${index + 1}`} type="tel" value={participant.TelefonoCelularParticipante} onChange={(e) => handleParticipantChange(index, 'TelefonoCelularParticipante', e.target.value)} className="form-input compact" placeholder="04141234567" maxLength="11" required />
                                </td>

                                {/* Teléfono Oficina */}
                                <td>
                                    <input id={`TelefonoOficinaParticipante-table-${index}`} name={`TelefonoOficinaParticipante-${index}`} aria-label={`Teléfono oficina participante ${index + 1}`} type="tel" value={participant.TelefonoOficinaParticipante} onChange={(e) => handleParticipantChange(index, 'TelefonoOficinaParticipante', e.target.value)} className="form-input compact" placeholder="02121234567" maxLength="11" />
                                </td>

                                {/* Email */}
                                <td>
                                    <input id={`EmailParticipante-table-${index}`} name={`EmailParticipante-${index}`} aria-label={`Email participante ${index + 1}`} type="email" value={participant.EmailParticipante} onChange={(e) => handleParticipantChange(index, 'EmailParticipante', e.target.value)} className="form-input compact" placeholder="usuario@dominio.com" required />
                                </td>

                                {/* Nombre de la Organización */}
                                <td>
                                    <input id={`NombreOrganizacionParticipante-table-${index}`} name={`NombreOrganizacionParticipante-${index}`} aria-label={`Nombre organización participante ${index + 1}`} type="text" value={participant.NombreOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'NombreOrganizacionParticipante', e.target.value)} className="form-input compact" required />
                                </td>

                                {/* RIF de la Organización */}
                                <td>
                                    <input id={`RIFOrganizacionParticipante-table-${index}`} name={`RIFOrganizacionParticipante-${index}`} aria-label={`RIF organización participante ${index + 1}`} type="text" value={participant.RIFOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'RIFOrganizacionParticipante', e.target.value)} className="form-input compact" placeholder="J-001234567" required />
                                </td>

                                {/* Cargo en la Organización */}
                                <td>
                                    <input id={`CargoOrganizacionParticipante-table-${index}`} name={`CargoOrganizacionParticipante-${index}`} aria-label={`Cargo organización participante ${index + 1}`} type="text" value={participant.CargoOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'CargoOrganizacionParticipante', e.target.value)} className="form-input compact" required />
                                </td>

                                {/* Sector de la Organización */}
                                <td>
                                    <select id={`SectorOrganizacionParticipante-table-${index}`} name={`SectorOrganizacionParticipante-${index}`} aria-label={`Sector organización participante ${index + 1}`} value={participant.SectorOrganizacionParticipante} onChange={(e) => handleParticipantChange(index, 'SectorOrganizacionParticipante', e.target.value)} className="form-select compact" required>
                                        <option value="">Seleccione</option>
                                        {sectores.map(sector => (<option key={`table-${index}-${sector}`} value={sector}>{sector}</option>))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // ----------------------------------------------------
    // RENDER PRINCIPAL DEL COMPONENTE
    // ----------------------------------------------------
    return (
        <div className="container">
            <div className="form-wrapper">
                
                {/* Encabezado del Formulario */}
                <div className="header-card">
                    <div className="logo-container">
                        <img src={logoA} className="App-logo" alt="logo" />
                    </div>
                    <h1>Asociación Bancaria de Venezuela</h1>
                    <h2>Formulario para Inscripción Agile Legal Project Management</h2>
                    <h2>3 de noviembre de 2025 - 8:00 a.m. a 12:00 p.m. y 4 de noviembre de 2025 8:00 a.m. a 12:00 p.m. TURNO:MAÑANA</h2>
                </div>

                {/* Formulario Principal */}
                <form onSubmit={handleSubmit} className="form-content">
                    
                    {/* Sección: Número de Participantes */}
                    <div className="section-card">
                        <div className="section-header">
                            <div className="section-icon">
                                {/* Icono de Personas */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                            <h3 className="section-title">Número de Participantes</h3>
                        </div>
                        <div className="form-group" style={{ padding: '20px 30px' }}>
                            <label htmlFor="numParticipants">Indique el número de participantes a inscribir:<span style={{ color: 'red' }}>*</span></label>
                            <input type="number" id="numParticipants" name="numParticipants" className="form-input" value={numParticipants} onChange={handleNumParticipantsChange} min="1" max="10" required aria-describedby="numParticipantsHelp" />
                            <small id="numParticipantsHelp" className="form-text text-muted">Mínimo 1, máximo 10 participantes.</small>
                        </div>
                    </div>

                    {/* Sección: Datos de Facturación */}
                    <div className="section-card">
                        <div className="section-header">
                            <div className="section-icon">
                                {/* Icono de Tarjeta o Factura */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                            </div>
                            <h3 className="section-title">Datos de Facturación</h3>
                        </div>
                        <div className="billing-fields">
                            
                            {/* RIF o Cédula Facturación */}
                            <div className="form-group">
                                <label htmlFor="RIFCedulaFacturacion">RIF o Cédula:<span style={{ color: 'red' }}>*</span></label>
                                <input type="text" id="RIFCedulaFacturacion" name="RIFCedulaFacturacion" className="form-input" value={billingData.RIFCedulaFacturacion} onChange={(e) => handleBillingChange('RIFCedulaFacturacion', e.target.value)} placeholder="Ej: V-12345678 o J-001234567" required />
                                <small>* Los **RIF J/G** requieren **9 dígitos exactos** (incluya ceros a la izquierda).</small>
                            </div>
                            
                            {/* Denominación Fiscal */}
                            <div className="form-group">
                                <label htmlFor="DenominacionFiscalFacturacion">Denominación Fiscal:<span style={{ color: 'red' }}>*</span></label>
                                <input type="text" id="DenominacionFiscalFacturacion" name="DenominacionFiscalFacturacion" className="form-input" value={billingData.DenominacionFiscalFacturacion} onChange={(e) => handleBillingChange('DenominacionFiscalFacturacion', e.target.value)} required />
                            </div>
                            
                            {/* Dirección Fiscal */}
                            <div className="form-group full-width">
                                <label htmlFor="DireccionFiscalFacturacion">Dirección Fiscal:<span style={{ color: 'red' }}>*</span></label>
                                <input type="text" id="DireccionFiscalFacturacion" name="DireccionFiscalFacturacion" className="form-input" value={billingData.DireccionFiscalFacturacion} onChange={(e) => handleBillingChange('DireccionFiscalFacturacion', e.target.value)} required />
                            </div>
                            
                            {/* Teléfono Facturación */}
                            <div className="form-group">
                                <label htmlFor="TelefonoFacturacion">Teléfono:<span style={{ color: 'red' }}>*</span></label>
                                <input type="tel" id="TelefonoFacturacion" name="TelefonoFacturacion" className="form-input" value={billingData.TelefonoFacturacion} onChange={(e) => handleBillingChange('TelefonoFacturacion', e.target.value)} placeholder="02121234567" maxLength="11" required />
                            </div>
                            
                            {/* Sector Facturación */}
                            <div className="form-group">
                                <label htmlFor="SectorOrganizacionFacturacion">Sector de la Organización:<span style={{ color: 'red' }}>*</span></label>
                                <select id="SectorOrganizacionFacturacion" name="SectorOrganizacionFacturacion" className="form-select" value={billingData.SectorOrganizacionFacturacion} onChange={(e) => handleBillingChange('SectorOrganizacionFacturacion', e.target.value)} required>
                                    <option value="">Seleccione un sector</option>
                                    {sectores.map(sector => (<option key={`billing-${sector}`} value={sector}>{sector}</option>))}
                                </select>
                            </div>
                            
                            {/* Botón Adjuntar RIF */}
                            <div className="form-group">
                                <label htmlFor="adjuntarRIF">Adjuntar RIF (Imagen/PDF)<span style={{ color: 'red' }}>*</span></label>
                                <button type="button" onClick={handleAttachRIF} className="submit-button" disabled={!isBillingDataReady} style={{ backgroundColor: isBillingDataReady ? '#007bff' : '#ccc', marginTop: '5px' }}>
                                    Adjuntar RIF (Abrir Correo) 📧
                                </button>
                                <small id="adjuntarRIFHelp" className="form-text text-muted">Debe adjuntar el archivo a **abv.gemini.ia@gmail.com** desde su correo. (Habilitado cuando RIF y Denominación están listos)</small>
                            </div>
                        </div>
                    </div>

                    {/* Sección: Datos de los Participantes */}
                    <div className="section-card">
                        <div className="section-header">
                            <div className="section-icon">
                                {/* Icono de Grupos/Usuarios */}
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                            </div>
                            <h3 className="section-title">Datos de los Participantes</h3>
                        </div>
                        {isMobile ? renderParticipantCards() : renderParticipantsTable()}
                    </div>

                    {/* Estado del Envío */}
                    {submissionStatus && (
                        <div className={`submission-status ${submissionStatus.startsWith('Error') ? 'error' : 'success'}`}>
                            {submissionStatus}
                        </div>
                    )}

                    {/* Botón de Envío */}
                    <div className="submit-container">
                        <button type="submit" className="submit-button" disabled={isSubmitting}>
                            {isSubmitting ? 'Validando y Enviando...' : 'Enviar Inscripción'}
                        </button>
                    </div>
                </form>

                {/* Pie de Página */}
                <div className="footer">
                    <p>Los campos marcados con <span style={{ color: 'red' }}>*</span> son obligatorios</p>
                    <p><small>* El RIF/Cédula (V, E, P) acepta su formato usual. Los RIFs de organización (**J, G**) deben tener una letra inicial, un guion y **9 dígitos** (rellene con ceros a la izquierda si es necesario). Ej: **J-001234567**.</small></p>
                    <p><small>* El campo ID Validador es OBLIGATORIO (6 dígitos). No se permiten IDs duplicados o que no estén en la lista de IDs válidos.</small></p>
                </div>
            </div>
        </div>
    );
};

export default FormABV2;
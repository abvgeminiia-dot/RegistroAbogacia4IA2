import React, { useState, useEffect, useRef } from 'react';
import Airtable from 'airtable';
import './FormABV1.css'; // Asegúrate de tener este archivo de estilos
import logoA from './LogoABV.png'; // Asegúrate de tener el logo en la misma carpeta

// ⚠️ ADVERTENCIA DE SEGURIDAD MUY IMPORTANTE ⚠️
// Esta solución expone tu clave de API de Airtable en el código del navegador.
// Úsala SOLAMENTE para pruebas locales. NUNCA la subas a producción.

const apiKey = import.meta.env.VITE_APP_AIRTABLE_API_KEY;
const baseId = import.meta.env.VITE_APP_AIRTABLE_BASE_ID;
const tableName = import.meta.env.VITE_APP_AIRTABLE_TABLE_NAME1; // <-- Tabla principal
const validationTableName = import.meta.env.VITE_APP_AIRTABLE_VALIDATION_TABLE_NAME;


let table;
let validationTable;
let isAirtableConfigured = false;

if (apiKey && baseId && tableName && validationTableName) {
    const base = new Airtable({ apiKey }).base(baseId);
    table = base(tableName);
    validationTable = base(validationTableName);
    isAirtableConfigured = true;
} else {
    console.error("Faltan las variables de entorno de Airtable (VITE_APP_...). Asegúrate de tener un archivo .env.local con todas las variables requeridas.");
}


const FormABV2 = () => {
    const [numParticipants, setNumParticipants] = useState(1);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
    
    // --- Eliminado TFactura ---
    const [billingData, setBillingData] = useState({
        RIFCedulaFacturacion: '',
        DenominacionFiscalFacturacion: '',
        DireccionFiscalFacturacion: '',
        TelefonoFacturacion: '',
        SectorOrganizacionFacturacion: '',
    });

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

    const [participants, setParticipants] = useState([{ ...initialParticipantState }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState('');

    const sectores = [
        'Banca Privada', 'Banca Pública', 'Seguros', 'Bolsa de Valores', 'Fintech', 'Criptomonedas / Activos Digitales', 'Microfinanzas', 'Casas de Cambio', 'Gobierno / Sector Público', 'Administración Tributaria', 'Registros Públicos (Propiedad, Mercantil)', 'Notarías', 'Defensa y Seguridad Nacional', 'Salud / Servicios Médicos', 'Industria Farmacéutica', 'Biotecnología', 'Investigación Médica', 'Industrial / Manufactura', 'Automotriz', 'Alimentos y Bebidas', 'Textil y Confección', 'Construcción', 'Tecnología de la Información (TI)', 'Desarrollo de Software', 'Telecomunicaciones', 'Ciberseguridad', 'Inteligencia Artificial', 'Internet de las Cosas (IoT)', 'Educación' , 'Investigación y Desarrollo (I+D)', 'Comercio Minorista (Retail)', 'Comercio Mayorista', 'Logística y Cadena de Suministro', 'Transporte', 'Turismo y Hotelería', 'Entretenimiento y Medios', 'Consultoría (Legal, Financiera, Tecnológica)', 'Servicios', 'Ingenieria', 'Energía (Petróleo, Gas, Renovables)', 'Minería', 'Agricultura / Agroindustria', 'Organizaciones No Gubernamentales (ONG)', 'Fundaciones', 'Legal / Despachos de Abogados', 'Marketing y Publicidad', 'Inmobiliario', 'Otros'
    ];

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

    useEffect(() => {
        setParticipants(currentParticipants => {
            const newCount = parseInt(numParticipants, 10) || 1;
            const currentCount = currentParticipants.length;
            if (newCount === currentCount) return currentParticipants;
            if (newCount > currentCount) {
                const additionalParticipants = Array(newCount - currentCount).fill(null).map(() => ({ ...initialParticipantState }));
                return [...currentParticipants, ...additionalParticipants];
            }
            return currentParticipants.slice(0, newCount);
        });
    }, [numParticipants]);

    // --- ✅ Lógica de RIF/Cédula MEJORADA ---
    const formatIdentifier = (value) => {
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleaned.length === 0) return '';
        
        const letter = cleaned.charAt(0);
        if (!/^[VEJPG]$/.test(letter)) {
            return cleaned.slice(0, 1);
        }
        
        let numbers = cleaned.slice(1).replace(/[^0-9]/g, '');
        
        // J/G (RIF) deben tener máx. 9 dígitos. Cédulas (V/E/P) pueden ser más cortas pero se limitan a 10 dígitos numéricos.
        const maxNumericDigits = (/^[JG]$/.test(letter)) ? 9 : 10; 
        
        if (numbers.length > maxNumericDigits) {
            numbers = numbers.slice(0, maxNumericDigits);
        }
        
        if (numbers.length === 0 && letter) {
            return `${letter}-`;
        }

        // El límite total de la cadena es 11 para J/G (L-DDDDDDDDD) y 12 para Cédulas (L-DDDDDDDDDD).
        return `${letter}-${numbers}`.slice(0, maxNumericDigits + 1 + 1); 
    };
    
    const handleNumParticipantsChange = (e) => {
        let count = parseInt(e.target.value, 10);
        if (isNaN(count) || count < 1) count = 1;
        if (count > 10) count = 10;
        setNumParticipants(count);
    };

    const handleBillingChange = (field, value) => {
        let processedValue = value;
        if (field === 'TelefonoFacturacion') {
            processedValue = value.replace(/\D/g, '').slice(0, 11);
        } else if (field === 'RIFCedulaFacturacion') {
            processedValue = formatIdentifier(value);
        }
        setBillingData(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleParticipantChange = (index, field, value) => {
        const updatedParticipants = [...participants];
        let processedValue = value;
        if (['TelefonoCelularParticipante', 'TelefonoOficinaParticipante'].includes(field)) {
            processedValue = value.replace(/\D/g, '').slice(0, 11);
        } else if (field === 'RIFOrganizacionParticipante') {
            processedValue = formatIdentifier(value);
        } else if (field === 'IDValidadorParticipante' || field === 'CedulaParticipante') {
            processedValue = value.replace(/\D/g, '');
        } else {
            processedValue = value;
        }
        updatedParticipants[index] = { ...updatedParticipants[index], [field]: processedValue };
        setParticipants(updatedParticipants);
    };
    

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus('');
        setIsSubmitting(true);

        if (!isAirtableConfigured) {
            const message = "Error: La configuración de Airtable no está completa. Revisa las variables de entorno.";
            setSubmissionStatus(message);
            alert(message);
            setIsSubmitting(false);
            return;
        }

        // --- VALIDACIONES DE RIF Y OBLIGATORIOS (Validación selectiva de 9 dígitos) ---
        const rifJGCedulaRegex = /^[VEJP]-\d{7,10}$/; // Cédulas (V/E/P) o RIF (J) con más de 7 dígitos
        const rifJGRegex = /^[JG]-\d{9}$/; // RIF de entidad legal (J/G) deben ser 9 dígitos exactos
        
        const billingId = billingData.RIFCedulaFacturacion;
        const billingPrefix = billingId.charAt(0);

        if (/^[JG]$/.test(billingPrefix) && !rifJGRegex.test(billingId)) {
            alert('El RIF de facturación (J o G) no es válido. Debe tener una letra (J, G), un guion y **exactamente 9 dígitos (rellene con ceros a la izquierda si es necesario)**. Ej: J-001234567');
            setIsSubmitting(false);
            return;
        } else if (!/^[JG]$/.test(billingPrefix) && !rifJGCedulaRegex.test(billingId)) {
             // Validar que V/E/P sigan el formato básico (ej: V-1234567)
             alert('La Cédula o RIF (V, E, P) no es válida. Debe tener una letra (V, E, P) y un formato numérico válido. Ej: V-12345678');
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
        
        // --- VALIDACIÓN DE PARTICIPANTES ---
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
            
            // --- VALIDACIÓN DE CÉDULA ---
            if (p.CedulaParticipante.length < 8) {
                alert(`La Cédula del participante #${participantNumber} debe tener al menos 8 dígitos. Si es necesario, complete con ceros a la izquierda.`);
                setIsSubmitting(false);
                return;
            }

            if (p.IDValidadorParticipante.length !== 6) {
                alert(`El ID Validador del participante #${participantNumber} debe tener 6 dígitos.`);
                setIsSubmitting(false);
                return;
            }
            
            // Validar RIF de la Organización (aplicando la misma lógica selectiva)
            const participantRif = p.RIFOrganizacionParticipante;
            const participantPrefix = participantRif.charAt(0);
            
            if (/^[JG]$/.test(participantPrefix) && !rifJGRegex.test(participantRif)) {
                 alert(`El RIF de la Organización (J o G) del participante #${participantNumber} no es válido. Debe tener una letra (J, G), un guion y **exactamente 9 dígitos (rellene con ceros a la izquierda si es necesario)**. Ej: J-001234567`);
                 setIsSubmitting(false);
                 return;
            } else if (!/^[JG]$/.test(participantPrefix) && !rifJGCedulaRegex.test(participantRif)) {
                 alert(`El RIF/Cédula (V, E, P) de la Organización del participante #${participantNumber} no es válido. Debe tener una letra (V, E, P) y un formato numérico válido.`);
                 setIsSubmitting(false);
                 return;
            }
        }
        
        try {
            setSubmissionStatus('Validando IDs...');
            const validatorIds = participants.map(p => p.IDValidadorParticipante);

            if (new Set(validatorIds).size !== validatorIds.length) {
                alert('Error: No puedes usar el mismo ID Validador para dos participantes distintos en este registro.');
                throw new Error("ID duplicado en el formulario.");
            }

            const checkRegisteredFormula = `OR(${validatorIds.map(id => `{IDValidadorParticipante} = '${id}'`).join(',')})`;
            const existingRecords = await table.select({ filterByFormula: checkRegisteredFormula, fields: ['IDValidadorParticipante'] }).all();
            
            if (existingRecords.length > 0) {
                const registeredIds = existingRecords.map(rec => rec.get('IDValidadorParticipante')).join(', ');
                alert(`Error: El/los siguiente(s) ID Validador ya están registrados: ${registeredIds}.`);
                throw new Error("ID ya registrado.");
            }
            
            // Validar contra IDValidadorMañanaFecha1
            const checkValidityFormula = `OR(${validatorIds.map(id => `{IDValidadorMañanaFecha1} = '${id}'`).join(',')})`;
            const validIdRecords = await validationTable.select({ filterByFormula: checkValidityFormula, fields: ['IDValidadorMañanaFecha1'] }).all();
            
            if (validIdRecords.length !== validatorIds.length) {
                const foundValidIds = new Set(validIdRecords.map(rec => rec.get('IDValidadorMañanaFecha1')));
                const invalidIds = validatorIds.filter(id => !foundValidIds.has(id));
                alert(`Error: El/los siguiente(s) ID Validador no son válidos o no existen: ${invalidIds.join(', ')}.`);
                throw new Error("ID no válido.");
            }


            setSubmissionStatus('Enviando datos a Airtable...');
            const timestamp = new Date().toISOString();
            
            const recordsToInsert = participants.map(participant => {
                return {
                    fields: {
                        ...billingData, 
                        ...participant,
                        created_at: timestamp,
                        TFactura: 'Pro forma' // Valor predeterminado
                    }
                };
            });

            await table.create(recordsToInsert);

            setSubmissionStatus('¡Inscripción enviada exitosamente a Airtable!');
            alert('Formulario enviado y registrado en Airtable correctamente.');

            // --- ✅ Redirección al menú/inicio ---
            window.location.href = '/'; 

        } catch (error) {
            console.error('Error durante la validación o envío a Airtable:', error);
            const errorMessage = error.message || 'Error desconocido al procesar la inscripción.';
            if (!errorMessage.includes("ID")) {
                setSubmissionStatus(`Error: ${errorMessage}. Por favor, intente de nuevo.`);
                alert(`Error al procesar la inscripción. Por favor, intente de nuevo.`);
            } else {
                 setSubmissionStatus(`Error de validación: ${error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };


    const tableRef = useRef(null);

    // Lógica para redimensionar las columnas de la tabla
    useEffect(()=>{if(isMobile||typeof document==='undefined')return;const table=tableRef.current;if(!table)return;const cols=Array.from(table.querySelectorAll('th'));const activeResizers=[];cols.forEach((col)=>{const resizer=col.querySelector('.resize-handle');if(!resizer)return;let x=0;let w=0;const mouseDownHandler=(e)=>{e.preventDefault();x=e.clientX;w=col.offsetWidth;document.addEventListener('mousemove',mouseMoveHandler);document.addEventListener('mouseup',mouseUpHandler);resizer.classList.add('resizing');};const mouseMoveHandler=(e)=>{const dx=e.clientX-x;const newWidth=w+dx;if(newWidth>40){col.style.width=`${newWidth}px`;}};const mouseUpHandler=()=>{document.removeEventListener('mousemove',mouseMoveHandler);document.removeEventListener('mouseup',mouseUpHandler);resizer.classList.remove('resizing');};resizer.addEventListener('mousedown',mouseDownHandler);activeResizers.push({resizer,handler:mouseDownHandler});});return()=>{activeResizers.forEach(({resizer,handler})=>{if(resizer){resizer.removeEventListener('mousedown',handler);}});};},[participants.length,isMobile]);
    
    const participantTableHeaders=[{label:'#',width:'45px',isResizable:false},{label:'Nacionalidad*',width:'110px'},{label:'Cédula*',width:'110px'},{label:'Tipo Ticket*',width:'120px'},{label:'ID Validador*',width:'130px'},{label:'Nombre*',width:'180px'},{label:'Apellido*',width:'180px'},{label:'Tel. Celular*',width:'140px'},{label:'Tel. Oficina',width:'140px'},{label:'Email*',width:'240px'},{label:'Organización*',width:'220px'},{label:'RIF*',width:'130px'},{label:'Cargo en la empresa*',width:'200px'},{label:'Sector de la empresa*',width:'190px'}];
    
    const renderParticipantCards=()=>{return(<div className="participants-cards">{participants.map((participant,index)=>(<div key={`card-${index}`} className="participant-card"><div className="participant-card-header">Participante #{index+1}</div><div className="participant-card-grid"><div className="participant-field"><label htmlFor={`participant-${index}-NacionalidadParticipante-card`}>Nacionalidad<span style={{color:'red'}}>*</span></label><select id={`participant-${index}-NacionalidadParticipante-card`} name={`participant-${index}-NacionalidadParticipante`} value={participant.NacionalidadParticipante} onChange={(e)=>handleParticipantChange(index,'NacionalidadParticipante',e.target.value)} className="form-select" required><option value="V">V</option><option value="E">E</option><option value="P">P</option></select></div><div className="participant-field"><label htmlFor={`participant-${index}-CedulaParticipante-card`}>Cédula<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-CedulaParticipante-card`} name={`participant-${index}-CedulaParticipante`} type="text" value={participant.CedulaParticipante} onChange={(e)=>handleParticipantChange(index,'CedulaParticipante',e.target.value)} className="form-input" placeholder="Ej: 12345678" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-TipoTicketParticipante-card`}>Tipo de Ticket<span style={{color:'red'}}>*</span></label><select id={`participant-${index}-TipoTicketParticipante-card`} name={`participant-${index}-TipoTicketParticipante`} value={participant.TipoTicketParticipante} onChange={(e)=>handleParticipantChange(index,'TipoTicketParticipante',e.target.value)} className="form-select" required><option value="Venta">Venta</option><option value="Cortesia">Cortesía</option></select></div><div className="participant-field"><label htmlFor={`participant-${index}-IDValidadorParticipante-card`}>ID Validador<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-IDValidadorParticipante-card`} name={`participant-${index}-IDValidadorParticipante`} type="text" value={participant.IDValidadorParticipante} onChange={(e)=>handleParticipantChange(index,'IDValidadorParticipante',e.target.value)} className="form-input" placeholder={participant.TipoTicketParticipante==='Cortesia'?'Código de 6 dígitos':'Código de 6 dígitos'} maxLength="6" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-NombreParticipante-card`}>Nombre<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-NombreParticipante-card`} name={`participant-${index}-NombreParticipante`} type="text" value={participant.NombreParticipante} onChange={(e)=>handleParticipantChange(index,'NombreParticipante',e.target.value)} className="form-input" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-ApellidoParticipante-card`}>Apellido<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-ApellidoParticipante-card`} name={`participant-${index}-ApellidoParticipante`} type="text" value={participant.ApellidoParticipante} onChange={(e)=>handleParticipantChange(index,'ApellidoParticipante',e.target.value)} className="form-input" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-TelefonoCelularParticipante-card`}>Teléfono Celular<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-TelefonoCelularParticipante-card`} name={`participant-${index}-TelefonoCelularParticipante`} type="tel" value={participant.TelefonoCelularParticipante} onChange={(e)=>handleParticipantChange(index,'TelefonoCelularParticipante',e.target.value)} className="form-input" placeholder="04141234567" maxLength="11" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-TelefonoOficinaParticipante-card`}>Teléfono Oficina</label><input id={`participant-${index}-TelefonoOficinaParticipante-card`} name={`participant-${index}-TelefonoOficinaParticipante`} type="tel" value={participant.TelefonoOficinaParticipante} onChange={(e)=>handleParticipantChange(index,'TelefonoOficinaParticipante',e.target.value)} className="form-input" placeholder="02121234567" maxLength="11"/></div><div className="participant-field full-width"><label htmlFor={`participant-${index}-EmailParticipante-card`}>Email<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-EmailParticipante-card`} name={`participant-${index}-EmailParticipante`} type="email" value={participant.EmailParticipante} onChange={(e)=>handleParticipantChange(index,'EmailParticipante',e.target.value)} className="form-input" placeholder="usuario@dominio.com" required/></div><div className="participant-field full-width"><label htmlFor={`participant-${index}-NombreOrganizacionParticipante-card`}>Nombre de la Organización<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-NombreOrganizacionParticipante-card`} name={`participant-${index}-NombreOrganizacionParticipante`} type="text" value={participant.NombreOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'NombreOrganizacionParticipante',e.target.value)} className="form-input" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-RIFOrganizacionParticipante-card`}>RIF de la Organización<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-RIFOrganizacionParticipante-card`} name={`participant-${index}-RIFOrganizacionParticipante`} type="text" value={participant.RIFOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'RIFOrganizacionParticipante',e.target.value)} className="form-input" placeholder="J-001234567" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-CargoOrganizacionParticipante-card`}>Cargo en la Organización<span style={{color:'red'}}>*</span></label><input id={`participant-${index}-CargoOrganizacionParticipante-card`} name={`participant-${index}-CargoOrganizacionParticipante`} type="text" value={participant.CargoOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'CargoOrganizacionParticipante',e.target.value)} className="form-input" required/></div><div className="participant-field"><label htmlFor={`participant-${index}-SectorOrganizacionParticipante-card`}>Sector de la Organización<span style={{color:'red'}}>*</span></label><select id={`participant-${index}-SectorOrganizacionParticipante-card`} name={`participant-${index}-SectorOrganizacionParticipante`} value={participant.SectorOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'SectorOrganizacionParticipante',e.target.value)} className="form-select" required><option value="">Seleccione</option>{sectores.map(sector=>(<option key={`${index}-card-${sector}`} value={sector}>{sector}</option>))}</select></div></div></div>))}</div>);};
    
    const renderParticipantsTable=()=>{return(<div className="table-wrapper"><table className="participants-table" ref={tableRef}><thead><tr>{participantTableHeaders.map((headerInfo,idx)=>(<th key={`th-${idx}`} style={{position:'relative',whiteSpace:'nowrap',width:headerInfo.width}}>{headerInfo.label.endsWith('*')? <>{headerInfo.label.slice(0,-1)}<span style={{color:'red'}}>*</span></> : headerInfo.label}{(headerInfo.isResizable!==false&&idx>0)&&<div className="resize-handle"></div>}</th>))}</tr></thead><tbody>{participants.map((participant,index)=>(<tr key={`tr-${index}`}><td>{index+1}</td><td><select name={`participant-${index}-NacionalidadParticipante`} aria-label={`Nacionalidad participante ${index+1}`} value={participant.NacionalidadParticipante} onChange={(e)=>handleParticipantChange(index,'NacionalidadParticipante',e.target.value)} className="form-select compact" required><option value="V">V</option><option value="E">E</option><option value="P">P</option></select></td><td><input name={`participant-${index}-CedulaParticipante`} aria-label={`Cédula participante ${index+1}`} type="text" value={participant.CedulaParticipante} onChange={(e)=>handleParticipantChange(index,'CedulaParticipante',e.target.value)} className="form-input compact" placeholder="Ej: 12345678" required/></td><td><select name={`participant-${index}-TipoTicketParticipante`} aria-label={`Tipo de ticket participante ${index+1}`} value={participant.TipoTicketParticipante} onChange={(e)=>handleParticipantChange(index,'TipoTicketParticipante',e.target.value)} className="form-select compact" required><option value="Venta">Venta</option><option value="Cortesia">Cortesía</option></select></td><td><input name={`participant-${index}-IDValidadorParticipante`} aria-label={`ID Validador participante ${index+1}`} type="text" value={participant.IDValidadorParticipante} onChange={(e)=>handleParticipantChange(index,'IDValidadorParticipante',e.target.value)} className="form-input compact" placeholder="6 dígitos" maxLength="6" required/></td><td><input name={`participant-${index}-NombreParticipante`} aria-label={`Nombre participante ${index+1}`} type="text" value={participant.NombreParticipante} onChange={(e)=>handleParticipantChange(index,'NombreParticipante',e.target.value)} className="form-input compact" required/></td><td><input name={`participant-${index}-ApellidoParticipante`} aria-label={`Apellido participante ${index+1}`} type="text" value={participant.ApellidoParticipante} onChange={(e)=>handleParticipantChange(index,'ApellidoParticipante',e.target.value)} className="form-input compact" required/></td><td><input name={`participant-${index}-TelefonoCelularParticipante`} aria-label={`Teléfono celular participante ${index+1}`} type="tel" value={participant.TelefonoCelularParticipante} onChange={(e)=>handleParticipantChange(index,'TelefonoCelularParticipante',e.target.value)} className="form-input compact" placeholder="04141234567" maxLength="11" required/></td><td><input name={`participant-${index}-TelefonoOficinaParticipante`} aria-label={`Teléfono oficina participante ${index+1}`} type="tel" value={participant.TelefonoOficinaParticipante} onChange={(e)=>handleParticipantChange(index,'TelefonoOficinaParticipante',e.target.value)} className="form-input compact" placeholder="02121234567" maxLength="11"/></td><td><input name={`participant-${index}-EmailParticipante`} aria-label={`Email participante ${index+1}`} type="email" value={participant.EmailParticipante} onChange={(e)=>handleParticipantChange(index,'EmailParticipante',e.target.value)} className="form-input compact" placeholder="usuario@dominio.com" required/></td><td><input name={`participant-${index}-NombreOrganizacionParticipante`} aria-label={`Nombre organización participante ${index+1}`} type="text" value={participant.NombreOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'NombreOrganizacionParticipante',e.target.value)} className="form-input compact" required/></td><td><input name={`participant-${index}-RIFOrganizacionParticipante`} aria-label={`RIF organización participante ${index+1}`} type="text" value={participant.RIFOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'RIFOrganizacionParticipante',e.target.value)} className="form-input compact" placeholder="J-001234567" required/></td><td><input name={`participant-${index}-CargoOrganizacionParticipante`} aria-label={`Cargo organización participante ${index+1}`} type="text" value={participant.CargoOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'CargoOrganizacionParticipante',e.target.value)} className="form-input compact" required/></td><td><select name={`participant-${index}-SectorOrganizacionParticipante`} aria-label={`Sector organización participante ${index+1}`} value={participant.SectorOrganizacionParticipante} onChange={(e)=>handleParticipantChange(index,'SectorOrganizacionParticipante',e.target.value)} className="form-select compact" required><option value="">Seleccione</option>{sectores.map(sector=>(<option key={`${index}-table-${sector}`} value={sector}>{sector}</option>))}</select></td></tr>))}</tbody></table></div>);};

    const isBillingDataReady = billingData.RIFCedulaFacturacion && billingData.RIFCedulaFacturacion.length >= 2 && billingData.DenominacionFiscalFacturacion.trim() !== '';

    return (
        <div className="container">
            <div className="form-wrapper">
                <div className="header-card">
                    <div className="logo-container"><img src={logoA} className="App-logo" alt="logo" /></div>
                    <h1>Asociación Bancaria de Venezuela</h1>
                    <h2>Formulario para Inscripción Abogacia 4.0</h2>
                    <h2>19 de noviembre de 2025 - 8:00 a.m. a 12:00 p.m.</h2>
                </div>
                <form onSubmit={handleSubmit} className="form-content">
                    <div className="section-card">
                        <div className="section-header">
                            <div className="section-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                            <h3 className="section-title">Número de Participantes</h3>
                        </div>
                        <div className="form-group" style={{padding:'20px 30px'}}>
                            <label htmlFor="numParticipants">Indique el número de participantes a inscribir:<span style={{color:'red'}}>*</span></label>
                            <input type="number" id="numParticipants" name="numParticipants" className="form-input" value={numParticipants} onChange={handleNumParticipantsChange} min="1" max="10" required aria-describedby="numParticipantsHelp"/>
                            <small id="numParticipantsHelp" className="form-text text-muted">Mínimo 1, máximo 10 participantes.</small>
                        </div>
                    </div>
                    <div className="section-card">
                        <div className="section-header">
                            <div className="section-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg></div>
                            <h3 className="section-title">Datos de Facturación</h3>
                        </div>
                        <div className="billing-fields">
                            <div className="form-group">
                                <label htmlFor="RIFCedulaFacturacion">RIF o Cédula:<span style={{color:'red'}}>*</span></label>
                                <input type="text" id="RIFCedulaFacturacion" name="RIFCedulaFacturacion" className="form-input" value={billingData.RIFCedulaFacturacion} onChange={(e)=>handleBillingChange('RIFCedulaFacturacion',e.target.value)} placeholder="Ej: V-12345678 o J-001234567" required/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="DenominacionFiscalFacturacion">Denominación Fiscal:<span style={{color:'red'}}>*</span></label>
                                <input type="text" id="DenominacionFiscalFacturacion" name="DenominacionFiscalFacturacion" className="form-input" value={billingData.DenominacionFiscalFacturacion} onChange={(e)=>handleBillingChange('DenominacionFiscalFacturacion',e.target.value)} required/>
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="DireccionFiscalFacturacion">Dirección Fiscal:<span style={{color:'red'}}>*</span></label>
                                <input type="text" id="DireccionFiscalFacturacion" name="DireccionFiscalFacturacion" className="form-input" value={billingData.DireccionFiscalFacturacion} onChange={(e)=>handleBillingChange('DireccionFiscalFacturacion',e.target.value)} required/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="TelefonoFacturacion">Teléfono:<span style={{color:'red'}}>*</span></label>
                                <input type="tel" id="TelefonoFacturacion" name="TelefonoFacturacion" className="form-input" value={billingData.TelefonoFacturacion} onChange={(e)=>handleBillingChange('TelefonoFacturacion',e.target.value)} placeholder="02121234567" maxLength="11" required/>
                            </div>
                            <div className="form-group">
                                <label htmlFor="SectorOrganizacionFacturacion">Sector de la Organización:<span style={{color:'red'}}>*</span></label>
                                <select id="SectorOrganizacionFacturacion" name="SectorOrganizacionFacturacion" className="form-select" value={billingData.SectorOrganizacionFacturacion} onChange={(e)=>handleBillingChange('SectorOrganizacionFacturacion',e.target.value)} required>
                                    <option value="">Seleccione un sector</option>
                                    {sectores.map(sector=>(<option key={`billing-${sector}`} value={sector}>{sector}</option>))}
                                </select>
                            </div>
                            
                            {/* --- CÓDIGO CORREGIDO Y SIMPLIFICADO --- */}
                            <div className="form-group">
                                <label>Adjuntar RIF (Imagen/PDF)<span style={{color:'red'}}>*</span></label>
                                <a
                                    href="mailto:" // Abre el cliente de correo por defecto
                                    className="submit-button" // Reutiliza los estilos de tu botón
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-block',
                                        textDecoration: 'none',
                                        color: 'white',
                                        textAlign: 'center',
                                        marginTop: '5px',
                                        padding: '10px 15px',
                                        borderRadius: '5px'
                                    }}
                                >
                                    Abrir Correo para Adjuntar
                                </a>
                                <small className="form-text text-muted">
                                    Por favor, en caso de que tenga habilitado protecciones en el navegador envíe el RIF a: <strong>abv.gemini.ia@gmail.com</strong>
                                </small>
                            </div>
                        </div>
                    </div>
                    <div className="section-card">
                        <div className="section-header">
                            <div className="section-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>
                            <h3 className="section-title">Datos de los Participantes</h3>
                        </div>
                        {isMobile?renderParticipantCards():renderParticipantsTable()}
                    </div>
                    {submissionStatus&&(<div className={`submission-status ${submissionStatus.startsWith('Error')?'error':'success'}`}>{submissionStatus}</div>)}
                    <div className="submit-container">
                        <button type="submit" className="submit-button" disabled={isSubmitting}>{isSubmitting?'Validando y Enviando...':'Enviar Inscripción'}</button>
                    </div>
                </form>
                <div className="footer">
                    <p>Los campos marcados con <span style={{color:'red'}}>*</span> son obligatorios</p>
                    <p><small>* El RIF/Cédula (V, E, P) acepta su formato usual. Los RIFs de organización (**J, G**) deben tener una letra inicial, un guion y **9 dígitos** (rellene con ceros a la izquierda si es necesario). Ej: **J-001234567**.</small></p>
                    <p><small>* El campo ID Validador es OBLIGATORIO (6 dígitos). No se permiten IDs duplicados o que no estén en la lista de IDs válidos.</small></p>
                </div>
            </div>
        </div>
    );
};

export default FormABV2;
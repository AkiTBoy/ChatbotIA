require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.warn('ADVERTENCIA: La variable de entorno GEMINI_API_KEY no está configurada.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey || '');

const systemInstruction = `Eres el asistente virtual oficial de Ciudad Plástika (CDPK), empresa líder en servicios y soluciones tecnológicas integrales con sede en Pachuca de Soto, Hidalgo, México.

Tu objetivo principal es atender a prospectos y clientes a través de WhatsApp, brindando información clara, profesional, cálida y concisa sobre la empresa y todo su catálogo de servicios tecnológicos.

INFORMACIÓN INSTITUCIONAL DE CIUDAD PLÁSTIKA (CDPK):
- Nombre de la empresa: Ciudad Plástika (identificada comúnmente por sus siglas CDPK).
- Ubicación / Sede central: Pachuca de Soto, Hidalgo, México.
- Alcance de cobertura: Atención presencial y en sitio en Pachuca de Soto, Mineral de la Reforma y zona metropolitana del estado de Hidalgo; soporte técnico, consultoría y soluciones de software de forma remota a nivel nacional.
- Misión y enfoque: Brindar soluciones integrales de tecnología adaptadas a cada necesidad, optimizando procesos, resolviendo incidencias y asegurando la continuidad operativa tanto de empresas como de usuarios particulares mediante un servicio cercano y altamente calificado.
- Tipos de clientes que atiende: Empresas corporativas, medianos negocios, PyMEs, instituciones, profesionistas independientes y particulares.

CATÁLOGO COMPLETO DE SERVICIOS Y SOLUCIONES DE CDPK:
1. Soporte Técnico y Mantenimiento TI:
   - Mantenimiento preventivo y correctivo para computadoras de escritorio, laptops y estaciones de trabajo.
   - Pólizas de mantenimiento y soporte técnico mensual o anual para empresas y oficinas.
   - Diagnóstico de fallas de hardware y reemplazo de componentes (discos de estado sólido SSD, memoria RAM, fuentes de poder, placas base).
   - Optimización de velocidad, limpieza de virus/malware, formateo e instalación de sistemas operativos y programas de oficina.

2. Infraestructura de Redes y Conectividad:
   - Diseño, cableado estructurado (voz y datos) y peinado de racks.
   - Instalación y optimización de redes Wi-Fi empresariales y domésticas, repetidores, access points y enlaces inalámbricos punto a punto.
   - Configuración y administración de routers, switches, balanceadores y firewalls.
   - Implementación, configuración y mantenimiento de servidores locales (Windows Server, Linux) y entornos en la nube.

3. Ciberseguridad, Respaldo y Continuidad Operativa:
   - Implementación de suites de antivirus y seguridad para endpoints corporativos.
   - Configuración de sistemas de copias de seguridad automatizadas (backups locales y respaldos cifrados en la nube).
   - Políticas de seguridad, prevención contra ataques de phishing, malware y ransomware.
   - Asistencia en recuperación de datos y planes de recuperación ante desastres (DRP).

4. Desarrollo de Software y Transformación Digital:
   - Diseño y desarrollo de sitios web corporativos, tiendas en línea (e-commerce) y landing pages de alta conversión.
   - Desarrollo de sistemas a la medida para control interno, inventarios, punto de venta y gestión administrativa.
   - Automatización de flujos de trabajo, integración de APIs y desarrollo de asistentes virtuales e integraciones con Inteligencia Artificial.

5. Consultoría Tecnológica y Suministro de Equipamiento:
   - Asesoría estratégica para modernización, adquisición y renovación de equipo tecnológico en oficinas y negocios.
   - Auditorías y diagnósticos del estado tecnológico actual de empresas.
   - Venta, cotización y configuración de equipo de cómputo, servidores, accesorios y periféricos de gama profesional.

MODALIDADES DE ATENCIÓN:
- En Sitio / Presencial: Visitas técnicas en Pachuca y zona metropolitana para diagnóstico, instalaciones físicas, cableado y mantenimiento.
- Remoto: Soporte inmediato a través de software seguro de control remoto para configuración de software, resolución de errores lógicos y asesorías.

REGLAS DE ATENCIÓN Y COMPORTAMIENTO EN WHATSAPP:
1. Tono y Personalidad: Cordial, servicial, profesional, empático y respetuoso (español de México).
2. Formato adecuado para WhatsApp: Proporciona respuestas claras, concisas y directas sin rodeos innecesarios. Usa viñetas breves cuando listes servicios o recomendaciones para que la lectura sea ágil en dispositivos móviles.
3. Precios y Cotizaciones: No inventes tarifas exactas, costos de pólizas ni tiempos de entrega fijos, ya que cada proyecto requiere una evaluación de las necesidades técnicas del cliente. Explica en qué consiste la solución y resalta sus beneficios.
4. Activación de Tickets de Soporte: Si el usuario reporta una falla técnica, error, caída de sistema o necesita levantar un ticket, indícale explícitamente que escriba únicamente la palabra "Soporte" (o seleccione el botón correspondiente) para iniciar el registro de su caso. No sugieras ninguna otra palabra clave.
5. Derivación a Asesor Humano: Si el cliente solicita una cotización formal de proyecto, diagnóstico técnico complejo, contratación de pólizas de soporte, atención urgente o cualquier trámite específico que requiera evaluación personalizada, invítalo amablemente a contactar a un asesor humano (o seleccionar la opción de hablar con un asesor en el menú de WhatsApp).`;

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction
});

app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      mensaje: 'Formato JSON inválido en el cuerpo de la petición.'
    });
  }
  next(err);
});

const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      mensaje: 'Acceso no autorizado. Se requiere un header Authorization con formato Bearer <token>.'
    });
  }

  const tokenRecibido = authHeader.split(' ')[1];
  const tokenEsperado = process.env.API_SECRET_TOKEN;

  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return res.status(401).json({
      status: 'error',
      mensaje: 'Acceso no autorizado. El token proporcionado es inválido.'
    });
  }

  next();
};

app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'online',
    servicio: 'Webhook Typebot - Google Gemini',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ia-responder', autenticarToken, async (req, res) => {
  try {
    const { ticket_id, pregunta } = req.body;

    if (!pregunta || typeof pregunta !== 'string' || pregunta.trim() === '') {
      return res.status(400).json({
        status: 'error',
        mensaje: 'El parámetro "pregunta" es obligatorio y debe ser una cadena de texto no vacía.'
      });
    }

    let promptCompleto = '';
    if (ticket_id) {
      promptCompleto += `Ticket ID: ${ticket_id}\n`;
    }
    promptCompleto += `Pregunta del usuario: ${pregunta.trim()}`;

    const resultado = await model.generateContent(promptCompleto);
    const respuestaTexto = resultado.response.text();

    return res.status(200).json({
      status: 'success',
      respuesta: respuestaTexto.trim()
    });

  } catch (error) {
    console.error('Error interno al generar respuesta con Gemini:', error);
    return res.status(500).json({
      status: 'error',
      mensaje: 'Ocurrió un error interno en el servidor al procesar la solicitud con IA.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor webhook intermediario escuchando en el puerto ${PORT}`);
});

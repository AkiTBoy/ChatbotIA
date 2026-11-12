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

const systemInstruction = `Eres el asistente virtual oficial y amable de **Ciudad Plástika (CDPK)**, empresa de servicios tecnológicos ubicada en **Pachuca de Soto, Hidalgo, México**.
Tu objetivo es atender a clientes y prospectos por WhatsApp brindando información clara, profesional, directa y concisa sobre la empresa y sus soluciones tecnológicas.

Información de la empresa que debes utilizar como base:
- **Giro y Especialidad:** Empresa dedicada a servicios y soluciones tecnológicas integrales para empresas, negocios y particulares (soporte técnico, infraestructura TI, desarrollo/implementación de software, redes, seguridad informática y consultoría tecnológica).
- **Ubicación:** Pachuca de Soto, Hidalgo, México (con atención local y remota según el servicio).
- **Enfoque:** Atención personalizada a clientes corporativos, PyMEs y usuarios finales que buscan optimizar, implementar o dar mantenimiento a sus sistemas tecnológicos.

Reglas de comportamiento:
1. **Dudas generales:** Responde de forma cordial, breve y directa (ideal para lectura rápida en WhatsApp). Usa viñetas si listas varios servicios. No inventes costos exactos ni tiempos de entrega si no están confirmados.
2. **Activación de Tickets de Soporte:** Si el usuario reporta una falla técnica, error, caída de sistema o necesita levantar un ticket, indícale explícitamente que escriba únicamente la palabra **"Soporte"** (o seleccione el botón correspondiente) para iniciar el registro de su caso. No sugieras ninguna otra palabra clave.
3. **Derivación a Asesor Humano:** Si el cliente solicita una cotización formal de proyecto, contratación de pólizas, atención comercial o un trámite administrativo complejo, invítalo amablemente a contactar a un **asesor humano**.`;

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

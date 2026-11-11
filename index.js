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

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: 'Eres un asistente virtual de soporte técnico servicial, amable y conciso. Responde en un solo párrafo corto sin rodeos. Si no sabes la respuesta o detectas que el problema requiere intervención manual, indica amablemente que escalarás el caso a un agente humano.'
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

/**
 * API SERVERLESS - PROXY PARA GEMINI AI
 * Este archivo corre exclusivamente en los servidores de Vercel (Node.js).
 * Permite ocultar la API KEY del navegador del usuario.
 */

export default async function handler(req, res) {
    // Solo permitimos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    try {
        // Obtenemos el prompt enviado desde el frontend
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'El campo prompt es obligatorio.' });
        }

        // Recuperamos la API Key desde las variables de entorno de Vercel
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Configuración fallida: GEMINI_API_KEY no encontrada en el servidor.' });
        }

        // Llamada interna de servidor a servidor (Segura)
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await geminiResponse.json();

        // Enviamos la respuesta de vuelta al frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error('Error en el Proxy de Gemini:', error);
        return res.status(500).json({ error: 'Error interno al procesar la IA.' });
    }
}

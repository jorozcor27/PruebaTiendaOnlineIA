/**
 * Lógica del Asistente Virtual - Fase 3: IA Multidatos con Seguridad Admin
 * Implementación final con seguridad por roles.
 */

// Gemini se maneja ahora a través del Proxy de Vercel (/api/chat)

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.classList.toggle('active');
    }
}

function appendMessage(text, isAi = true) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isAi ? 'message-ai' : 'message-user'}`;
    
    if (isAi) {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        messageDiv.textContent = text;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (text === '' || !input) return;
    
    appendMessage(text, false);
    input.value = '';
    showTyping(true);
    
    try {
        // 1. Identificar rol del usuario actual
        const userStr = localStorage.getItem('currentUser');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        const isAdmin = currentUser && (currentUser.rol === 'Admin' || currentUser.rol === 'Administrador');

        // 2. Obtener Inventario (Para todos)
        const { data: products } = await supabaseClient
            .from('producto')
            .select('nombre, descripcion, precio, stock');

        const contextProd = products ? products.map(p => 
            `- ${p.nombre}: $${p.precio}. Stock: ${p.stock}`
        ).join('\n') : "Sin stock disponible.";

        // 3. Obtener Usuarios (SOLO SI ES ADMIN)
        let contextUsers = "ACCESO DENEGADO: El usuario actual no tiene rango de administrador.";
        if (isAdmin) {
            const { data: users } = await supabaseClient
                .from('usuario')
                .select('nombre, email, rol:rol_id(nombre)');
            
            contextUsers = users ? users.map(u => 
                `- ${u.nombre} (${u.email}). Rol: ${u.rol?.nombre}`
            ).join('\n') : "No hay usuarios registrados.";
        }

        // 4. Llamar al Proxy Seguro de Vercel (en lugar de llamar a Google directamente)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `Eres el Asistente Virtual experto de la tienda "La Última Maravilla". 
                        Responde de forma concisa e industrial.
                        
                        CONTEXTO TÉCNICO:
                        - Usuario actual: ${currentUser?.nombre || 'Invitado'}
                        - Rango de Administrador: ${isAdmin ? 'ACTIVADO' : 'DESACTIVADO'}

                        INVENTARIO DE PRODUCTOS:
                        ${contextProd}

                        BASE DE DATOS DE PERSONAL (CONFIDENCIAL):
                        ${contextUsers}

                        INSTRUCCIONES DE FORMATO:
                        1. Si preguntan por productos, responde ÚNICAMENTE con el NOMBRE y el STOCK (Ej: "Laptop Pro X1 - Stock: 5"). No des precios ni descripciones.
                        2. Si el usuario es ADMIN y pregunta por personal, usa una tabla: NOMBRE | EMAIL | ROL.
                        3. Si el usuario NO es ADMIN y pregunta por personal, informa que se requiere autorización nivel Admin.
                        
                        PREGUNTA DEL CLIENTE: ${text}`
            })
        });

        if (!response.ok) throw new Error("Error en el núcleo de IA");

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error de procesamiento.";
        
        showTyping(false);
        appendMessage(aiText, true);
        
        // --- VOZ DE RESPUESTA ---
        speakText(aiText);

    } catch (error) {
        console.error(error);
        showTyping(false);
        appendMessage(`SISTEMA: Error de seguridad o conexión técnica.`);
    }
}

// Función para convertir texto a voz (Speech Synthesis) - Global
window.speakText = function(text) {
    if (!('speechSynthesis' in window)) return;

    // Limpiamos el markdown
    let cleanText = text
        .replace(/[*#_~`>]/g, '')
        .replace(/\|/g, ' ')
        .replace(/\[.*?\]\(.*?\)/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Intentar buscar una voz más natural (Google o Premium)
    const voices = window.speechSynthesis.getVoices();
    // Prioridad: Google Español, Microsoft Helena, o cualquiera que contenga "Spanish" o "es-"
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('es')) || 
                           voices.find(v => v.lang.includes('es-ES') && v.name.includes('Premium')) ||
                           voices.find(v => v.lang.startsWith('es'));
    
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    utterance.lang = 'es-ES';
    utterance.rate = 0.95; // Un poco más lento suele sonar más natural
    utterance.pitch = 1.0;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
};

function showTyping(show) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        if (show) indicator.classList.add('active');
        else indicator.classList.remove('active');
    }
}

// Enviar con Enter
document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Inicializar voz en el chat (Solo si estamos en la tienda)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initVoiceRecognition === 'function' && document.getElementById('voiceChatBtn')) {
        initVoiceRecognition('voiceChatBtn', 'chatInput', (text) => {
            // Intentamos procesar como comando primero
            const esComando = typeof procesarComandoVoz === 'function' ? procesarComandoVoz(text) : false;
            
            // Si no fue un comando de carrito, lo enviamos como mensaje al asistente
            if (!esComando) {
                sendMessage(); 
            } else {
                // Si fue comando, limpiamos el input del chat
                const chatInput = document.getElementById('chatInput');
                if (chatInput) chatInput.value = '';
            }
        });
    }
});

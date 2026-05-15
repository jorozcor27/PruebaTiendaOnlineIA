/**
 * LÓGICA DE LA TIENDA PÚBLICA (Catálogo de Productos)
 * Este archivo asume que el objeto `supabaseClient` ya fue inicializado
 * en `app.js` y está disponible para usarse aquí.
 */

// Variable global para almacenar todos los productos obtenidos de la BD
let todosLosProductos = [];

// ==========================================
// 1. GESTIÓN DE LA INTERFAZ Y SESIÓN (NAVBAR)
// ==========================================
function actualizarInterfazUsuario() {
    const userStr = localStorage.getItem('currentUser');
    const authBtn = document.getElementById('authButton');
    const userNameDisplay = document.getElementById('userNameDisplay');

    // Si el usuario está logueado
    if (userStr) {
        const user = JSON.parse(userStr);
        userNameDisplay.textContent = `Hola, ${user.nombre}`;
        authBtn.textContent = 'Cerrar Sesión';
        // Cambiamos la función del botón para que cierre sesión en lugar de ir a login
        authBtn.onclick = logout; // La función logout viene de app.js
        authBtn.classList.replace('btn-primary', 'btn-secondary');

        // Mostrar menú de administración si el usuario tiene los permisos (Admin o Administrador)
        const rolNormalizado = user.rol ? user.rol.toLowerCase() : '';
        if (rolNormalizado === 'admin' || rolNormalizado === 'administrador') {
            const adminMenu = document.getElementById('adminMenu');
            const sidebarToggle = document.getElementById('sidebarToggle');
            const sidebarUserName = document.getElementById('sidebarUserName');
            const sidebarUserRole = document.getElementById('sidebarUserRole');

            if (adminMenu) adminMenu.style.display = 'flex';
            if (sidebarToggle) {
                sidebarToggle.style.display = 'flex';
                // Aseguramos que sea visible forzando el estilo si es necesario
                sidebarToggle.style.setProperty('display', 'flex', 'important');
            }
            if (sidebarUserName) sidebarUserName.textContent = user.nombre;
            if (sidebarUserRole) sidebarUserRole.textContent = user.rol;
        }

    } else {
        // Si es un visitante anónimo
        userNameDisplay.textContent = 'Invitado';
        authBtn.textContent = 'Acceder / Registrarse';
        authBtn.onclick = () => window.location.href = 'login.html';
    }
}

// ==========================================
// 2. OBTENER Y MOSTRAR CATEGORÍAS (FILTROS)
// ==========================================
async function cargarCategorias() {
    try {
        // Hacemos un SELECT a la tabla categoria en Supabase
        const { data: categorias, error } = await supabaseClient
            .from('categoria')
            .select('id, nombre');

        if (error) throw error;

        const contenedorFiltros = document.getElementById('categoryFilters');

        // Iteramos sobre las categorías devueltas y creamos un botón por cada una
        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = cat.nombre;
            // Al hacer clic, filtramos pasando el ID de la categoría
            btn.onclick = (e) => {
                // Quitar la clase 'active' de todos los botones
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                // Poner la clase 'active' al botón cliqueado
                e.target.classList.add('active');

                filtrarProductos(cat.id);
            };
            contenedorFiltros.appendChild(btn);
        });
    } catch (error) {
        console.error('Error al cargar categorías:', error.message);
    }
}

// ==========================================
// 3. OBTENER Y MOSTRAR PRODUCTOS (CATÁLOGO)
// ==========================================
async function cargarProductos() {
    try {
        // Consultamos la tabla producto. Hacemos un "join" automático con categoria
        // para traernos el nombre de la categoría del producto (categoria:categoria_id(nombre))
        const { data: productos, error } = await supabaseClient
            .from('producto')
            .select(`
                id, 
                sku,
                nombre, 
                descripcion, 
                precio, 
                imagen_url,
                categoria_id,
                categoria:categoria_id(nombre)
            `);

        if (error) throw error;

        // Guardamos los productos en memoria para poder filtrarlos rápido sin volver a llamar a la base de datos
        todosLosProductos = productos;

        // Mostramos todos los productos inicialmente (sin filtro)
        filtrarProductos(null);

    } catch (error) {
        console.error('Error al cargar productos:', error.message);
        document.getElementById('productsGrid').innerHTML = '<p style="color: red;">Ocurrió un error al cargar el catálogo.</p>';
    }
}

// Función que dibuja las tarjetas en el HTML basándose en una lista de productos
function renderizarProductos(productosFiltrados) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = ''; // Limpiamos el grid antes de pintar

    if (productosFiltrados.length === 0) {
        grid.innerHTML = '<p>No hay productos en esta categoría.</p>';
        return;
    }

    productosFiltrados.forEach(prod => {
        // Obtenemos el nombre de la categoría de forma segura
        const categoriaNombre = prod.categoria ? prod.categoria.nombre : 'Sin Categoría';

        // Si no tiene imagen url, usamos un placeholder genérico
        const imageUrl = prod.imagen_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen';

        // Creamos la estructura HTML de la tarjeta (Card)
        const divCard = document.createElement('div');
        divCard.className = 'product-card fade-in';
        divCard.innerHTML = `
            <img src="${imageUrl}" alt="${prod.nombre}" class="product-image">
            <div class="product-info">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="product-category">${categoriaNombre}</span>
                    <span class="product-sku" title="Código para voz">ID: ${prod.sku || 'N/A'}</span>
                </div>
                <h3 class="product-title">${prod.nombre}</h3>
                <p class="product-desc">${prod.descripcion || 'Sin descripción'}</p>
                
                <div class="product-footer">
                    <span class="product-price">$${prod.precio.toFixed(2)}</span>
                    <button class="btn btn-primary" style="width: auto; padding: 12px 24px;" onclick="agregarAlCarrito('${prod.id}', '${prod.nombre}', ${prod.precio})">
                        Añadir
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(divCard);
    });
}

// Función para filtrar los productos en memoria cuando se presiona un botón de categoría
function filtrarProductos(categoriaId) {
    // Si categoriaId es null, significa "Todas", devolvemos todos los productos
    if (categoriaId === null) {
        // Restaurar botón "Todas" como activo si se llama programáticamente
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const btnTodas = document.querySelector('.filter-btn');
        if (btnTodas) btnTodas.classList.add('active');

        renderizarProductos(todosLosProductos);
    } else {
        // Filtramos usando el ID de la categoría
        const filtrados = todosLosProductos.filter(p => p.categoria_id === categoriaId);
        renderizarProductos(filtrados);
    }
}

// ==========================================
// 4. LÓGICA DEL CARRITO DE COMPRAS (LOCALSTORAGE)
// ==========================================
function obtenerCarrito() {
    // Intentamos buscar el carrito en el LocalStorage, si no existe retornamos un arreglo vacío
    const carritoGuardado = localStorage.getItem('miCarrito');
    return carritoGuardado ? JSON.parse(carritoGuardado) : [];
}

function actualizarContadorCarrito() {
    const carrito = obtenerCarrito();
    // Sumamos todas las cantidades de los productos para poner el numerito arriba en el navbar
    const cantidadTotal = carrito.reduce((acumulador, item) => acumulador + item.cantidad, 0);
    document.getElementById('cartCount').textContent = cantidadTotal;
}

// Esta función se ejecuta cuando el cliente hace clic en "+ Añadir" en un producto
function agregarAlCarrito(id, nombre, precio) {
    let carrito = obtenerCarrito();

    // Verificamos si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.id === id);

    if (itemExistente) {
        // Si ya existe, simplemente le sumamos 1 a su cantidad
        itemExistente.cantidad += 1;
    } else {
        // Si es un producto nuevo en el carrito, lo agregamos con cantidad 1
        carrito.push({
            id: id,
            nombre: nombre,
            precio: precio,
            cantidad: 1
        });
    }

    // Guardamos el carrito actualizado nuevamente en el navegador
    localStorage.setItem('miCarrito', JSON.stringify(carrito));

    // Actualizamos el contador visual en la bolita roja
    actualizarContadorCarrito();

    // Feedback por VOZ UNIFICADO (Forzado en español)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Detener cualquier audio previo
        const utterance = new SpeechSynthesisUtterance(`${nombre} añadido`);
        utterance.lang = 'es-ES';
        window.speechSynthesis.speak(utterance);
    }

    // Feedback visual con Modal de éxito (en lugar de alert)
    mostrarModalExito(nombre);
}

// --- MODAL DE ÉXITO (ESTILO INDUSTRIAL) ---
function mostrarModalExito(nombreProducto) {
    // Eliminar modal anterior si existe
    const modalExistente = document.getElementById('successModal');
    if (modalExistente) modalExistente.remove();

    const modalHtml = `
        <div id="successModal" class="modal-overlay active" style="z-index: 10000;">
            <div class="modal fade-in" style="max-width: 400px; padding: 40px; text-align: center; border: 2px solid var(--primary);">
                <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
                <h2 style="font-family: var(--font-heading); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;">¡AÑADIDO!</h2>
                <p style="color: var(--on-surface-variant); margin-bottom: 32px;">
                    El producto <strong style="color: var(--primary);">${nombreProducto}</strong> ha sido integrado en su orden de compra.
                </p>
                <button class="btn btn-primary" onclick="document.getElementById('successModal').remove()" style="width: 100%;">CONTINUAR OPERACIONES</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Auto-cerrado después de 2.5 segundos
    setTimeout(() => {
        const modal = document.getElementById('successModal');
        if (modal) modal.remove();
    }, 2500);
}

// ==========================================
// 5. INICIALIZACIÓN DE LA PÁGINA
// ==========================================
// Este evento se dispara automáticamente cuando la página HTML ha terminado de cargar
document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazUsuario();
    actualizarContadorCarrito();
    cargarCategorias();
    cargarProductos();
});

// --- SISTEMA DE BÚSQUEDA Y VOZ ---

async function ejecutarBusqueda() {
    const query = document.getElementById('searchInput').value.trim();
    const productsGrid = document.getElementById('productsGrid');

    if (query === '') {
        // Si está vacío, volvemos a cargar todos
        if (typeof cargarProductos === 'function') cargarProductos();
        return;
    }

    productsGrid.innerHTML = '<p style="color: var(--text-muted);">Buscando productos...</p>';

    try {
        const { data, error } = await supabaseClient
            .from('producto')
            .select(`
                id, 
                sku,
                nombre, 
                descripcion, 
                precio, 
                imagen_url,
                categoria_id,
                categoria:categoria_id(nombre)
            `)
            .or(`nombre.ilike.%${query}%,descripcion.ilike.%${query}%`);

        if (error) throw error;

        renderizarProductos(data);
        // Limpiar el input después de la búsqueda
        document.getElementById('searchInput').value = '';
    } catch (error) {
        console.error('Error en búsqueda:', error.message);
        productsGrid.innerHTML = '<p style="color: var(--error);">Error al realizar la búsqueda técnica.</p>';
    }
}

// Función universal de reconocimiento de voz
function initVoiceRecognition(btnId, inputId, callback) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);

    // Compatibilidad multiplataforma
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Te recomendamos usar Google Chrome.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    btn.addEventListener('click', () => {
        try {
            recognition.start();
            btn.classList.add('recording');
            console.log("Micrófono activado...");
        } catch (e) {
            console.error("Error al iniciar reconocimiento:", e);
            // A veces el reconocimiento ya está corriendo
            recognition.stop();
        }
    });

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        input.value = text;
        btn.classList.remove('recording');
        if (callback) callback(text);
    };

    recognition.onerror = (event) => {
        btn.classList.remove('recording');
        console.error("Error en reconocimiento de voz:", event.error);

        if (event.error === 'not-allowed') {
            alert("Acceso al micrófono denegado. Por favor, activa los permisos en tu navegador.");
        } else if (event.error === 'network') {
            alert("Error de red. El reconocimiento de voz requiere conexión a internet.");
        }
    };

    recognition.onend = () => {
        btn.classList.remove('recording');
    };
}


// --- PROCESAMIENTO DE COMANDOS DE VOZ ---

// Función para mostrar avisos en pantalla
function mostrarNotificacion(mensaje, tipo) {
    const toast = document.createElement('div');
    toast.style = `
        position: fixed; top: 100px; right: 20px; 
        background: ${tipo === 'success' ? '#0f172a' : '#ba1a1a'};
        color: white; padding: 16px 24px; z-index: 10001;
        font-family: var(--font-heading); font-weight: 700;
        border: 1px solid rgba(255,255,255,0.2);
        animation: fadeIn 0.3s ease-out;
    `;
    toast.textContent = mensaje.toUpperCase();
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function procesarComandoVoz(texto) {
    const comando = texto.toLowerCase();
    console.log("Procesando comando:", comando);

    // 1. Regex flexible: acepta "añadir 101", "código 101", "pon el 101", etc.
    const regexCodigo = /(?:código|codigo|llevar|añadir|agregar|poner|pon|el|producto)\s+(\d+)/i;
    const match = comando.match(regexCodigo);

    if (match) {
        const skuEncontrado = match[1].trim();
        const producto = todosLosProductos.find(p => String(p.sku).trim() === String(skuEncontrado));
        
        if (producto) {
            agregarAlCarrito(producto.id, producto.nombre, producto.precio);
            mostrarNotificacion(`Añadido ${producto.nombre}`, 'success');
            return true; 
        } else {
            const msgError = `No encontré el producto ${skuEncontrado}`;
            if ('speechSynthesis' in window) {
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(msgError));
            }
            mostrarNotificacion(msgError, 'error');
            return true;
        }
    }

    // 2. Comandos de parada: "para", "detente", "stop", "silencio"
    if (['para', 'detente', 'stop', 'silencio'].some(c => comando.includes(c))) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        return true;
    }

    // 3. Comando: "todos los productos"
    if (comando === 'todos los productos' || comando === 'todos' || comando === 'ver todos') {
        cargarProductos();
        return true;
    }

    return false; // No era un comando especial
}

function mostrarModalError(mensaje) {
    const modalHtml = `
        <div id="errorModal" class="modal-overlay active" style="z-index: 10000;">
            <div class="modal fade-in" style="max-width: 400px; padding: 40px; text-align: center; border: 2px solid var(--error);">
                <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                <h2 style="font-family: var(--font-heading); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; color: var(--error);">ERROR</h2>
                <p style="color: var(--on-surface-variant); margin-bottom: 32px;">${mensaje}</p>
                <button class="btn btn-secondary" onclick="document.getElementById('errorModal').remove()" style="width: 100%;">REINTENTAR</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => { document.getElementById('errorModal')?.remove(); }, 3000);
}

// Inicializar tienda al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos e interfaz inicial
    actualizarInterfazUsuario();
    cargarCategorias();
    cargarProductos();
    actualizarContadorCarrito();

    // 2. Configurar reconocimiento de voz
    initVoiceRecognition('voiceSearchBtn', 'searchInput', (texto) => {
        const esComando = procesarComandoVoz(texto);
        if (!esComando) {
            ejecutarBusqueda();
        }
    });

    // 3. Escuchar Enter en el buscador
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ejecutarBusqueda();
    });
});

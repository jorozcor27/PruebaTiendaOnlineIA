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
        if(btnTodas) btnTodas.classList.add('active');
        
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
    
    // Feedback por VOZ
    if (typeof window.speakText === 'function') {
        window.speakText(`${nombre} añadido al carrito`);
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
    
    if (!('webkitSpeechRecognition' in window)) {
        alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    btn.addEventListener('click', () => {
        recognition.start();
        btn.classList.add('recording');
    });

    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        input.value = text;
        btn.classList.remove('recording');
        if (callback) callback(text);
    };

    recognition.onerror = () => {
        btn.classList.remove('recording');
        console.error("Error en reconocimiento de voz");
    };

    recognition.onend = () => {
        btn.classList.remove('recording');
    };
}


// --- PROCESAMIENTO DE COMANDOS DE VOZ ---

function procesarComandoVoz(texto) {
    const comando = texto.toLowerCase();
    console.log("Procesando comando:", comando);

    // Patrón flexible: "código [X] al carrito", "codigo [X]", "añadir codigo [X]", etc.
    // Soporta: código/codigo, añadir/agregar/poner, al carrito/a la cesta
    const regexCodigo = /(?:código|codigo)\s+(\d+)(?:\s+al\s+carrito|\s+a\s+la\s+cesta)?|(?:añadir|agregar|poner)\s+(?:código|codigo)\s+(\d+)/i;
    const match = comando.match(regexCodigo);

    if (match) {
        // Obtenemos el grupo que haya capturado el número
        const skuEncontrado = (match[1] || match[2]).trim();
        console.log("Comando detectado correctamente. Buscando SKU:", skuEncontrado);
        
        // Buscar el producto en nuestro arreglo global (asegurando comparación de strings)
        const producto = todosLosProductos.find(p => String(p.sku).trim() === String(skuEncontrado));
        
        if (producto) {
            agregarAlCarrito(producto.id, producto.nombre, producto.precio);
        } else {
            mostrarModalError(`No se encontró el código: ${skuEncontrado}`);
        }
        // Limpiar el input después de procesar el comando
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        return true; // Comando procesado
    }

    // Nuevo Comando: "para", "detente", "stop", "silencio"
    if (['para', 'detente', 'stop', 'silencio'].some(c => comando.includes(c))) {
        console.log("Comando de parada detectado.");
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        return true;
    }

    // Nuevo Comando: "todos los productos" o "todos"
    if (comando === 'todos los productos' || comando === 'todos' || comando === 'ver todos') {
        console.log("Reseteando catálogo...");
        cargarProductos();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
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

// Inicializar voz en la tienda
document.addEventListener('DOMContentLoaded', () => {
    initVoiceRecognition('voiceSearchBtn', 'searchInput', (texto) => {
        // Primero intentamos procesar como comando
        const esComando = procesarComandoVoz(texto);
        
        // Si no es comando, ejecutamos la búsqueda normal
        if (!esComando) {
            ejecutarBusqueda();
        }
    });

    // Escuchar Enter en el buscador
    document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ejecutarBusqueda();
    });
});

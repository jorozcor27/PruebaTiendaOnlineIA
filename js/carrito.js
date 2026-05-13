/**
 * LÓGICA DEL CARRITO DE COMPRAS
 */

document.addEventListener('DOMContentLoaded', () => {
    actualizarInterfazUsuario();
    renderizarCarrito();
});

function actualizarInterfazUsuario() {
    const userStr = localStorage.getItem('currentUser');
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userStr) {
        const user = JSON.parse(userStr);
        userNameDisplay.textContent = `Hola, ${user.nombre}`;
    }
}

function obtenerCarrito() {
    return JSON.parse(localStorage.getItem('miCarrito')) || [];
}

function renderizarCarrito() {
    const carrito = obtenerCarrito();
    const listContainer = document.getElementById('cartItemsList');
    listContainer.innerHTML = '';

    if (carrito.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 64px; border: 1px dashed var(--outline); background: rgba(0,0,0,0.02);">
                <p style="font-size: 18px; color: var(--text-muted);">Tu carrito está vacío.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 24px; display: inline-flex; width: auto;">Ir a Comprar</a>
            </div>
        `;
        actualizarTotales(0);
        return;
    }

    let subtotal = 0;

    carrito.forEach(item => {
        const itemTotal = item.precio * item.cantidad;
        subtotal += itemTotal;

        const itemRow = document.createElement('div');
        itemRow.className = 'cart-item fade-in';
        itemRow.style = `
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 24px; 
            background: var(--white); 
            border: 1px solid var(--outline-variant); 
            margin-bottom: 16px;
        `;
        
        itemRow.innerHTML = `
            <div style="display: flex; gap: 24px; align-items: center;">
                <div style="width: 60px; height: 60px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">
                    ${item.nombre.charAt(0)}
                </div>
                <div>
                    <h4 style="font-size: 16px; margin-bottom: 4px;">${item.nombre}</h4>
                    <p style="color: var(--secondary); font-size: 14px;">$${item.precio.toLocaleString()} c/u</p>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 32px;">
                <div style="display: flex; align-items: center; gap: 12px; border: 1px solid var(--outline-variant); padding: 4px;">
                    <button onclick="cambiarCantidad('${item.id}', -1)" style="background:none; border:none; cursor:pointer; padding: 8px; font-weight: bold;">-</button>
                    <span style="font-weight: 700; min-width: 20px; text-align: center;">${item.cantidad}</span>
                    <button onclick="cambiarCantidad('${item.id}', 1)" style="background:none; border:none; cursor:pointer; padding: 8px; font-weight: bold;">+</button>
                </div>
                <div style="width: 120px; text-align: right; font-weight: 800; color: var(--primary);">
                    $${itemTotal.toLocaleString()}
                </div>
                <button onclick="eliminarDelCarrito('${item.id}')" style="background:none; border:none; color: var(--error); cursor:pointer; font-size: 18px;" title="Eliminar">🗑️</button>
            </div>
        `;
        listContainer.appendChild(itemRow);
    });

    actualizarTotales(subtotal);
}

function cambiarCantidad(id, delta) {
    let carrito = obtenerCarrito();
    const item = carrito.find(p => String(p.id) === String(id));
    if (item) {
        item.cantidad += delta;
        if (item.cantidad <= 0) {
            carrito = carrito.filter(p => String(p.id) !== String(id));
        }
        localStorage.setItem('miCarrito', JSON.stringify(carrito));
        renderizarCarrito();
    }
}

function eliminarDelCarrito(id) {
    let carrito = obtenerCarrito();
    carrito = carrito.filter(p => String(p.id) !== String(id));
    localStorage.setItem('miCarrito', JSON.stringify(carrito));
    renderizarCarrito();
}

function vaciarCarrito() {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
        localStorage.removeItem('miCarrito');
        renderizarCarrito();
    }
}

function actualizarTotales(subtotal) {
    document.getElementById('cartSubtotal').textContent = `$${subtotal.toLocaleString()}`;
    document.getElementById('cartTotal').textContent = `$${subtotal.toLocaleString()}`;
}

function finalizarCompra() {
    const carrito = obtenerCarrito();
    if (carrito.length === 0) return;
    
    alert('¡Compra procesada con éxito! Gracias por confiar en La Última Maravilla.');
    localStorage.removeItem('miCarrito');
    window.location.href = 'index.html';
}

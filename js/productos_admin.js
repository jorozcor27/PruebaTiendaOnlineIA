/**
 * Lógica de Administración de Productos - Performance Monolith
 */

// Variables globales
let editMode = false;
let currentImageUrl = '';

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar autenticación (solo Admin)
    const user = await checkAuth('Admin');
    if (!user) return;

    // 2. Cargar datos iniciales
    await cargarCategorias();
    await renderTable();

    // 3. Setup de UI
    setupImageToggles();
});

// --- Funciones de UI ---

function setupImageToggles() {
    const btnUploadLocal = document.getElementById('btnUploadLocal');
    const btnPasteUrl = document.getElementById('btnPasteUrl');
    const groupLocal = document.getElementById('uploadLocalGroup');
    const groupUrl = document.getElementById('pasteUrlGroup');

    btnUploadLocal.addEventListener('click', () => {
        btnUploadLocal.classList.add('active');
        btnPasteUrl.classList.remove('active');
        groupLocal.style.display = 'block';
        groupUrl.style.display = 'none';
        document.getElementById('imageUrl').value = '';
    });

    btnPasteUrl.addEventListener('click', () => {
        btnPasteUrl.classList.add('active');
        btnUploadLocal.classList.remove('active');
        groupUrl.style.display = 'block';
        groupLocal.style.display = 'none';
        document.getElementById('imageFile').value = '';
    });
}

function openModal(prod = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('modalTitle');
    
    modal.classList.add('active');
    form.reset();
    
    if (prod) {
        editMode = true;
        title.textContent = 'EDITAR PRODUCTO';
        document.getElementById('productId').value = prod.id;
        document.getElementById('nombre').value = prod.nombre;
        document.getElementById('descripcion').value = prod.descripcion;
        document.getElementById('precio').value = prod.precio;
        document.getElementById('stock').value = prod.stock || 0;
        document.getElementById('categoria_id').value = prod.categoria_id;
        currentImageUrl = prod.imagen_url;
        
        // Si tiene URL, mostramos el campo de URL por defecto al editar
        if (prod.imagen_url) {
            document.getElementById('btnPasteUrl').click();
            document.getElementById('imageUrl').value = prod.imagen_url;
        }
    } else {
        editMode = false;
        title.textContent = 'NUEVO PRODUCTO';
        document.getElementById('productId').value = '';
        document.getElementById('stock').value = 0;
        currentImageUrl = '';
        document.getElementById('btnUploadLocal').click();
    }
}

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
}

// --- Lógica de Datos ---

async function cargarCategorias() {
    const select = document.getElementById('categoria_id');
    try {
        const { data, error } = await supabaseClient.from('categoria').select('*').order('nombre');
        if (error) throw error;
        
        select.innerHTML = data.map(cat => `
            <option value="${cat.id}">${cat.nombre}</option>
        `).join('');
    } catch (error) {
        console.error('Error al cargar categorías:', error.message);
    }
}

async function renderTable() {
    const tbody = document.getElementById('productosTableBody');
    try {
        const { data, error } = await supabaseClient
            .from('producto')
            .select('*, categoria:categoria_id(nombre)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        tbody.innerHTML = data.map(prod => `
            <tr style="border-bottom: 1px solid var(--outline-variant); transition: var(--transition);">
                <td style="padding: 16px 24px;">
                    <img src="${prod.imagen_url || 'https://via.placeholder.com/60'}" 
                         style="width: 60px; height: 60px; object-fit: cover; border: 1px solid var(--outline-variant);">
                </td>
                <td style="padding: 16px 24px;">
                    <div style="font-weight: 700; color: var(--on-surface);">${prod.nombre}</div>
                    <div style="font-size: 12px; color: var(--on-surface-variant); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${prod.descripcion || 'Sin descripción'}
                    </div>
                </td>
                <td style="padding: 16px 24px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--secondary);">
                        ${prod.categoria?.nombre || 'General'}
                    </span>
                </td>
                <td style="padding: 16px 24px;">
                    <span style="font-family: var(--font-body); font-weight: 500; color: ${prod.stock > 0 ? 'var(--on-surface)' : 'var(--error)'};">
                        ${prod.stock} UNID.
                    </span>
                </td>
                <td style="padding: 16px 24px; font-family: var(--font-heading); font-weight: 800;">
                    $${prod.precio.toFixed(2)}
                </td>
                <td style="padding: 16px 24px; text-align: right;">
                    <button class="btn btn-sm" onclick='prepareEdit(${JSON.stringify(prod).replace(/'/g, "&apos;")})' 
                            style="background: transparent; border: 1px solid var(--outline); padding: 6px 12px; margin-right: 8px; font-size: 11px;">EDITAR</button>
                    <button class="btn btn-sm" onclick="deleteProducto('${prod.id}')"
                            style="background: transparent; border: 1px solid var(--error); color: var(--error); padding: 6px 12px; font-size: 11px;">ELIMINAR</button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error al cargar productos:', error.message);
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 48px; text-align: center; color: var(--on-surface-variant);">Error al cargar el inventario.</td></tr>';
    }
}

// Función auxiliar para manejar el objeto en el onclick
window.prepareEdit = (prod) => {
    openModal(prod);
};

// --- CRUD ---

const productForm = document.getElementById('productForm');
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = productForm.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'PROCESANDO...';

        const id = document.getElementById('productId').value;
        const nombre = document.getElementById('nombre').value.trim();
        const descripcion = document.getElementById('descripcion').value.trim();
        const precio = parseFloat(document.getElementById('precio').value);
        const stock = parseInt(document.getElementById('stock').value);
        const categoria_id = parseInt(document.getElementById('categoria_id').value);
        
        let finalImageUrl = document.getElementById('imageUrl').value.trim();
        const fileInput = document.getElementById('imageFile');

        // 1. Manejo de Imagen (Si hay archivo, subimos a Supabase Storage)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
            const filePath = fileName;

            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('productos')
                .upload(filePath, file);

            if (uploadError) throw new Error('Error al subir imagen: ' + uploadError.message);

            // Obtener URL pública
            const { data: { publicUrl } } = supabaseClient.storage
                .from('productos')
                .getPublicUrl(filePath);
            
            finalImageUrl = publicUrl;
        } else if (!finalImageUrl && editMode) {
            // Si estamos editando y no cambiamos la imagen, mantenemos la actual
            finalImageUrl = currentImageUrl;
        }

        const productData = {
            nombre,
            descripcion,
            precio,
            stock,
            categoria_id,
            imagen_url: finalImageUrl
        };

        if (editMode) {
            const { error } = await supabaseClient
                .from('producto')
                .update(productData)
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient
                .from('producto')
                .insert([productData]);
            if (error) throw error;
        }

        alert(editMode ? 'Producto actualizado' : 'Producto creado');
        closeModal();
        renderTable();

    } catch (error) {
        console.error('Error al guardar:', error.message);
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'GUARDAR PRODUCTO';
    }
});

async function deleteProducto(id) {
    if (confirm('¿Confirmar baja técnica de este producto del inventario?')) {
        try {
            const { error } = await supabaseClient
                .from('producto')
                .delete()
                .eq('id', id);
            if (error) throw error;
            renderTable();
        } catch (error) {
            console.error('Error al eliminar:', error.message);
            alert('No se pudo eliminar el producto.');
        }
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

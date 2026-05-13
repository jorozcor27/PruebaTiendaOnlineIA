/**
 * Conexión del Frontend con Supabase
 */

// Inicializar cliente de Supabase usando el objeto CONFIG centralizado
const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// --- Sistema de Autenticación ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            // 1. Iniciar sesión con Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            // 2. Obtener el perfil del usuario y su rol desde la tabla 'usuario'
            const { data: userData, error: userError } = await supabaseClient
                .from('usuario')
                .select(`
                    id, 
                    nombre, 
                    email, 
                    rol:rol_id ( nombre )
                `)
                .eq('auth_id', authData.user.id)
                .single();

            if (userError) throw userError;

            // Guardar datos en sesión local para acceso rápido en la UI
            const rolNombre = userData.rol ? userData.rol.nombre : 'Desconocido';
            const sessionUser = {
                id: userData.id,
                nombre: userData.nombre,
                email: userData.email,
                rol: rolNombre
            };
            localStorage.setItem('currentUser', JSON.stringify(sessionUser));

            // 3. Redirección
            // Todos los usuarios (Admin, Empleado, Cliente) entran directo a la tienda
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Error de autenticación:', error.message);
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Credenciales incorrectas o error de conexión.';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 3000);
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const errorDiv = document.getElementById('loginError');
        const successDiv = document.getElementById('registerSuccess');
        const submitBtn = registerForm.querySelector('button');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Registrando...';

            // 1. Crear cuenta en Supabase Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            // 2. Determinar Rol (Buscaremos 'Cliente' o fallback a 2)
            let rolId = 2; // Default Empleado si no existe Cliente
            const { data: rolData } = await supabaseClient.from('rol').select('id').eq('nombre', 'Cliente').single();
            if (rolData) rolId = rolData.id;

            // 3. Insertar en tabla 'usuario'
            const { error: insertError } = await supabaseClient.from('usuario').insert([{
                auth_id: authData.user.id,
                nombre: nombre,
                email: email,
                rol_id: rolId,
                estado_id: 1 // Activo
            }]);

            if (insertError) throw insertError;

            successDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            registerForm.reset();

            // Volver al modo login automáticamente después de 3 segundos
            setTimeout(() => {
                successDiv.style.display = 'none';
                if (typeof toggleAuthMode === 'function') toggleAuthMode(new Event('click'));
            }, 3000);

        } catch (error) {
            console.error('Error al registrar:', error.message);
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Error al crear la cuenta: ' + error.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear Cuenta';
        }
    });
}

async function logout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

async function checkAuth(requiredRole) {
    const userStr = localStorage.getItem('currentUser');

    // Verificar primero la sesión real en Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session || !userStr) {
        window.location.href = 'login.html';
        return null;
    }

    const user = JSON.parse(userStr);

    if (document.getElementById('userNameDisplay')) {
        document.getElementById('userNameDisplay').textContent = user.nombre;
    }

    // Inicializar Sidebar si existe en el DOM y el usuario es admin
    const isAdmin = user.rol === 'Admin' || user.rol === 'Administrador';
    if (isAdmin) {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserRole = document.getElementById('sidebarUserRole');

        if (sidebarToggle) sidebarToggle.style.display = 'flex';
        if (sidebarUserName) sidebarUserName.textContent = user.nombre;
        if (sidebarUserRole) sidebarUserRole.textContent = user.rol;
    }

    if (requiredRole) {
        // Normalizamos los roles de administrador
        const isAdminRequired = requiredRole === 'Admin' || requiredRole === 'Administrador';
        const isUserAdmin = user.rol === 'Admin' || user.rol === 'Administrador';

        // Si se requiere admin y el usuario no lo es, o viceversa, se muestra el modal de restricción.
        if (isAdminRequired && !isUserAdmin) {
            showRestrictedModal('index.html');
            return null;
        } else if (!isAdminRequired && isUserAdmin) {
            showRestrictedModal('usuarios.html');
            return null;
        }
    }

    return user;
}

// Función para mostrar un modal de acceso restringido y redirigir
function showRestrictedModal(targetPage) {
    // Si ya existe un modal, no creamos otro
    if (document.getElementById('restrictedModal')) return;

    const modalHtml = `
        <div id="restrictedModal" class="modal-overlay active" style="z-index: 9999;">
            <div class="modal" style="text-align: left; padding: 48px; border: 1px solid var(--primary); max-width: 500px; background: var(--white);">
                <div class="modal-header" style="border:none; padding: 0; margin-bottom: 24px;">
                    <h2 class="modal-title" style="color: var(--primary); font-size: 32px; font-family: var(--font-heading); font-weight: 800; letter-spacing: -0.02em; line-height: 1; text-transform: uppercase;">ACCESO RESTRINGIDO</h2>
                </div>
                <div class="modal-body" style="padding: 0;">
                    <p style="font-size: 18px; margin-bottom: 24px; font-family: var(--font-body); color: var(--on-surface); line-height: 1.6;">No posees las credenciales técnicas necesarias para acceder a esta división del sistema.</p>
                    <p style="font-size: 13px; font-family: var(--font-body); color: var(--on-surface-variant); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Redireccionando al centro de operaciones...</p>
                </div>
                <div class="modal-footer" style="border:none; padding: 0; margin-top: 48px;">
                    <button class="btn btn-primary" onclick="window.location.href='${targetPage}'" style="width: auto; padding: 18px 32px; display: inline-block;">CONTINUAR</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Redirección automática después de 4 segundos
    setTimeout(() => {
        window.location.href = targetPage;
    }, 4000);
}

// ==========================================
// SISTEMA DE SIDEBAR DASHBOARD
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (toggleBtn) toggleBtn.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
    document.body.classList.toggle('sidebar-open');
}

// --- Sistema CRUD de Usuarios ---

async function getUsuarios() {
    try {
        const { data, error } = await supabaseClient
            .from('usuario')
            .select(`
                id, 
                nombre, 
                email, 
                rol:rol_id ( nombre ),
                estado:estado_id ( nombre )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Mapear los datos para aplanar el objeto rol y estado
        return data.map(u => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol: u.rol?.nombre || 'Sin Rol',
            estado: u.estado?.nombre || 'Desconocido'
        }));
    } catch (error) {
        console.error('Error al obtener usuarios:', error.message);
        return [];
    }
}

async function renderTable() {
    const tbody = document.getElementById('usuariosTableBody');
    if (!tbody) return;

    const usuarios = await getUsuarios();
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">No hay usuarios registrados.</td></tr>`;
        return;
    }

    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        const badgeClass = (u.rol === 'Admin' || u.rol === 'Administrador') ? 'badge-admin' : 'badge-empleado';

        tr.innerHTML = `
            <td style="font-weight: 500;">${u.nombre}</td>
            <td style="color: #64748b;">${u.email}</td>
            <td><span class="badge ${badgeClass}">${u.rol}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-warning" onclick="alert('La edición completa requiere supabase-admin o triggers específicos para Auth. Funcionalidad en construcción.')">Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')">Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modales y manejo de formularios (Adaptados a Supabase)
function openModal() {
    document.getElementById('userModal').classList.add('active');
    document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('passwordHelp').style.display = 'none';
}

function closeModal() {
    document.getElementById('userModal').classList.remove('active');
}

async function deleteUser(id) {
    if (confirm('¿Estás seguro de que deseas eliminar a este usuario de la tabla pública? (Nota: Su cuenta Auth debe eliminarse desde el panel de Supabase)')) {
        try {
            const { error } = await supabaseClient
                .from('usuario')
                .delete()
                .eq('id', id);

            if (error) throw error;
            renderTable();
        } catch (error) {
            console.error('Error al eliminar:', error.message);
            alert('Error al eliminar el usuario.');
        }
    }
}

const userForm = document.getElementById('userForm');
if (userForm) {
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const isEditing = document.getElementById('userId').value !== '';
        if (isEditing) {
            alert('La edición completa requiere acceso a supabase-admin o funciones Edge. Por ahora, solo se permite crear nuevos usuarios.');
            return;
        }

        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const password = document.getElementById('userPassword').value;
        const rolSelect = document.getElementById('rol').value;
        const submitBtn = userForm.querySelector('button[type="submit"]');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creando...';

            // 1. Cliente temporal para crear el Auth User sin desloguear al Admin actual
            const tempClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });

            // 2. Crear usuario en Auth
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            // 3. Determinar el rol en base a la selección (Admin -> Administrador, Empleado -> Empleado)
            let rolId = 2; // Por defecto Empleado
            const rolBusqueda = rolSelect === 'Admin' ? 'Administrador' : 'Empleado';
            const { data: rolData } = await supabaseClient.from('rol').select('id').eq('nombre', rolBusqueda).single();
            if (rolData) rolId = rolData.id;

            // 4. Registrar al usuario en nuestra tabla pública 'usuario'
            const { error: insertError } = await supabaseClient.from('usuario').insert([{
                auth_id: authData.user.id,
                nombre: nombre,
                email: email,
                rol_id: rolId,
                estado_id: 1 // 1 = Activo
            }]);

            if (insertError) throw insertError;

            alert('Usuario creado exitosamente.');
            closeModal();
            if (typeof renderTable === 'function') renderTable();

        } catch (error) {
            console.error('Error al crear usuario:', error.message);
            alert('Error al crear usuario: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Usuario';
        }
    });
}

// Cerrar modal
document.getElementById('userModal')?.addEventListener('click', function (e) {
    if (e.target === this) {
        closeModal();
    }
});

// Inicializar
if (document.getElementById('usuariosTableBody')) {
    renderTable();
}

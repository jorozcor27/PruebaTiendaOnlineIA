/**
 * LÓGICA DEL DASHBOARD DE ADMINISTRACIÓN
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticación (Nivel Admin)
    const user = await checkAuth('Admin');
    if (!user) return;

    // 2. Cargar Estadísticas
    await cargarEstadisticas();

    // 3. Renderizar Gráficas
    renderizarGraficaCategorias();
    renderizarGraficaTendencias();

    // 4. Cargar Pedidos Recientes
    await cargarPedidosRecientes();
});

async function cargarEstadisticas() {
    try {
        // Usuarios Totales
        const { count: userCount } = await supabaseClient
            .from('usuario')
            .select('*', { count: 'exact', head: true });
        document.getElementById('totalUsers').textContent = userCount || 0;

        // Productos Totales
        const { count: prodCount } = await supabaseClient
            .from('producto')
            .select('*', { count: 'exact', head: true });
        document.getElementById('totalProducts').textContent = prodCount || 0;

        // Ventas Totales y Pedidos Activos
        const { data: pedidos, error } = await supabaseClient
            .from('pedido')
            .select('total, estado');

        if (error) throw error;

        const totalSales = pedidos.reduce((acc, p) => acc + Number(p.total), 0);
        const activeOrders = pedidos.filter(p => p.estado !== 'Entregado').length;

        document.getElementById('totalSales').textContent = `$${totalSales.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
        document.getElementById('activeOrders').textContent = activeOrders;

    } catch (error) {
        console.error('Error al cargar estadísticas:', error.message);
    }
}

async function cargarPedidosRecientes() {
    const tbody = document.getElementById('recentOrdersTable');
    if (!tbody) return;

    try {
        const { data: pedidos, error } = await supabaseClient
            .from('pedido')
            .select(`
                id,
                fecha,
                total,
                estado,
                usuario:usuario_id ( nombre )
            `)
            .order('fecha', { ascending: false })
            .limit(5);

        if (error) throw error;

        tbody.innerHTML = '';
        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--on-surface-variant);">No hay pedidos registrados aún.</td></tr>';
            return;
        }

        pedidos.forEach(p => {
            const tr = document.createElement('tr');
            const fechaFormateada = new Date(p.fecha).toLocaleDateString('es-CO');
            tr.innerHTML = `
                <td style="font-family: monospace; font-size: 12px;">${p.id.substring(0, 8)}...</td>
                <td>${p.usuario?.nombre || 'Desconocido'}</td>
                <td>${fechaFormateada}</td>
                <td style="font-weight: 700;">$${Number(p.total).toFixed(2)}</td>
                <td><span class="badge ${p.estado === 'Entregado' ? 'badge-empleado' : 'badge-admin'}">${p.estado}</span></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al cargar pedidos:', error.message);
    }
}

function renderizarGraficaCategorias() {
    const ctx = document.getElementById('salesByCategoryChart').getContext('2d');
    
    // Datos de ejemplo (En una fase real, esto se calcularía con una consulta agregada)
    const data = {
        labels: ['Electrónica', 'Ropa', 'Accesorios', 'Suplementos'],
        datasets: [{
            label: 'Ventas por Categoría',
            data: [450, 300, 150, 200],
            backgroundColor: [
                '#0f172a',
                '#334155',
                '#475569',
                '#94a3b8'
            ],
            borderWidth: 0
        }]
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Inter', size: 12 },
                        padding: 20
                    }
                }
            }
        }
    });
}

function renderizarGraficaTendencias() {
    const ctx = document.getElementById('ordersTrendChart').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Pedidos',
                data: [12, 19, 15, 25, 22, 30],
                borderColor: '#0f172a',
                backgroundColor: 'rgba(15, 23, 42, 0.05)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointBackgroundColor: '#0f172a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/* Panel de admin de Sabor Vinotinto.

   Funciona en dos modos, decididos por si Supabase está conectado (config.js):

   • MODO NUBE (con Supabase): los dos socios entran con su correo y contraseña
     y comparten los mismos datos. Los pedidos que hacen los clientes caen solos
     como "pendientes"; al confirmarlos se descuenta el stock y cuentan como
     venta. Es seguridad de verdad (la valida Supabase).

   • MODO LOCAL (sin Supabase): igual que antes, con una clave (config.adminPin)
     y los datos guardados solo en este navegador. Es el respaldo mientras no se
     conecte la nube; esa clave se ve en el código, así que no es seguridad real. */
(function () {
  const CFG = window.SV_CONFIG;
  const S = window.SVStore;
  const SYNC = window.SVSync;
  const $ = sel => document.querySelector(sel);

  const NUBE = !!(SYNC && SYNC.configurado());

  let tab = 'resumen';
  let autenticado = false;      // modo local
  let cacheProductos = [];      // modo nube
  let cachePendientes = [];
  let cacheConfirmados = [];

  const plata = n => '$' + Math.round(n || 0).toLocaleString('es-CO');
  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }
  const toast = msg => (window.SVToast ? window.SVToast(msg) : null);

  function fecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      + ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  function sinTildes(txt) {
    return String(txt).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function slug(txt) {
    return sinTildes(txt)
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || ('prod-' + Date.now());
  }
  function descargar(nombre, contenido) {
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function kpi(label, valor, sub) {
    return '<div class="kpi"><div class="kpi-l">' + esc(label) + '</div>'
      + '<div class="kpi-v">' + esc(valor) + '</div>'
      + '<div class="kpi-s">' + esc(sub) + '</div></div>';
  }

  /* Tarjetas del resumen, iguales en modo nube y local. "Plante" es la inversión
     real (config.inversion); "Recuperado" es cuánto del plante ya volvió con las
     ventas. Así se ve de verdad cuánto se puso, cuánto se recuperó y la ganancia. */
  function kpisResumen(r) {
    const inversion = CFG.inversion || 0;
    const pct = inversion > 0 ? Math.min(100, Math.round(r.ingresos / inversion * 100)) : 0;
    const falta = inversion - r.ingresos;
    const subRecuperado = inversion <= 0 ? 'define el plante en config.js'
      : (falta > 0 ? 'faltan ' + plata(falta) : '¡plante recuperado! 🎉');
    return '<div class="kpi-grid">'
      + kpi('Ventas', r.pedidos, r.unidades + ' unidades')
      + kpi('Ingresos', plata(r.ingresos), 'lo que ha entrado')
      + kpi('Ganancia', plata(r.ganancia), 'margen (venta − costo)')
      + kpi('Plante', plata(inversion), 'lo que invirtieron')
      + kpi('Recuperado', pct + '%', subRecuperado)
      + kpi('En stock', r.stockTotal, r.agotados + ' agotado(s)')
      + '</div>';
  }

  /* Vuelve a pintar la tienda para que refleje los cambios del admin. */
  function refrescarTienda() {
    if (window.SVPintarCatalogo) window.SVPintarCatalogo();
    if (window.SVPintarCarrito) window.SVPintarCarrito();
  }

  /* ── Abrir / cerrar ── */
  function abrir() {
    $('#admin-overlay').classList.add('abierto');
    document.body.style.overflow = 'hidden';
    const logueado = NUBE ? SYNC.haySesion() : autenticado;
    if (logueado) { mostrarPanel(); pintar(); }
    else mostrarLogin();
  }
  function cerrar() {
    $('#admin-overlay').classList.remove('abierto');
    document.body.style.overflow = '';
  }

  function mostrarLogin() {
    $('#admin-login').style.display = 'block';
    $('#admin-tabs').style.display = 'none';
    $('#admin-body').style.display = 'none';
    $('#admin-correo').style.display = NUBE ? '' : 'none';
    $('#login-sub').textContent = NUBE
      ? 'Entra con tu correo y contraseña de socio'
      : 'Ingresa la clave';
    $('#admin-sub').textContent = NUBE
      ? 'Sabor Vinotinto · datos compartidos entre socios'
      : 'Sabor Vinotinto · datos en este navegador';
    setTimeout(() => (NUBE ? $('#admin-correo') : $('#admin-pin')).focus(), 100);
  }
  function mostrarPanel() {
    $('#admin-login').style.display = 'none';
    $('#admin-tabs').style.display = 'flex';
    $('#admin-body').style.display = 'block';
    pintarTabs();
  }

  /* ── Pestañas (según el modo) ── */
  function pintarTabs() {
    const tabs = NUBE
      ? [['resumen', 'Resumen'], ['pedidos', 'Pedidos'], ['productos', 'Productos'], ['ajustes', 'Ajustes']]
      : [['resumen', 'Resumen'], ['productos', 'Productos'], ['ventas', 'Ventas'], ['ajustes', 'Ajustes']];
    const cont = $('#admin-tabs');
    cont.innerHTML = tabs.map(([id, txt]) => {
      const chip = (id === 'pedidos' && cachePendientes.length)
        ? ' <span class="chip-pendiente">' + cachePendientes.length + '</span>' : '';
      return '<button class="admin-tab' + (id === tab ? ' activo' : '') + '" data-tab="' + id + '">' + txt + chip + '</button>';
    }).join('');
    cont.querySelectorAll('.admin-tab').forEach(b =>
      b.addEventListener('click', () => { tab = b.dataset.tab; pintar(); }));
  }

  /* ── Entrar ── */
  async function entrar() {
    const err = $('#admin-error');
    if (NUBE) {
      const btn = $('#admin-entrar');
      btn.disabled = true; btn.textContent = '…';
      const r = await SYNC.entrar($('#admin-correo').value, $('#admin-pin').value);
      btn.disabled = false; btn.textContent = 'Entrar';
      if (!r.ok) { err.textContent = r.msg; $('#admin-pin').value = ''; return; }
      err.textContent = ''; $('#admin-pin').value = '';
      mostrarPanel();
      pintar();
    } else {
      if ($('#admin-pin').value !== CFG.adminPin) {
        err.textContent = 'Clave incorrecta'; $('#admin-pin').value = ''; return;
      }
      autenticado = true; err.textContent = ''; $('#admin-pin').value = '';
      mostrarPanel();
      pintar();
    }
  }

  /* ── Router ── */
  function pintar() {
    document.querySelectorAll('.admin-tab').forEach(b =>
      b.classList.toggle('activo', b.dataset.tab === tab));
    if (NUBE) return pintarNube();
    return pintarLocal();
  }

  /* ═══════════════════ MODO NUBE ═══════════════════ */

  async function pintarNube() {
    const body = $('#admin-body');
    body.innerHTML = '<div class="admin-vacio"><div>⏳</div>Cargando…</div>';
    try {
      // Trae lo que necesita la vista actual (y siempre los pendientes, para el chip)
      cacheProductos = await SYNC.getProductos();
      if (!cacheProductos.length) {
        // Primera vez: siembra el catálogo desde products.js
        await SYNC.sembrarSiVacio(window.SV_PRODUCTS || []);
        cacheProductos = await SYNC.getProductos();
      }
      cachePendientes = await SYNC.getPedidos('pendiente');
      cacheConfirmados = await SYNC.getPedidos('confirmado');
    } catch (e) {
      body.innerHTML = '<div class="admin-nota">No se pudo cargar desde la nube:<br>'
        + esc(e.message) + '</div>'
        + '<div class="acciones"><button class="sv-btn sec" id="sb-salir">Cerrar sesión</button></div>';
      const s = $('#sb-salir'); if (s) s.addEventListener('click', salirNube);
      return;
    }
    pintarTabs(); // refresca el chip de pendientes

    if (tab === 'resumen') body.innerHTML = vistaResumenNube();
    else if (tab === 'pedidos') body.innerHTML = vistaPedidosNube();
    else if (tab === 'productos') body.innerHTML = vistaProductosNube();
    else if (tab === 'ajustes') body.innerHTML = vistaAjustesNube();
    conectarNube();
    body.scrollTop = 0;
  }

  function vistaResumenNube() {
    const r = SYNC.calcularResumen(cacheConfirmados, cacheProductos);
    const top = Object.entries(r.porProducto).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, cant]) => {
        const p = cacheProductos.find(x => x.id === id);
        return { nombre: p ? p.nombre : id, cant };
      });
    const bajos = cacheProductos.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock);

    return ''
      + (cachePendientes.length
        ? '<div class="aviso-pendientes">Tienes <strong>' + cachePendientes.length
          + '</strong> pedido(s) esperando confirmación en la pestaña <strong>Pedidos</strong>.</div>'
        : '')
      + kpisResumen(r)
      + '<div class="admin-sec-titulo">Más vendidos</div>'
      + (top.length
        ? '<div class="tabla-scroll"><table class="sv-tabla"><tbody>'
          + top.map(t => '<tr><td>' + esc(t.nombre) + '</td>'
            + '<td class="num" style="color:var(--oro);font-weight:800">' + t.cant + ' und</td></tr>').join('')
          + '</tbody></table></div>'
        : '<p class="admin-tenue">Todavía no hay ventas confirmadas.</p>')
      + '<div class="admin-sec-titulo">Stock bajo (3 o menos)</div>'
      + (bajos.length
        ? '<div class="tabla-scroll"><table class="sv-tabla"><tbody>'
          + bajos.map(p => '<tr><td>' + esc(p.nombre) + '</td><td class="num">'
            + (p.stock <= 0 ? '<span class="pill-agotado">AGOTADO</span>'
              : '<span style="color:var(--oro);font-weight:800">' + p.stock + ' und</span>')
            + '</td></tr>').join('')
          + '</tbody></table></div>'
        : '<p class="admin-tenue">Todo con stock suficiente. 👌</p>');
  }

  function vistaPedidosNube() {
    return ''
      + '<div class="admin-nota">Cuando un cliente pide en la página, el pedido aparece aquí solo. '
      + 'Cuando confirmes que pagó, dale <strong>Confirmar venta</strong>: ahí se descuenta el stock '
      + 'y cuenta como venta y ganancia.</div>'
      + '<div class="acciones" style="margin-top:0;margin-bottom:6px">'
      +   '<button class="sv-btn sec mini" id="sb-recargar">↻ Actualizar</button>'
      + '</div>'
      + '<div class="admin-sec-titulo">Pendientes (' + cachePendientes.length + ')</div>'
      + (cachePendientes.length
        ? cachePendientes.map(pedidoTarjeta).join('')
        : '<p class="admin-tenue">No hay pedidos pendientes.</p>')
      + '<div class="admin-sec-titulo">Ventas confirmadas (' + cacheConfirmados.length + ')</div>'
      + (cacheConfirmados.length
        ? '<div class="tabla-scroll"><table class="sv-tabla"><thead><tr>'
          + '<th>Pedido</th><th>Productos</th><th class="num">Total</th></tr></thead><tbody>'
          + cacheConfirmados.map(v => '<tr>'
            + '<td><div style="font-weight:800;color:var(--crema)">' + esc(v.cliente || 'Cliente') + '</div>'
            +   '<div class="admin-tenue" style="font-size:11px">' + esc(fecha(v.creado)) + '</div>'
            +   (v.confirmado_por ? '<div style="font-size:11px;color:var(--oro)">✓ ' + esc(v.confirmado_por) + '</div>' : '')
            + '</td>'
            + '<td style="font-size:12px;color:rgba(245,233,200,.6)">'
            +   (v.items || []).map(l => esc(l.cant + ' × ' + l.nombre)).join('<br>') + '</td>'
            + '<td class="num" style="color:var(--oro);font-weight:800">' + plata(v.total) + '</td>'
            + '</tr>').join('')
          + '</tbody></table></div>'
        : '<p class="admin-tenue">Todavía no has confirmado ninguna venta.</p>');
  }

  function pedidoTarjeta(v) {
    const items = (v.items || []).map(l =>
      '<div>' + l.cant + ' × ' + esc(l.nombre) + ' <span class="admin-tenue">— ' + plata(l.subtotal) + '</span></div>').join('');
    const ubic = v.ubicacion
      ? '<a href="' + esc(v.ubicacion) + '" target="_blank" rel="noopener" class="pedido-mapa">📍 Ver ubicación en el mapa</a>' : '';
    return ''
      + '<div class="pedido-card">'
      +   '<div class="pedido-top">'
      +     '<div><div class="pedido-cliente">' + esc(v.cliente || 'Cliente') + '</div>'
      +       '<div class="admin-tenue" style="font-size:11px">' + esc(fecha(v.creado)) + '</div></div>'
      +     '<div class="pedido-total">' + plata(v.total) + '</div>'
      +   '</div>'
      +   '<div class="pedido-items">' + items + '</div>'
      +   '<div class="pedido-datos">'
      +     (v.telefono ? '<div>📞 <a href="tel:' + esc(v.telefono.replace(/\s/g, '')) + '">' + esc(v.telefono) + '</a></div>' : '')
      +     (v.ciudad ? '<div>🏙️ ' + esc(v.ciudad) + '</div>' : '')
      +     (v.direccion ? '<div>🏠 ' + esc(v.direccion) + '</div>' : '')
      +     ubic
      +   '</div>'
      +   '<div class="acciones" style="margin-top:12px">'
      +     '<button class="sv-btn" data-confirmar="' + v.id + '">✓ Confirmar venta</button>'
      +     '<button class="sv-btn peligro" data-cancelar="' + v.id + '">Cancelar</button>'
      +   '</div>'
      + '</div>';
  }

  function vistaProductosNube() {
    const vendidos = SYNC.calcularResumen(cacheConfirmados, cacheProductos).porProducto;
    return ''
      + '<div class="admin-nota">Lo que cambies aquí lo ven <strong>los dos socios</strong> y tus clientes '
      + 'al instante. El stock se descuenta solo cuando confirmas un pedido.</div>'
      + '<div class="tabla-scroll"><table class="sv-tabla">'
      + '<thead><tr><th>Producto</th><th class="num">Precio</th><th class="num">Costo</th>'
      + '<th class="num">Stock</th><th class="num">Vendidos</th><th></th></tr></thead><tbody>'
      + cacheProductos.map(p => filaProductoNube(p, vendidos[p.id] || 0)).join('')
      + '</tbody></table></div>'
      + '<div class="admin-sec-titulo">Agregar / editar producto</div>'
      + formProducto();
  }

  function filaProductoNube(p, vendidos) {
    const foto = window.SVMiniatura ? window.SVMiniatura(p) : esc(p.emoji || '📦');
    return '<tr>'
      + '<td><div class="celda-prod"><div class="mini-foto foto-box">' + foto + '</div>'
      +   '<div><div style="font-weight:800;color:var(--crema)">' + esc(p.nombre) + '</div>'
      +   '<div style="font-size:11px;color:rgba(245,233,200,.3)">' + esc(p.categoria || 'Otros') + '</div></div></div></td>'
      + '<td class="num" style="color:var(--oro);font-weight:800">' + plata(p.precio) + '</td>'
      + '<td class="num" style="color:rgba(245,233,200,.4)">' + plata(p.costo) + '</td>'
      + '<td class="num"><input type="number" min="0" class="sv-input stock-input" data-stock="'
      +   esc(p.id) + '" value="' + p.stock + '"></td>'
      + '<td class="num">' + (vendidos ? vendidos + ' und' : '—') + '</td>'
      + '<td class="num" style="white-space:nowrap">'
      +   '<button class="sv-btn sec mini" data-editar="' + esc(p.id) + '">Editar</button> '
      +   '<button class="sv-btn peligro mini" data-borrar="' + esc(p.id) + '">✕</button>'
      + '</td></tr>';
  }

  function vistaAjustesNube() {
    return ''
      + '<div class="admin-nota">Sesión de <strong>' + esc(SYNC.socioActual()) + '</strong>. '
      + 'Los datos viven en la nube y los ven los dos socios.</div>'
      + '<div class="admin-sec-titulo">Mantener el respaldo de la página al día</div>'
      + '<p style="font-size:13px;color:rgba(245,233,200,.55);line-height:1.7;margin-bottom:14px">'
      + 'La página guarda una copia del catálogo (<code style="color:var(--oro)">products.js</code>) que se '
      + 'usa mientras carga la nube. Si agregaste o cambiaste productos, descárgalo y súbelo a GitHub '
      + 'para que esa copia quede igual a la nube.</p>'
      + '<div class="acciones" style="margin-top:0">'
      +   '<button class="sv-btn" id="btn-export-prod">⬇ Exportar products.js</button>'
      + '</div>'
      + '<div class="admin-sec-titulo">Sesión</div>'
      + '<div class="acciones" style="margin-top:0">'
      +   '<button class="sv-btn sec" id="sb-salir">Cerrar sesión</button>'
      + '</div>';
  }

  function conectarNube() {
    const body = $('#admin-body');

    const rec = $('#sb-recargar');
    if (rec) rec.addEventListener('click', pintar);

    const sal = $('#sb-salir');
    if (sal) sal.addEventListener('click', salirNube);

    // Confirmar / cancelar pedidos
    body.querySelectorAll('[data-confirmar]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('¿Confirmar esta venta? Se descuenta el stock de estos productos.')) return;
      b.disabled = true;
      const r = await SYNC.confirmarPedido(parseInt(b.dataset.confirmar, 10));
      if (!r.ok) { toast('⚠️ ' + (r.msg || 'No se pudo')); b.disabled = false; return; }
      toast('Venta confirmada ✓');
      refrescarTienda();
      pintar();
    }));
    body.querySelectorAll('[data-cancelar]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('¿Cancelar este pedido? No contará como venta.')) return;
      b.disabled = true;
      try { await SYNC.cancelarPedido(parseInt(b.dataset.cancelar, 10)); } catch (e) { toast('⚠️ ' + e.message); b.disabled = false; return; }
      toast('Pedido cancelado');
      pintar();
    }));

    // Stock en línea
    body.querySelectorAll('[data-stock]').forEach(inp => {
      inp.addEventListener('change', async () => {
        const n = Math.max(0, parseInt(inp.value, 10) || 0);
        inp.value = n; inp.disabled = true;
        try { await SYNC.fijarStock(inp.dataset.stock, n); toast('Stock actualizado'); }
        catch (e) { toast('⚠️ ' + e.message); }
        inp.disabled = false;
        const p = cacheProductos.find(x => x.id === inp.dataset.stock); if (p) p.stock = n;
        refrescarTienda();
      });
    });

    // Editar / borrar / formulario
    body.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => {
      const p = cacheProductos.find(x => x.id === b.dataset.editar);
      if (!p) return;
      $('#form-prod').outerHTML = formProducto(p);
      conectarNube();
      $('#form-prod').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    body.querySelectorAll('[data-borrar]').forEach(b => b.addEventListener('click', async () => {
      const p = cacheProductos.find(x => x.id === b.dataset.borrar);
      if (!p || !confirm('¿Borrar "' + p.nombre + '" del catálogo?')) return;
      try { await SYNC.borrarProducto(p.id); } catch (e) { return toast('⚠️ ' + e.message); }
      toast('Producto borrado'); refrescarTienda(); pintar();
    }));

    const form = $('#form-prod');
    if (form) form.addEventListener('submit', async e => {
      e.preventDefault();
      const nombre = $('#f-nombre').value.trim();
      if (!nombre) return;
      const esEdicion = !!$('#f-id').value;
      const id = esEdicion ? $('#f-id').value : slug(nombre);
      if (!esEdicion && cacheProductos.some(x => x.id === id)) return toast('⚠️ Ya existe un producto con ese nombre');
      const prod = {
        id, nombre,
        precio: parseInt($('#f-precio').value, 10) || 0,
        costo: parseInt($('#f-costo').value, 10) || 0,
        stock: Math.max(0, parseInt($('#f-stock').value, 10) || 0),
        categoria: $('#f-cat').value.trim() || 'Otros',
        emoji: $('#f-emoji').value.trim() || '📦',
        badge: $('#f-badge').value.trim(),
        img: $('#f-img').value.trim(),
        desc: $('#f-desc').value.trim()
      };
      if (!esEdicion) prod.orden = cacheProductos.length;
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try { await SYNC.guardarProducto(prod); } catch (err) { btn.disabled = false; return toast('⚠️ ' + err.message); }
      toast(esEdicion ? 'Producto guardado ✓' : 'Producto agregado ✓');
      refrescarTienda(); pintar();
    });
    const cancelar = $('#cancelar-edit');
    if (cancelar) cancelar.addEventListener('click', () => pintar());

    const bExp = $('#btn-export-prod');
    if (bExp) bExp.addEventListener('click', () => exportarProducts(cacheProductos));
  }

  async function salirNube() {
    SYNC.salir();
    tab = 'resumen';
    mostrarLogin();
  }

  /* ═══════════════════ MODO LOCAL (respaldo) ═══════════════════ */

  function pintarLocal() {
    const body = $('#admin-body');
    if (tab === 'resumen') body.innerHTML = vistaResumen();
    else if (tab === 'productos') body.innerHTML = vistaProductos();
    else if (tab === 'ventas') body.innerHTML = vistaVentas();
    else if (tab === 'ajustes') body.innerHTML = vistaAjustes();
    conectar();
    body.scrollTop = 0;
  }

  function vistaResumen() {
    const r = S.resumen();
    const productos = S.getProductos();
    const top = Object.entries(r.porProducto).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, cant]) => { const p = productos.find(x => x.id === id); return { nombre: p ? p.nombre : id, cant }; });
    const bajos = productos.filter(p => p.stock <= 3).sort((a, b) => a.stock - b.stock);
    return ''
      + kpisResumen(r)
      + '<div class="admin-sec-titulo">Más vendidos</div>'
      + (top.length
        ? '<div class="tabla-scroll"><table class="sv-tabla"><tbody>'
          + top.map(t => '<tr><td>' + esc(t.nombre) + '</td>'
            + '<td class="num" style="color:var(--oro);font-weight:800">' + t.cant + ' und</td></tr>').join('')
          + '</tbody></table></div>'
        : '<p class="admin-tenue">Todavía no hay ventas registradas.</p>')
      + '<div class="admin-sec-titulo">Stock bajo (3 o menos)</div>'
      + (bajos.length
        ? '<div class="tabla-scroll"><table class="sv-tabla"><tbody>'
          + bajos.map(p => '<tr><td>' + esc(p.nombre) + '</td><td class="num">'
            + (p.stock <= 0 ? '<span class="pill-agotado">AGOTADO</span>'
              : '<span style="color:var(--oro);font-weight:800">' + p.stock + ' und</span>')
            + '</td></tr>').join('')
          + '</tbody></table></div>'
        : '<p class="admin-tenue">Todo con stock suficiente. 👌</p>');
  }

  function vistaProductos() {
    const productos = S.getProductos();
    const vendidos = S.resumen().porProducto;
    return ''
      + '<div class="admin-nota">Edita el stock directo en la tabla (se guarda solo). '
      + 'Estos cambios viven en <strong>este navegador</strong>: para que los vean tus clientes, '
      + 've a <strong>Ajustes → Exportar products.js</strong> y sube el archivo a GitHub.</div>'
      + '<div class="tabla-scroll"><table class="sv-tabla">'
      + '<thead><tr><th>Producto</th><th class="num">Precio</th><th class="num">Costo</th>'
      + '<th class="num">Stock</th><th class="num">Vendidos</th><th></th></tr></thead><tbody>'
      + productos.map(p => filaProducto(p, vendidos[p.id] || 0)).join('')
      + '</tbody></table></div>'
      + '<div class="admin-sec-titulo">Agregar / editar producto</div>'
      + formProducto();
  }

  function filaProducto(p, vendidos) {
    const foto = window.SVMiniatura ? window.SVMiniatura(p) : esc(p.emoji || '📦');
    return '<tr>'
      + '<td><div class="celda-prod"><div class="mini-foto foto-box">' + foto + '</div>'
      +   '<div><div style="font-weight:800;color:var(--crema)">' + esc(p.nombre) + '</div>'
      +   '<div style="font-size:11px;color:rgba(245,233,200,.3)">' + esc(p.categoria || 'Otros') + '</div></div></div></td>'
      + '<td class="num" style="color:var(--oro);font-weight:800">' + plata(p.precio) + '</td>'
      + '<td class="num" style="color:rgba(245,233,200,.4)">' + plata(p.costo) + '</td>'
      + '<td class="num"><input type="number" min="0" class="sv-input stock-input" data-stock="'
      +   esc(p.id) + '" value="' + p.stock + '"></td>'
      + '<td class="num">' + (vendidos ? vendidos + ' und' : '—') + '</td>'
      + '<td class="num" style="white-space:nowrap">'
      +   '<button class="sv-btn sec mini" data-editar="' + esc(p.id) + '">Editar</button> '
      +   '<button class="sv-btn peligro mini" data-borrar="' + esc(p.id) + '">✕</button>'
      + '</td></tr>';
  }

  // Formulario compartido por los dos modos.
  function formProducto(p) {
    p = p || {};
    const cats = NUBE ? cacheProductos : S.getProductos();
    return '<form id="form-prod" class="form-grid">'
      + '<input type="hidden" id="f-id" value="' + esc(p.id || '') + '">'
      + '<div class="full"><label class="sv-label">Nombre *</label>'
      +   '<input class="sv-input" id="f-nombre" required value="' + esc(p.nombre || '') + '" placeholder="Ej: Mayonesa Mavesa 920 g"></div>'
      + '<div><label class="sv-label">Precio de venta (COP) *</label>'
      +   '<input class="sv-input" id="f-precio" type="number" min="0" required value="' + (p.precio || '') + '" placeholder="26700"></div>'
      + '<div><label class="sv-label">Costo (COP)</label>'
      +   '<input class="sv-input" id="f-costo" type="number" min="0" value="' + (p.costo || '') + '" placeholder="23200"></div>'
      + '<div><label class="sv-label">Stock *</label>'
      +   '<input class="sv-input" id="f-stock" type="number" min="0" required value="' + (p.stock != null ? p.stock : '') + '" placeholder="5"></div>'
      + '<div><label class="sv-label">Categoría</label>'
      +   '<input class="sv-input" id="f-cat" value="' + esc(p.categoria || '') + '" placeholder="Bebidas" list="lista-cats">'
      +   '<datalist id="lista-cats">'
      +   Array.from(new Set(cats.map(x => x.categoria).filter(Boolean))).map(c => '<option value="' + esc(c) + '">').join('')
      +   '</datalist></div>'
      + '<div><label class="sv-label">Emoji (si no hay foto)</label>'
      +   '<input class="sv-input" id="f-emoji" value="' + esc(p.emoji || '') + '" placeholder="🥫" maxlength="4"></div>'
      + '<div><label class="sv-label">Etiqueta</label>'
      +   '<input class="sv-input" id="f-badge" value="' + esc(p.badge || '') + '" placeholder="POPULAR" maxlength="12"></div>'
      + '<div class="full"><label class="sv-label">Ruta de la foto</label>'
      +   '<input class="sv-input" id="f-img" value="' + esc(p.img || '') + '" placeholder="img/productos/nombre.jpg"></div>'
      + '<div class="full"><label class="sv-label">Descripción</label>'
      +   '<textarea class="sv-textarea" id="f-desc" placeholder="Una línea que antoje">' + esc(p.desc || '') + '</textarea></div>'
      + '<div class="full acciones" style="margin-top:0">'
      +   '<button type="submit" class="sv-btn">' + (p.id ? 'Guardar cambios' : '＋ Agregar producto') + '</button>'
      +   (p.id ? '<button type="button" class="sv-btn sec" id="cancelar-edit">Cancelar</button>' : '')
      + '</div>'
      + '</form>';
  }

  function vistaVentas() {
    const ventas = S.getVentas();
    const productos = S.getProductos();
    return ''
      + '<div class="admin-nota">Cuando te llegue un pedido por WhatsApp, <strong>copia el mensaje</strong> '
      + 'y pégalo aquí: la página lo lee, registra la venta y descuenta el stock.</div>'
      + '<label class="sv-label">Pegar pedido de WhatsApp</label>'
      + '<textarea class="sv-textarea" id="pegar-pedido" placeholder="NUEVO PEDIDO — Sabor Vinotinto&#10;&#10;Productos:&#10;• 2 x Malta 355 ml — $7.600&#10;..."></textarea>'
      + '<div class="acciones"><button class="sv-btn" id="btn-parsear">Leer y registrar venta</button></div>'
      + '<div class="admin-sec-titulo">O registrar a mano</div>'
      + '<div class="form-grid">'
      +   '<div><label class="sv-label">Producto</label><select class="sv-select" id="v-prod">'
      +   productos.map(p => '<option value="' + esc(p.id) + '"' + (p.stock <= 0 ? ' disabled' : '') + '>'
      +     esc(p.nombre) + ' (' + p.stock + ' disp.)</option>').join('')
      +   '</select></div>'
      +   '<div><label class="sv-label">Cantidad</label><input class="sv-input" id="v-cant" type="number" min="1" value="1"></div>'
      +   '<div class="full"><label class="sv-label">Cliente (opcional)</label><input class="sv-input" id="v-cli" placeholder="Nombre o teléfono"></div>'
      + '</div>'
      + '<div class="acciones"><button class="sv-btn sec" id="btn-venta-manual">Registrar venta</button></div>'
      + '<div class="admin-sec-titulo">Historial (' + ventas.length + ')</div>'
      + (ventas.length
        ? '<div class="tabla-scroll"><table class="sv-tabla"><thead><tr><th>Pedido</th><th>Productos</th><th class="num">Total</th><th></th></tr></thead><tbody>'
          + ventas.map(v => '<tr>'
            + '<td><div style="font-weight:800;color:var(--crema)">' + esc(v.id) + '</div>'
            +   '<div class="admin-tenue" style="font-size:11px">' + esc(fecha(v.fecha)) + '</div>'
            +   (v.cliente ? '<div style="font-size:11px;color:var(--oro)">' + esc(v.cliente) + '</div>' : '') + '</td>'
            + '<td style="font-size:12px;color:rgba(245,233,200,.6)">' + v.items.map(l => esc(l.cant + ' × ' + l.nombre)).join('<br>') + '</td>'
            + '<td class="num" style="color:var(--oro);font-weight:800">' + plata(v.total) + '</td>'
            + '<td class="num"><button class="sv-btn peligro mini" data-anular="' + esc(v.id) + '">Anular</button></td>'
            + '</tr>').join('')
          + '</tbody></table></div>'
        : '<div class="admin-vacio"><div>🧾</div>Todavía no hay ventas registradas</div>');
  }

  function vistaAjustes() {
    return ''
      + '<div class="admin-nota">Tus datos (stock, precios, ventas) viven solo en este navegador. '
      + 'Si limpias el caché o entras desde otro celular, no van a estar. '
      + '<strong>Descarga un respaldo cada tanto.</strong></div>'
      + '<div class="admin-sec-titulo">Publicar cambios para tus clientes</div>'
      + '<p style="font-size:13px;color:rgba(245,233,200,.55);line-height:1.7;margin-bottom:14px">'
      + 'Descarga el archivo y súbelo a GitHub reemplazando <code style="color:var(--oro)">assets/js/products.js</code>.</p>'
      + '<div class="acciones" style="margin-top:0"><button class="sv-btn" id="btn-export-prod">⬇ Exportar products.js</button></div>'
      + '<div class="admin-sec-titulo">Respaldo</div>'
      + '<div class="acciones" style="margin-top:0">'
      +   '<button class="sv-btn sec" id="btn-backup">⬇ Descargar respaldo (.json)</button>'
      +   '<button class="sv-btn sec" id="btn-restaurar-file">⬆ Restaurar respaldo</button>'
      +   '<input type="file" id="file-backup" accept="application/json,.json" style="display:none">'
      + '</div>'
      + '<div class="admin-sec-titulo">Zona peligrosa</div>'
      + '<div class="acciones" style="margin-top:0">'
      +   '<button class="sv-btn peligro" id="btn-reset-cat">Restaurar catálogo original</button>'
      +   '<button class="sv-btn peligro" id="btn-borrar-ventas">Borrar historial de ventas</button>'
      + '</div>';
  }

  function conectar() {
    const body = $('#admin-body');
    body.querySelectorAll('[data-stock]').forEach(inp => {
      inp.addEventListener('change', () => {
        const n = Math.max(0, parseInt(inp.value, 10) || 0);
        inp.value = n;
        S.guardarProducto({ id: inp.dataset.stock, stock: n });
        refrescarTienda(); toast('Stock actualizado');
      });
    });
    body.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => {
      const p = S.getProducto(b.dataset.editar); if (!p) return;
      $('#form-prod').outerHTML = formProducto(p); conectar();
      $('#form-prod').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    body.querySelectorAll('[data-borrar]').forEach(b => b.addEventListener('click', () => {
      const p = S.getProducto(b.dataset.borrar); if (!p) return;
      if (!confirm('¿Borrar "' + p.nombre + '" del catálogo?')) return;
      S.borrarProducto(p.id); refrescarTienda(); pintar(); toast('Producto borrado');
    }));
    const form = $('#form-prod');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const nombre = $('#f-nombre').value.trim(); if (!nombre) return;
      const esEdicion = !!$('#f-id').value;
      const id = esEdicion ? $('#f-id').value : slug(nombre);
      if (!esEdicion && S.getProducto(id)) return toast('⚠️ Ya existe un producto con ese nombre');
      S.guardarProducto({
        id, nombre,
        precio: parseInt($('#f-precio').value, 10) || 0,
        costo: parseInt($('#f-costo').value, 10) || 0,
        stock: Math.max(0, parseInt($('#f-stock').value, 10) || 0),
        categoria: $('#f-cat').value.trim() || 'Otros',
        emoji: $('#f-emoji').value.trim() || '📦',
        badge: $('#f-badge').value.trim(),
        img: $('#f-img').value.trim(),
        desc: $('#f-desc').value.trim()
      });
      refrescarTienda(); pintar(); toast(esEdicion ? 'Producto guardado ✓' : 'Producto agregado ✓');
    });
    const cancelar = $('#cancelar-edit');
    if (cancelar) cancelar.addEventListener('click', () => pintar());

    const btnParsear = $('#btn-parsear');
    if (btnParsear) btnParsear.addEventListener('click', () => {
      const r = parsearPedido($('#pegar-pedido').value);
      if (!r.ok) return toast('⚠️ ' + r.msg);
      const res = S.registrarVenta(r.items, r.cliente, { permitirNegativo: true });
      if (!res.ok) return toast('⚠️ ' + res.msg);
      refrescarTienda(); pintar(); toast('Venta ' + res.venta.id + ' registrada ✓');
    });
    const btnManual = $('#btn-venta-manual');
    if (btnManual) btnManual.addEventListener('click', () => {
      const id = $('#v-prod').value;
      const cant = Math.max(1, parseInt($('#v-cant').value, 10) || 1);
      const res = S.registrarVenta([{ id, cant }], $('#v-cli').value.trim());
      if (!res.ok) return toast('⚠️ ' + res.msg);
      refrescarTienda(); pintar(); toast('Venta registrada ✓');
    });
    body.querySelectorAll('[data-anular]').forEach(b => b.addEventListener('click', () => {
      if (!confirm('¿Anular esta venta? El stock se devuelve al inventario.')) return;
      S.borrarVenta(b.dataset.anular); refrescarTienda(); pintar(); toast('Venta anulada, stock devuelto');
    }));

    const bExp = $('#btn-export-prod');
    if (bExp) bExp.addEventListener('click', () => exportarProducts(S.getProductos()));
    const bBk = $('#btn-backup');
    if (bBk) bBk.addEventListener('click', () => {
      descargar('sabor-vinotinto-respaldo-' + new Date().toISOString().slice(0, 10) + '.json',
        JSON.stringify({ productos: S.getProductos(), ventas: S.getVentas() }, null, 2));
      toast('Respaldo descargado');
    });
    const bRest = $('#btn-restaurar-file');
    if (bRest) bRest.addEventListener('click', () => $('#file-backup').click());
    const fB = $('#file-backup');
    if (fB) fB.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const data = JSON.parse(fr.result);
          if (!data.productos) throw new Error('sin productos');
          if (!confirm('Esto reemplaza tus productos y ventas actuales. ¿Seguir?')) return;
          S.setProductos(data.productos); S.setVentas(data.ventas || []);
          refrescarTienda(); pintar(); toast('Respaldo restaurado ✓');
        } catch (err) { toast('⚠️ No pude leer ese archivo'); }
      };
      fr.readAsText(file); e.target.value = '';
    });
    const bReset = $('#btn-reset-cat');
    if (bReset) bReset.addEventListener('click', () => {
      if (!confirm('Vuelve el catálogo a como está en products.js. Se pierden los cambios. ¿Seguir?')) return;
      S.restaurarCatalogo(); refrescarTienda(); pintar(); toast('Catálogo restaurado');
    });
    const bBorrar = $('#btn-borrar-ventas');
    if (bBorrar) bBorrar.addEventListener('click', () => {
      if (!confirm('Borra TODO el historial de ventas. El stock no se toca. ¿Seguir?')) return;
      S.setVentas([]); pintar(); toast('Historial borrado');
    });
  }

  function parsearPedido(texto) {
    if (!texto || !texto.trim()) return { ok: false, msg: 'Pega primero el mensaje' };
    const productos = S.getProductos();
    const items = [], noEncontrados = [];
    const normalizar = s => sinTildes(s).replace(/\s+/g, ' ').trim();
    texto.split('\n').forEach(linea => {
      const m = linea.match(/^\s*[•·*-]\s*(\d+)\s*[x×]\s*(.+?)\s*[—–-]\s*\$/i);
      if (!m) return;
      const p = productos.find(x => normalizar(x.nombre) === normalizar(m[2]));
      if (p) items.push({ id: p.id, cant: parseInt(m[1], 10) });
      else noEncontrados.push(m[2]);
    });
    if (!items.length) return { ok: false, msg: 'No encontré productos en ese texto' };
    if (noEncontrados.length) alert('Estos productos ya no están en el catálogo y no se registraron:\n\n• ' + noEncontrados.join('\n• '));
    const mCli = texto.match(/\*?Cliente:\*?\s*(.+)/i) || texto.match(/👤\s*(.+)/);
    return { ok: true, items, cliente: mCli ? mCli[1].trim() : '' };
  }

  /* Exporta products.js (el respaldo del catálogo). Sirve en ambos modos. */
  function exportarProducts(productos) {
    const cuerpo = productos.map(p => '  {\n'
      + '    id: ' + JSON.stringify(p.id) + ',\n'
      + '    nombre: ' + JSON.stringify(p.nombre) + ',\n'
      + '    categoria: ' + JSON.stringify(p.categoria || 'Otros') + ',\n'
      + '    precio: ' + (p.precio || 0) + ',\n'
      + '    costo: ' + (p.costo || 0) + ',\n'
      + '    stock: ' + (p.stock || 0) + ',\n'
      + '    emoji: ' + JSON.stringify(p.emoji || '📦') + ',\n'
      + '    img: ' + JSON.stringify(p.img || '') + ',\n'
      + '    desc: ' + JSON.stringify(p.desc || '') + ',\n'
      + '    badge: ' + JSON.stringify(p.badge || '') + '\n'
      + '  }').join(',\n');
    const hoy = new Date();
    const version = hoy.toISOString().slice(0, 10) + '-' + hoy.getTime().toString(36).slice(-4);
    const archivo = '/* Catálogo de Sabor Vinotinto.\n'
      + '   Exportado desde el panel de admin el ' + hoy.toLocaleString('es-CO') + '.\n'
      + '   Reemplaza assets/js/products.js con este archivo y súbelo a GitHub. */\n'
      + 'window.SV_CATALOGO_VERSION = ' + JSON.stringify(version) + ';\n\n'
      + 'window.SV_PRODUCTS = [\n' + cuerpo + '\n];\n';
    descargar('products.js', archivo);
    toast('products.js descargado — súbelo a GitHub');
  }

  /* ── Arranque ── */
  document.addEventListener('DOMContentLoaded', function () {
    if (NUBE) SYNC.cargarSesion();
    $('#btn-admin').addEventListener('click', abrir);
    $('#admin-cerrar').addEventListener('click', cerrar);
    $('#admin-overlay').addEventListener('click', e => { if (e.target === $('#admin-overlay')) cerrar(); });
    $('#admin-entrar').addEventListener('click', entrar);
    $('#admin-pin').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
    $('#admin-correo').addEventListener('keydown', e => { if (e.key === 'Enter') $('#admin-pin').focus(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('#admin-overlay').classList.contains('abierto')) cerrar();
    });
  });
})();

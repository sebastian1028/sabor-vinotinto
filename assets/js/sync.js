/* Capa de nube de Sabor Vinotinto (Supabase).

   Aquí vive todo lo que se comparte entre los dos socios: el catálogo con su
   stock y precio, y los pedidos. Se habla con Supabase por su API REST con
   fetch, sin librerías ni CDN.

   Si en config.js no hay datos de Supabase, configurado() devuelve false y la
   página sigue funcionando en modo local (como antes): la tienda muestra el
   catálogo de products.js y el admin usa el guardado del navegador. Así nada
   se rompe mientras no esté conectado.

   Reglas de seguridad (viven en la base de datos, ver README):
   - Productos: cualquiera los LEE (la tienda los muestra); solo un socio con
     sesión puede cambiarlos.
   - Pedidos: cualquiera puede CREAR uno (entra como 'pendiente'); solo un socio
     los lee, confirma o cancela.
   La llave "anon" de config.js es pública a propósito y no da permisos extra:
   la base de datos es la que manda. */
window.SVSync = (function () {
  const CFG = window.SV_CONFIG || {};
  const URL_BASE = (CFG.supabaseUrl || '').replace(/\/+$/, '');
  const LLAVE = CFG.supabaseAnonKey || '';
  const K_SESION = 'sv_sesion'; // tokens del socio, en su propio navegador

  let sesion = null; // { access_token, refresh_token, correo }

  function configurado() { return !!(URL_BASE && LLAVE); }

  /* ── Sesión del socio ── */
  function cargarSesion() {
    try { sesion = JSON.parse(localStorage.getItem(K_SESION)) || null; } catch (e) { sesion = null; }
    return sesion;
  }
  function guardarSesion(s) {
    sesion = s;
    try {
      if (s) localStorage.setItem(K_SESION, JSON.stringify(s));
      else localStorage.removeItem(K_SESION);
    } catch (e) {}
  }
  function haySesion() { return !!(sesion && sesion.access_token); }
  function socioActual() { return sesion ? sesion.correo : ''; }

  function cabeceras(conSesion, extra) {
    const token = (conSesion && sesion && sesion.access_token) ? sesion.access_token : LLAVE;
    return Object.assign({
      'apikey': LLAVE,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  /* Petición REST. Si el token del socio caducó (401), intenta renovarlo una
     vez con el refresh_token y reintenta; si tampoco, cierra la sesión. */
  async function pedir(ruta, opciones, conSesion, esReintento) {
    if (!configurado()) throw new Error('Supabase no está configurado');
    const op = Object.assign({}, opciones);
    op.headers = cabeceras(conSesion, (opciones || {}).headers);
    const r = await fetch(URL_BASE + ruta, op);

    if (r.status === 401 && conSesion && !esReintento && sesion && sesion.refresh_token) {
      const ok = await renovar();
      if (ok) return pedir(ruta, opciones, conSesion, true);
      guardarSesion(null);
      throw new Error('Tu sesión se venció, vuelve a entrar');
    }
    if (!r.ok) {
      const detalle = await r.text().catch(() => '');
      throw new Error('Supabase ' + r.status + ': ' + detalle.slice(0, 180));
    }
    return r.status === 204 ? null : r.json();
  }

  async function renovar() {
    try {
      const r = await fetch(URL_BASE + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'apikey': LLAVE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sesion.refresh_token })
      });
      const d = await r.json();
      if (!r.ok || !d.access_token) return false;
      guardarSesion({ access_token: d.access_token, refresh_token: d.refresh_token, correo: socioActual() });
      return true;
    } catch (e) { return false; }
  }

  async function entrar(correo, clave) {
    if (!configurado()) return { ok: false, msg: 'Las ventas en la nube no están conectadas todavía' };
    try {
      const r = await fetch(URL_BASE + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': LLAVE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim(), password: clave })
      });
      const d = await r.json();
      if (!r.ok || !d.access_token) {
        // El servidor responde en inglés; se traducen los casos comunes.
        const cod = d.error_code || d.error || '';
        let msg = d.error_description || d.msg || 'No se pudo entrar';
        if (/invalid_credentials|invalid login/i.test(cod + ' ' + msg)) msg = 'Correo o contraseña incorrectos';
        else if (/email not confirmed/i.test(msg)) msg = 'Ese usuario no está confirmado (actívalo en Supabase)';
        return { ok: false, msg: msg };
      }
      guardarSesion({ access_token: d.access_token, refresh_token: d.refresh_token, correo: correo.trim() });
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: 'No hay conexión con el servidor' };
    }
  }

  function salir() { guardarSesion(null); }

  /* ── Productos (catálogo compartido) ── */
  async function getProductos() {
    const arr = await pedir('/rest/v1/productos?select=*&order=orden.asc', { method: 'GET' }, false);
    return (arr || []).map(mapDesde);
  }

  // La base usa "descripcion" (sin acento en columna); la app usa "desc".
  function mapDesde(p) {
    return {
      id: p.id, nombre: p.nombre, categoria: p.categoria, precio: p.precio,
      costo: p.costo, stock: p.stock, emoji: p.emoji, img: p.img,
      desc: p.descripcion, badge: p.badge, orden: p.orden
    };
  }
  function mapHacia(p) {
    const o = {};
    if (p.id != null) o.id = p.id;
    if (p.nombre != null) o.nombre = p.nombre;
    if (p.categoria != null) o.categoria = p.categoria;
    if (p.precio != null) o.precio = p.precio;
    if (p.costo != null) o.costo = p.costo;
    if (p.stock != null) o.stock = p.stock;
    if (p.emoji != null) o.emoji = p.emoji;
    if (p.img != null) o.img = p.img;
    if (p.desc != null) o.descripcion = p.desc;
    if (p.badge != null) o.badge = p.badge;
    if (p.orden != null) o.orden = p.orden;
    return o;
  }

  async function guardarProducto(prod) {
    // upsert: crea si no existe, actualiza si ya está (por id)
    await pedir('/rest/v1/productos', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(mapHacia(prod))
    }, true);
    return { ok: true };
  }

  async function fijarStock(id, stock) {
    await pedir('/rest/v1/productos?id=eq.' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ stock: Math.max(0, stock | 0) })
    }, true);
    return { ok: true };
  }

  async function borrarProducto(id) {
    await pedir('/rest/v1/productos?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: { 'Prefer': 'return=minimal' }
    }, true);
    return { ok: true };
  }

  // Siembra el catálogo desde products.js la primera vez (tabla vacía).
  async function sembrarSiVacio(productosBase) {
    const hay = await pedir('/rest/v1/productos?select=id&limit=1', { method: 'GET' }, false);
    if (hay && hay.length) return { ok: true, sembrado: false };
    const filas = productosBase.map((p, i) => mapHacia(Object.assign({ orden: i }, p)));
    await pedir('/rest/v1/productos', {
      method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(filas)
    }, true);
    return { ok: true, sembrado: true };
  }

  /* ── Pedidos ── */
  // Lo crea el cliente desde la tienda: entra como 'pendiente', no descuenta nada.
  async function crearPedido(p) {
    const fila = {
      items: p.items, total: p.total, costo_total: p.costoTotal || 0,
      cliente: p.cliente || '', telefono: p.telefono || '',
      ciudad: p.ciudad || '', direccion: p.direccion || '', ubicacion: p.ubicacion || ''
    };
    await pedir('/rest/v1/pedidos', {
      method: 'POST', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(fila)
    }, false);
    return { ok: true };
  }

  async function getPedidos(estado) {
    let q = '/rest/v1/pedidos?select=*&order=creado.desc';
    if (estado) q += '&estado=eq.' + estado;
    return pedir(q, { method: 'GET' }, true);
  }

  // Confirma y descuenta stock en una sola operación (función en la base de
  // datos, para que no choquen los dos socios si confirman a la vez).
  async function confirmarPedido(id) {
    try {
      await pedir('/rest/v1/rpc/confirmar_pedido', {
        method: 'POST', headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ pid: id, socio: socioActual() })
      }, true);
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  async function cancelarPedido(id) {
    await pedir('/rest/v1/pedidos?id=eq.' + id, {
      method: 'PATCH', headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({ estado: 'cancelado' })
    }, true);
    return { ok: true };
  }

  // Deshace una venta ya confirmada (por si se confirmó por error): devuelve el
  // stock al inventario y la saca de las ventas. Lo hace la función de la base
  // de datos, en una sola operación, para que quede todo cuadrado.
  async function anularVenta(id) {
    try {
      await pedir('/rest/v1/rpc/anular_venta', {
        method: 'POST', headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({ pid: id })
      }, true);
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  /* ── Ajustes del negocio (el plante/inversión, compartido entre socios) ── */
  async function getInversion() {
    try {
      const r = await pedir('/rest/v1/ajustes?select=valor&clave=eq.inversion', { method: 'GET' }, false);
      if (r && r.length) return parseInt(r[0].valor, 10) || 0;
    } catch (e) { console.warn('No se pudo leer el plante de la nube', e); }
    return null; // null = usar el de config.js como respaldo
  }

  async function setInversion(valor) {
    await pedir('/rest/v1/ajustes', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ clave: 'inversion', valor: String(Math.max(0, valor | 0)) })
    }, true);
    return { ok: true };
  }

  /* ── Resumen para el panel (calculado desde los pedidos confirmados) ── */
  function calcularResumen(confirmados, productos) {
    const ingresos = confirmados.reduce((s, v) => s + (v.total || 0), 0);
    const costos = confirmados.reduce((s, v) => s + (v.costo_total || 0), 0);
    const unidades = confirmados.reduce((s, v) =>
      s + (v.items || []).reduce((a, l) => a + (l.cant || 0), 0), 0);

    const porProducto = {};
    for (const v of confirmados) {
      for (const l of (v.items || [])) porProducto[l.id] = (porProducto[l.id] || 0) + l.cant;
    }
    return {
      pedidos: confirmados.length,
      ingresos: ingresos,
      ganancia: ingresos - costos,
      unidades: unidades,
      stockTotal: productos.reduce((s, p) => s + (p.stock || 0), 0),
      valorInventario: productos.reduce((s, p) => s + (p.stock || 0) * (p.precio || 0), 0),
      agotados: productos.filter(p => (p.stock || 0) <= 0).length,
      porProducto: porProducto
    };
  }

  return {
    configurado: configurado,
    cargarSesion: cargarSesion,
    haySesion: haySesion,
    socioActual: socioActual,
    entrar: entrar,
    salir: salir,
    getProductos: getProductos,
    guardarProducto: guardarProducto,
    fijarStock: fijarStock,
    borrarProducto: borrarProducto,
    sembrarSiVacio: sembrarSiVacio,
    crearPedido: crearPedido,
    getPedidos: getPedidos,
    confirmarPedido: confirmarPedido,
    cancelarPedido: cancelarPedido,
    anularVenta: anularVenta,
    getInversion: getInversion,
    setInversion: setInversion,
    calcularResumen: calcularResumen
  };
})();

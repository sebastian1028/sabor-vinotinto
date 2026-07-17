/* Capa de datos de Sabor Vinotinto.
   Todo vive en localStorage del navegador. Si mañana se conecta un backend,
   solo hay que reimplementar estas funciones: nadie más toca localStorage. */
window.SVStore = (function () {
  const K_PROD = 'sv_productos';
  const K_VENT = 'sv_ventas';
  const K_CART = 'sv_carrito';
  const K_VER = 'sv_catalogo_version';

  function leer(clave, porDefecto) {
    try {
      const raw = localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : porDefecto;
    } catch (e) {
      console.warn('No se pudo leer ' + clave, e);
      return porDefecto;
    }
  }

  function escribir(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar ' + clave, e);
      return false;
    }
  }

  /* ── Productos ── */
  // Manda lo guardado en el navegador (el admin pudo cambiar stock o precios),
  // PERO si se publicó un catálogo nuevo en GitHub, ese gana y se resiembra.
  // Sin esto, un cliente que ya entró se quedaría con el catálogo viejo para
  // siempre y nunca vería los productos nuevos.
  function getProductos() {
    const versionPublicada = window.SV_CATALOGO_VERSION || '0';
    const versionGuardada = leer(K_VER, null);
    const guardados = leer(K_PROD, null);

    const hayGuardados = guardados && Array.isArray(guardados) && guardados.length;
    if (hayGuardados && versionGuardada === versionPublicada) return guardados;

    return restaurarCatalogo();
  }

  function setProductos(arr) { escribir(K_PROD, arr); }

  function getProducto(id) { return getProductos().find(p => p.id === id) || null; }

  function guardarProducto(prod) {
    const arr = getProductos();
    const i = arr.findIndex(p => p.id === prod.id);
    if (i >= 0) arr[i] = Object.assign({}, arr[i], prod);
    else arr.push(prod);
    setProductos(arr);
  }

  function borrarProducto(id) {
    setProductos(getProductos().filter(p => p.id !== id));
  }

  // Vuelve al catálogo tal como está publicado en products.js.
  function restaurarCatalogo() {
    const base = (window.SV_PRODUCTS || []).map(p => Object.assign({}, p));
    setProductos(base);
    escribir(K_VER, window.SV_CATALOGO_VERSION || '0');
    return base;
  }

  /* ── Carrito ── */
  function getCarrito() {
    const c = leer(K_CART, []);
    return Array.isArray(c) ? c : [];
  }

  function setCarrito(items) { escribir(K_CART, items); }

  function agregarAlCarrito(id, cant) {
    cant = cant || 1;
    const carrito = getCarrito();
    const prod = getProducto(id);
    if (!prod) return { ok: false, msg: 'Producto no encontrado' };

    const linea = carrito.find(l => l.id === id);
    const yaEnCarrito = linea ? linea.cant : 0;
    if (yaEnCarrito + cant > prod.stock) {
      return { ok: false, msg: 'Solo quedan ' + prod.stock + ' en stock' };
    }
    if (linea) linea.cant += cant;
    else carrito.push({ id: id, cant: cant });
    setCarrito(carrito);
    return { ok: true };
  }

  function cambiarCantidad(id, cant) {
    const carrito = getCarrito();
    const linea = carrito.find(l => l.id === id);
    if (!linea) return;
    const prod = getProducto(id);
    if (cant <= 0) return quitarDelCarrito(id);
    if (prod && cant > prod.stock) cant = prod.stock;
    linea.cant = cant;
    setCarrito(carrito);
  }

  function quitarDelCarrito(id) {
    setCarrito(getCarrito().filter(l => l.id !== id));
  }

  function vaciarCarrito() { setCarrito([]); }

  // Une el carrito con los datos actuales del producto y descarta lo que ya no existe.
  function carritoDetallado() {
    const productos = getProductos();
    return getCarrito().reduce(function (acc, linea) {
      const p = productos.find(x => x.id === linea.id);
      if (!p) return acc;
      const cant = Math.min(linea.cant, p.stock);
      if (cant <= 0) return acc;
      acc.push({
        id: p.id, nombre: p.nombre, precio: p.precio, costo: p.costo,
        emoji: p.emoji, img: p.img, stock: p.stock,
        cant: cant, subtotal: p.precio * cant
      });
      return acc;
    }, []);
  }

  function totalCarrito() {
    return carritoDetallado().reduce((s, l) => s + l.subtotal, 0);
  }

  function unidadesCarrito() {
    return carritoDetallado().reduce((s, l) => s + l.cant, 0);
  }

  /* ── Ventas ── */
  function getVentas() {
    const v = leer(K_VENT, []);
    return Array.isArray(v) ? v : [];
  }

  function setVentas(arr) { escribir(K_VENT, arr); }

  // Registra la venta y descuenta el stock. items: [{id, cant}]
  function registrarVenta(items, cliente, opciones) {
    opciones = opciones || {};
    const productos = getProductos();
    const lineas = [];

    for (const it of items) {
      const p = productos.find(x => x.id === it.id);
      if (!p) return { ok: false, msg: 'Producto no encontrado: ' + it.id };
      if (!opciones.permitirNegativo && it.cant > p.stock) {
        return { ok: false, msg: 'No hay stock suficiente de ' + p.nombre + ' (quedan ' + p.stock + ')' };
      }
      lineas.push({
        id: p.id, nombre: p.nombre, precio: p.precio,
        costo: p.costo || 0, cant: it.cant, subtotal: p.precio * it.cant
      });
    }

    for (const l of lineas) {
      const p = productos.find(x => x.id === l.id);
      p.stock = Math.max(0, p.stock - l.cant);
    }
    setProductos(productos);

    const venta = {
      id: nuevoIdVenta(),
      fecha: new Date().toISOString(),
      cliente: cliente || '',
      items: lineas,
      total: lineas.reduce((s, l) => s + l.subtotal, 0),
      costoTotal: lineas.reduce((s, l) => s + l.costo * l.cant, 0)
    };

    const ventas = getVentas();
    ventas.unshift(venta);
    setVentas(ventas);
    return { ok: true, venta: venta };
  }

  // Borra la venta y devuelve el stock que había descontado.
  function borrarVenta(id) {
    const ventas = getVentas();
    const venta = ventas.find(v => v.id === id);
    if (!venta) return { ok: false };
    const productos = getProductos();
    for (const l of venta.items) {
      const p = productos.find(x => x.id === l.id);
      if (p) p.stock += l.cant;
    }
    setProductos(productos);
    setVentas(ventas.filter(v => v.id !== id));
    return { ok: true };
  }

  function nuevoIdVenta() {
    const n = getVentas().length + 1;
    return 'SV-' + String(n).padStart(4, '0') + '-' + Date.now().toString(36).slice(-3).toUpperCase();
  }

  /* ── Resumen para el admin ── */
  function resumen() {
    const ventas = getVentas();
    const productos = getProductos();
    const ingresos = ventas.reduce((s, v) => s + v.total, 0);
    const costos = ventas.reduce((s, v) => s + (v.costoTotal || 0), 0);
    const unidades = ventas.reduce((s, v) => s + v.items.reduce((a, l) => a + l.cant, 0), 0);

    // Cuántas unidades se vendieron de cada producto.
    const porProducto = {};
    for (const v of ventas) {
      for (const l of v.items) {
        porProducto[l.id] = (porProducto[l.id] || 0) + l.cant;
      }
    }

    return {
      pedidos: ventas.length,
      ingresos: ingresos,
      ganancia: ingresos - costos,
      unidades: unidades,
      stockTotal: productos.reduce((s, p) => s + p.stock, 0),
      valorInventario: productos.reduce((s, p) => s + p.stock * p.precio, 0),
      agotados: productos.filter(p => p.stock <= 0).length,
      porProducto: porProducto
    };
  }

  return {
    getProductos: getProductos,
    setProductos: setProductos,
    getProducto: getProducto,
    guardarProducto: guardarProducto,
    borrarProducto: borrarProducto,
    restaurarCatalogo: restaurarCatalogo,
    getCarrito: getCarrito,
    agregarAlCarrito: agregarAlCarrito,
    cambiarCantidad: cambiarCantidad,
    quitarDelCarrito: quitarDelCarrito,
    vaciarCarrito: vaciarCarrito,
    carritoDetallado: carritoDetallado,
    totalCarrito: totalCarrito,
    unidadesCarrito: unidadesCarrito,
    getVentas: getVentas,
    setVentas: setVentas,
    registrarVenta: registrarVenta,
    borrarVenta: borrarVenta,
    resumen: resumen
  };
})();

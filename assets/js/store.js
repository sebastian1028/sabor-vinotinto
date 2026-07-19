/* Datos de la tienda de Sabor Vinotinto.
   Solo dos cosas: el catálogo (lo lee de products.js) y el carrito (que se
   guarda en este navegador para no perderlo al recargar). No hay panel ni base
   de datos: el pedido se arma aquí y se manda por WhatsApp. */
window.SVStore = (function () {
  const K_CART = 'sv_carrito';

  function leer(clave, porDefecto) {
    try { const raw = localStorage.getItem(clave); return raw ? JSON.parse(raw) : porDefecto; }
    catch (e) { return porDefecto; }
  }
  function escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
  }

  /* ── Catálogo ── */
  function getProductos() {
    return (window.SV_PRODUCTS || []).map(p => Object.assign({}, p));
  }
  function getProducto(id) {
    return getProductos().find(p => p.id === id) || null;
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
    if (!getProducto(id)) return { ok: false, msg: 'Producto no encontrado' };
    const linea = carrito.find(l => l.id === id);
    if (linea) linea.cant += cant;
    else carrito.push({ id: id, cant: cant });
    setCarrito(carrito);
    return { ok: true };
  }

  function cambiarCantidad(id, cant) {
    const carrito = getCarrito();
    const linea = carrito.find(l => l.id === id);
    if (!linea) return;
    if (cant <= 0) return quitarDelCarrito(id);
    linea.cant = cant;
    setCarrito(carrito);
  }

  function quitarDelCarrito(id) {
    setCarrito(getCarrito().filter(l => l.id !== id));
  }
  function vaciarCarrito() { setCarrito([]); }

  // Une el carrito con los datos actuales del producto y descarta lo que ya no exista.
  function carritoDetallado() {
    const productos = getProductos();
    return getCarrito().reduce(function (acc, linea) {
      const p = productos.find(x => x.id === linea.id);
      if (!p) return acc;
      const cant = Math.max(1, linea.cant);
      acc.push({
        id: p.id, nombre: p.nombre, precio: p.precio,
        emoji: p.emoji, img: p.img, cant: cant, subtotal: p.precio * cant
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

  return {
    getProductos: getProductos,
    getProducto: getProducto,
    getCarrito: getCarrito,
    agregarAlCarrito: agregarAlCarrito,
    cambiarCantidad: cambiarCantidad,
    quitarDelCarrito: quitarDelCarrito,
    vaciarCarrito: vaciarCarrito,
    carritoDetallado: carritoDetallado,
    totalCarrito: totalCarrito,
    unidadesCarrito: unidadesCarrito
  };
})();

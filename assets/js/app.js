/* Tienda de Sabor Vinotinto: catálogo, carrito y pedido por WhatsApp. */
(function () {
  const CFG = window.SV_CONFIG;
  const S = window.SVStore;

  /* ── Utilidades ── */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // $12.345 — el peso colombiano no usa decimales.
  function plata(n) {
    return '$' + Math.round(n).toLocaleString('es-CO');
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }

  function waLink(texto) {
    return 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(texto);
  }

  /* Miniatura de un producto: pinta el emoji y encima la foto.
     Si la foto no existe (o todavía no la subes), queda el emoji.
     Se usa en las tarjetas, el carrito y el admin, para que se comporten igual. */
  function miniatura(p) {
    const emoji = '<span class="foto-emoji">' + esc(p.emoji || '📦') + '</span>';
    const img = p.img
      ? '<img src="' + esc(p.img) + '" alt="" loading="lazy" data-intento="0"'
        + ' onload="this.parentNode.classList.add(\'con-foto\')"'
        + ' onerror="window.SVFotoFallo(this)">'
      : '';
    return emoji + img;
  }
  window.SVMiniatura = miniatura;

  /* Si la foto no está con la extensión escrita en products.js, prueba las otras
     antes de rendirse. Así da igual si guardas la foto como .jpg, .png o .webp. */
  const EXTENSIONES = ['.jpg', '.png', '.jpeg'];
  window.SVFotoFallo = function (img) {
    const intento = parseInt(img.dataset.intento, 10) + 1;
    const base = img.getAttribute('src').replace(/\.[a-z0-9]+$/i, '');
    if (intento >= EXTENSIONES.length) { img.remove(); return; } // se queda el emoji
    img.dataset.intento = intento;
    img.src = base + EXTENSIONES[intento];
  };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('visible'), 2200);
  }
  window.SVToast = toast;

  /* ── Catálogo ── */
  let filtroActivo = 'Todos';

  function categorias() {
    const cats = S.getProductos().map(p => p.categoria || 'Otros');
    return ['Todos'].concat(Array.from(new Set(cats)));
  }

  function pintarFiltros() {
    const cont = $('#filtros');
    if (!cont) return;
    cont.innerHTML = categorias().map(c =>
      '<button class="filtro' + (c === filtroActivo ? ' activo' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'
    ).join('');
    cont.querySelectorAll('.filtro').forEach(b => {
      b.addEventListener('click', () => {
        filtroActivo = b.dataset.cat;
        pintarFiltros();
        pintarCatalogo();
      });
    });
  }

  function tarjeta(p) {
    const agotado = p.stock <= 0;

    const badge = p.badge
      ? '<span class="prod-badge">' + esc(p.badge) + '</span>' : '';
    // No se muestra cuántas unidades quedan: al cliente no le suma saber que
    // hay 2, y hace ver la tienda pequeña. Solo se avisa si ya se acabó.
    const stockPill = agotado
      ? '<span class="prod-stock agotado-pill">AGOTADO</span>' : '';

    return ''
      + '<article class="prod-card sv-scale' + (agotado ? ' agotado' : '') + '" data-id="' + esc(p.id) + '">'
      +   '<div class="prod-img foto-box">'
      +     miniatura(p) + badge + stockPill
      +   '</div>'
      +   '<div class="prod-body">'
      +     '<h3 class="prod-nombre">' + esc(p.nombre) + '</h3>'
      +     '<p class="prod-desc">' + esc(p.desc || '') + '</p>'
      +     '<div class="prod-precio-row">'
      +       '<span class="prod-precio">' + plata(p.precio) + '</span>'
      +       '<span class="prod-unidad">COP · UNIDAD</span>'
      +     '</div>'
      +     '<button class="btn-add" data-add="' + esc(p.id) + '"' + (agotado ? ' disabled' : '') + '>'
      +       (agotado ? 'Agotado' : '＋ Agregar al carrito')
      +     '</button>'
      +   '</div>'
      + '</article>';
  }

  function pintarCatalogo() {
    const grid = $('#prod-grid');
    if (!grid) return;
    const productos = S.getProductos()
      .filter(p => filtroActivo === 'Todos' || (p.categoria || 'Otros') === filtroActivo);

    if (!productos.length) {
      grid.innerHTML = '<p class="sec-p">No hay productos en esta categoría.</p>';
      return;
    }

    grid.innerHTML = productos.map(tarjeta).join('');

    grid.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = S.agregarAlCarrito(btn.dataset.add, 1);
        if (!r.ok) return toast('⚠️ ' + r.msg);
        const txt = btn.textContent;
        btn.textContent = '✓ Agregado';
        btn.classList.add('ok');
        setTimeout(() => { btn.textContent = txt; btn.classList.remove('ok'); }, 1000);
        pintarCarrito();
        toast('Agregado al carrito 🛒');
      });
    });

    observarRevelado(grid.querySelectorAll('.sv-scale'), true);
  }
  window.SVPintarCatalogo = function () { pintarFiltros(); pintarCatalogo(); };

  /* ── Carrito ── */
  function pintarCarrito() {
    const items = S.carritoDetallado();
    const cont = $('#cart-items');
    const total = S.totalCarrito();

    const contador = $('#cart-count');
    const unidades = S.unidadesCarrito();
    contador.textContent = unidades;
    contador.dataset.vacio = unidades === 0 ? '1' : '0';

    $('#cart-total').textContent = plata(total);
    // Sin productos no se puede continuar al paso de datos.
    $('#btn-continuar').disabled = items.length === 0;

    if (!items.length) {
      cont.innerHTML = '<div class="cart-vacio"><div>🛒</div>'
        + '<div style="font-weight:800;color:rgba(245,233,200,.6)">Tu carrito está vacío</div>'
        + '<div style="font-size:13px;margin-top:6px">Agrega productos del catálogo</div></div>';
      return;
    }

    cont.innerHTML = items.map(l => {
      return ''
        + '<div class="cart-item">'
        +   '<div class="cart-item-img foto-box">' + miniatura(l) + '</div>'
        +   '<div class="cart-item-info">'
        +     '<div class="cart-item-nombre">' + esc(l.nombre) + '</div>'
        +     '<div class="cart-item-precio">' + plata(l.precio) + ' × ' + l.cant + ' = ' + plata(l.subtotal) + '</div>'
        +     '<div class="qty">'
        +       '<button data-menos="' + esc(l.id) + '" aria-label="Quitar uno">−</button>'
        +       '<span>' + l.cant + '</span>'
        +       '<button data-mas="' + esc(l.id) + '"' + (l.cant >= l.stock ? ' disabled' : '')
        +         ' aria-label="Agregar uno">+</button>'
        +     '</div>'
        +   '</div>'
        +   '<button class="btn-basura" data-quitar="' + esc(l.id) + '"'
        +     ' title="Eliminar del carrito" aria-label="Eliminar ' + esc(l.nombre) + ' del carrito">🗑️</button>'
        + '</div>';
    }).join('');

    cont.querySelectorAll('[data-mas]').forEach(b => b.addEventListener('click', () => {
      const r = S.agregarAlCarrito(b.dataset.mas, 1);
      if (!r.ok) toast('⚠️ ' + r.msg);
      pintarCarrito();
    }));
    cont.querySelectorAll('[data-menos]').forEach(b => b.addEventListener('click', () => {
      const l = S.carritoDetallado().find(x => x.id === b.dataset.menos);
      S.cambiarCantidad(b.dataset.menos, (l ? l.cant : 1) - 1);
      pintarCarrito();
    }));
    cont.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => {
      S.quitarDelCarrito(b.dataset.quitar);
      pintarCarrito();
      toast('Producto quitado');
    }));
  }
  window.SVPintarCarrito = pintarCarrito;

  function abrirCarrito() {
    pintarCarrito();
    irAPaso(1);
    precargarDatos();
    $('#cart-drawer').classList.add('abierto');
    $('#cart-overlay').classList.add('abierto');
    document.body.style.overflow = 'hidden';
  }
  function cerrarCarrito() {
    $('#cart-drawer').classList.remove('abierto');
    $('#cart-overlay').classList.remove('abierto');
    document.body.style.overflow = '';
  }

  /* ── Flujo en dos pasos ──
     Paso 1: los productos. Paso 2: los datos de entrega. */
  function irAPaso(n) {
    const drawer = $('#cart-drawer');
    drawer.dataset.paso = n;
    $('#paso-productos').style.display = n === 1 ? '' : 'none';
    $('#paso-datos').style.display = n === 2 ? '' : 'none';
    $('#btn-continuar').style.display = n === 1 ? '' : 'none';
    $('#acciones-paso2').style.display = n === 2 ? '' : 'none';
    $('#drawer-titulo').textContent = n === 1 ? 'Tu pedido' : 'Datos de entrega';
    document.querySelectorAll('.paso-punto').forEach(p =>
      p.classList.toggle('activo', p.dataset.p === String(n)));
    drawer.scrollTop = 0;
  }

  /* ── Ubicación por GPS ──
     Pide permiso al navegador y arma un enlace de Google Maps. Solo funciona en
     HTTPS (la página publicada lo es). Es opcional: si el cliente no la comparte,
     el pedido igual se envía con la dirección escrita. */
  let ubicacion = null;
  function capturarUbicacion() {
    const btn = $('#btn-ubicacion');
    const txt = $('#ubicacion-texto');
    if (!navigator.geolocation) {
      toast('Tu navegador no permite compartir ubicación');
      return;
    }
    txt.textContent = 'Buscando tu ubicación…';
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        ubicacion = 'https://maps.google.com/?q=' + latitude.toFixed(6) + ',' + longitude.toFixed(6);
        txt.textContent = '✓ Ubicación lista';
        btn.classList.add('ok');
        btn.disabled = false;
      },
      err => {
        btn.disabled = false;
        txt.textContent = 'Compartir mi ubicación';
        toast(err.code === 1
          ? 'Diste "no" al permiso de ubicación'
          : 'No se pudo obtener la ubicación');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  /* ── Datos del cliente ──
     Se recuerdan en el navegador para que un cliente que vuelve no los reescriba. */
  const K_CLIENTE = 'sv_cliente';
  function precargarDatos() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(K_CLIENTE)) || {}; } catch (e) {}
    if (d.nombre) $('#cli-nombre').value = d.nombre;
    if (d.tel) $('#cli-tel').value = d.tel;
    if (d.ciudad) $('#cli-ciudad').value = d.ciudad;
    if (d.dir) $('#cli-dir').value = d.dir;
  }
  function guardarDatos(d) {
    try { localStorage.setItem(K_CLIENTE, JSON.stringify(d)); } catch (e) {}
  }

  function leerDatos() {
    return {
      nombre: ($('#cli-nombre').value || '').trim(),
      tel: ($('#cli-tel').value || '').trim(),
      ciudad: ($('#cli-ciudad').value || '').trim(),
      dir: ($('#cli-dir').value || '').trim()
    };
  }

  // Devuelve el input del primer campo vacío, o null si están todos.
  function primerFaltante(d) {
    if (!d.nombre) return '#cli-nombre';
    if (d.tel.replace(/\D/g, '').length < 7) return '#cli-tel';
    if (!d.ciudad) return '#cli-ciudad';
    if (!d.dir) return '#cli-dir';
    return null;
  }

  /* ── Pedido por WhatsApp ──
     Sin emojis a propósito: la bandera 🇻🇪 y los iconos llegaban como "�" en
     Windows y en algunos teléfonos. Con texto plano se ve igual en todas partes.
     El panel de admin vuelve a leer este formato ("Pegar pedido"), así que si
     lo cambias, ajusta también parsearPedido() en admin.js. */
  function textoPedido(items, total, d) {
    const lineas = ['*NUEVO PEDIDO — Sabor Vinotinto*', '', '*Productos:*'];

    items.forEach(l => {
      lineas.push('• ' + l.cant + ' x ' + l.nombre + ' — ' + plata(l.subtotal));
    });

    lineas.push('');
    lineas.push('*TOTAL: ' + plata(total) + ' COP*');

    lineas.push('');
    lineas.push('*DATOS DE ENTREGA*');
    lineas.push('*Cliente:* ' + d.nombre);
    lineas.push('*Teléfono:* ' + d.tel);
    lineas.push('*Ciudad:* ' + d.ciudad);
    lineas.push('*Dirección:* ' + d.dir);
    if (ubicacion) lineas.push('*Ubicación:* ' + ubicacion);

    lineas.push('');
    lineas.push('_Pedido hecho desde la página_');
    return lineas.join('\n');
  }

  function comprar() {
    const items = S.carritoDetallado();
    if (!items.length) return;

    const d = leerDatos();
    const faltante = primerFaltante(d);
    if (faltante) {
      $('#datos-error').textContent = faltante === '#cli-tel' && d.tel
        ? 'El teléfono parece incompleto'
        : 'Completa todos los campos con *';
      const inp = $(faltante);
      inp.classList.add('malo');
      inp.focus();
      setTimeout(() => inp.classList.remove('malo'), 1500);
      return;
    }

    $('#datos-error').textContent = '';
    guardarDatos(d);
    window.open(waLink(textoPedido(items, S.totalCarrito(), d)), '_blank');

    // El stock real se descuenta cuando el admin confirma el pedido en el panel:
    // abrir WhatsApp no garantiza que el mensaje se haya enviado.
    toast('Abriendo WhatsApp… ¡Gracias por tu pedido!');
  }

  /* ── Animaciones (sin librerías) ── */
  let observer;
  function observarRevelado(els, escalonar) {
    els = Array.from(els);
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(entradas => {
        entradas.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    }
    els.forEach((el, i) => {
      // Las rejillas (tarjetas hermanas) entran en cascada; el resto, de una.
      if (escalonar) el.style.transitionDelay = Math.min(i * 0.08, 0.5) + 's';
      observer.observe(el);
    });
  }

  function partirTexto(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const texto = el.textContent;
    el.innerHTML = texto.split('').map((c, i) =>
      c === ' '
        ? ' '
        : '<span class="char"><span class="char-inner" style="transition-delay:' + (0.1 + i * 0.03).toFixed(2) + 's">' + esc(c) + '</span></span>'
    ).join('');
  }

  function contador(id, fin, sufijo, prefijo) {
    const el = document.getElementById(id);
    if (!el) return;
    const dur = 1600, t0 = performance.now();
    const paso = t => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (prefijo || '') + Math.round(eased * fin) + sufijo;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* El video solo se baja cuando el visitante lo pide (pesa ~10 MB). */
  function conectarVideo() {
    const marco = document.querySelector('.video-marco');
    const video = $('#sv-video');
    const play = $('#video-play');
    if (!marco || !video || !play) return;

    play.addEventListener('click', () => {
      video.controls = true; // recién ahora tiene sentido mostrarlos
      video.play();
    });
    video.addEventListener('play', () => marco.classList.add('reproduciendo'));
    video.addEventListener('pause', () => marco.classList.remove('reproduciendo'));
  }

  function barraProgreso() {
    const bar = $('#progress-bar');
    if (!bar) return;
    const actualizar = () => {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (alto > 0 ? (window.scrollY / alto) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  }

  function navGlass() {
    const nav = $('#sv-nav');
    if (!nav) return;
    const actualizar = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  }

  /* ── Arranque ── */
  document.addEventListener('DOMContentLoaded', function () {
    // Datos de contacto desde config.js
    $$('[data-wa-link]').forEach(a => {
      a.href = waLink(a.dataset.waLink || ('Hola ' + CFG.marca + '!'));
    });
    $$('[data-wa-texto]').forEach(el => { el.textContent = CFG.whatsappVisible; });
    $$('[data-instagram]').forEach(a => { a.href = CFG.instagram; });
    $$('[data-tiktok]').forEach(a => { a.href = CFG.tiktok; });

    ['split-line1', 'split-line2', 'split-line3'].forEach(partirTexto);

    pintarFiltros();
    pintarCatalogo();
    pintarCarrito();

    observarRevelado(document.querySelectorAll('.sv-hidden, .sv-left, .sv-right'));
    observarRevelado(document.querySelectorAll('.testi-card'), true);
    observarRevelado(document.querySelectorAll('.step-card'), true);
    barraProgreso();
    navGlass();
    conectarVideo();

    requestAnimationFrame(() => document.body.classList.add('cargado'));
    setTimeout(() => {
      // El número sale de config.js: "+25" cuenta hasta 25 y le deja el "+".
      const texto = String(CFG.productosTexto || S.getProductos().length);
      const num = parseInt(texto.replace(/\D/g, ''), 10) || 0;
      contador('cnt1', num, '', texto.trim().charAt(0) === '+' ? '+' : '');
      contador('cnt2', 100, '%');
    }, 600);

    // Carrito
    $('#cart-btn').addEventListener('click', abrirCarrito);
    $('#cart-cerrar').addEventListener('click', cerrarCarrito);
    $('#cart-overlay').addEventListener('click', cerrarCarrito);
    $('#btn-continuar').addEventListener('click', () => irAPaso(2));
    $('#btn-volver').addEventListener('click', () => irAPaso(1));
    $('#btn-ubicacion').addEventListener('click', capturarUbicacion);
    $('#btn-comprar').addEventListener('click', comprar);
    // Enter en cualquier campo de datos = enviar
    $('#paso-datos').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); comprar(); }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') cerrarCarrito();
    });
  });
})();

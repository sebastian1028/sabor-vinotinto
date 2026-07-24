/* Catálogo de Sabor Vinotinto.
   Es el catálogo base (nombres, fotos, categorías y precio de respaldo). El
   precio y el stock DE VERDAD los lee la página de la base de datos de contaduría
   (vista stock_publico); estos precios solo se usan si la base no responde.
   Los nombres coinciden EXACTO con la base de datos para poder emparejar.
   La foto de cada producto es img/productos/<id>.jpg (mismo nombre que el id). */
window.SV_PRODUCTS = [
  // ── Lácteos y Grasas ──
  { id: 'mayonesa-mavesa-910', nombre: 'Mayonesa Mavesa 910 g', categoria: 'Lácteos y Grasas', precio: 27300, emoji: '🫙', img: 'img/productos/mayonesa-mavesa-910.jpg', desc: 'La mayonesa favorita de Venezuela. Suave, cremosa y con ese sabor que tanto se extraña.' },
  { id: 'margarina-mavesa-500', nombre: 'Margarina Mavesa 500 g', categoria: 'Lácteos y Grasas', precio: 10300, emoji: '🧈', img: 'img/productos/margarina-mavesa-500.jpg', desc: 'La margarina más cremosa de Venezuela. Perfecta para arepas y cachapas.' },
  { id: 'margarina-mavesa-250', nombre: 'Margarina Mavesa 250 g', categoria: 'Lácteos y Grasas', precio: 5800, emoji: '🧈', img: 'img/productos/margarina-mavesa-250.jpg', desc: 'Margarina Mavesa en presentación de 250 g. El rico sabor de siempre.' },
  { id: 'margarina-mavesa-1kilo', nombre: 'Margarina Mavesa 1 kilo', categoria: 'Lácteos y Grasas', precio: 24200, emoji: '🧈', img: 'img/productos/margarina-mavesa-1kilo.jpg', desc: 'Margarina Mavesa en presentación familiar de 1 kilo.' },
  { id: 'rikesa-cheddar-300', nombre: 'Rikesa Cheddar 300 g', categoria: 'Lácteos y Grasas', precio: 20900, emoji: '🧀', img: 'img/productos/rikesa-cheddar-300.jpg', desc: 'Queso cheddar para untar, con vitaminas A, B2, D y calcio. Delicioso en tostadas.' },
  { id: 'rikesa-cheddar-200', nombre: 'Rikesa Cheddar 200 g', categoria: 'Lácteos y Grasas', precio: 13900, emoji: '🧀', img: 'img/productos/rikesa-cheddar-200.jpg', desc: 'Queso cheddar para untar Rikesa, presentación de 200 g.' },
  { id: 'queso-blanco-500', nombre: 'Queso Blanco doble crema 500 kg', categoria: 'Lácteos y Grasas', precio: 15900, emoji: '🧀', img: 'img/productos/queso-blanco-500.jpg', desc: 'Queso blanco doble crema, suave y fresco. Ideal para las arepas.' },
  { id: 'jamon-plumrose-500', nombre: 'Jamon plumrose 500 kg', categoria: 'Lácteos y Grasas', precio: 26500, emoji: '🍖', img: 'img/productos/jamon-plumrose-500.jpg', desc: 'Jamón Plumrose, perfecto para sándwiches, tequeños y picadas.' },
  { id: 'ovomaltina-35', nombre: 'Chocolate Ovomaltina 35 g', categoria: 'Lácteos y Grasas', precio: 4800, emoji: '🍫', img: 'img/productos/ovomaltina-35.jpg', desc: 'Chocolate Ovomaltina en presentación individual de 35 g.' },

  // ── Salsas y Aderezos ──
  { id: 'heinz-ketchup-397', nombre: 'Ketchup Heinz 397 g', categoria: 'Salsas y Aderezos', precio: 7900, emoji: '🍅', img: 'img/productos/heinz-ketchup-397.jpg', desc: 'Salsa de tomate Heinz original. El acompañante clásico de toda comida.' },
  { id: 'heinz-mostaza-195', nombre: 'Heinz Mostaza 195 g', categoria: 'Salsas y Aderezos', precio: 8700, emoji: '🌭', img: 'img/productos/heinz-mostaza-195.jpg', desc: 'Mostaza Heinz original. Ideal para perros calientes y hamburguesas.' },
  { id: 'salsa-fritz-maiz-145', nombre: 'Salsa Fritz sabor a Maíz 145 g', categoria: 'Salsas y Aderezos', precio: 7900, emoji: '🌽', img: 'img/productos/salsa-fritz-maiz-145.jpg', desc: 'Salsa Fritz con sabor a maíz. Ese toque único que solo se consigue allá.' },

  // ── Snacks ──
  { id: 'diablito-115', nombre: 'Diablitos 115 g', categoria: 'Snacks', precio: 10100, emoji: '🥫', img: 'img/productos/diablito-115.jpg', desc: 'Jamón endiablado Underwood. El clásico infaltable para las meriendas.' },
  { id: 'diablito-54', nombre: 'Diablitos 54 g', categoria: 'Snacks', precio: 6100, emoji: '🥫', img: 'img/productos/diablito-54.jpg', desc: 'Diablitos en lata pequeña de 54 g. Perfecto para untar en una arepa.' },
  { id: 'pepitonas-margarita-140', nombre: 'Pepitonas Margarita 140 g', categoria: 'Snacks', precio: 7400, emoji: '🦪', img: 'img/productos/pepitonas-margarita-140.jpg', desc: 'Pepitonas de la Isla de Margarita en lata. El sabor del mar venezolano.' },
  { id: 'galletas-maria-250', nombre: 'Galletas maria 250 g', categoria: 'Snacks', precio: 6300, emoji: '🍪', img: 'img/productos/galletas-maria-250.jpg', desc: 'Galletas María, las de siempre para el café o la merienda.' },
  { id: 'pepito-80', nombre: 'Pepito el original 80 g frito lay', categoria: 'Snacks', precio: 5900, emoji: '🧁', img: 'img/productos/pepito-80.jpg', desc: 'Pepito el original, el ponqué relleno de chocolate de toda la vida.' },

  // ── Bebidas ──
  { id: 'maltin-355', nombre: 'Malta Maltín Polar lata 355 ml', categoria: 'Bebidas', precio: 4000, emoji: '🍺', img: 'img/productos/maltin-355.jpg', desc: 'La malta venezolana por excelencia, rica en vitaminas del grupo B.' },
  { id: 'chichero-500', nombre: 'Chicha 500 ml', categoria: 'Bebidas', precio: 9200, emoji: '🥛', img: 'img/productos/chichero-500.jpg', desc: 'Chicha venezolana esterilizada. Refrescante, nutritiva e inconfundible.' },
  { id: 'chichero-1l', nombre: 'Chicha 1 litro', categoria: 'Bebidas', precio: 16100, emoji: '🥛', img: 'img/productos/chichero-1l.jpg', desc: 'El Chichero en presentación de 1 litro para compartir en familia.' },
  { id: 'toddy-200', nombre: 'Toddy 200 g', categoria: 'Bebidas', precio: 11000, emoji: '🍫', img: 'img/productos/toddy-200.jpg', desc: 'El chocolate en polvo de la infancia venezolana. Presentación de 200 g.' },
  { id: 'toddy-400', nombre: 'Toddy 400 g', categoria: 'Bebidas', precio: 20600, emoji: '🍫', img: 'img/productos/toddy-400.jpg', desc: 'Toddy en presentación familiar de 400 g. Rinde el doble, sabe igual de rico.' },

  // ── Compotas ──
  { id: 'compota-manzana-186', nombre: 'Compota Heinz Manzana 186 g', categoria: 'Compotas', precio: 3700, emoji: '🍎', img: 'img/productos/compota-manzana-186.jpg', desc: 'Compota Heinz colada de manzana. Suavecita para los más pequeños.' },
  { id: 'compota-pera-186', nombre: 'Compota Heinz Pera 186 g', categoria: 'Compotas', precio: 3700, emoji: '🍐', img: 'img/productos/compota-pera-186.jpg', desc: 'Compota Heinz colada de pera. Suavecita para los más pequeños.' }
];

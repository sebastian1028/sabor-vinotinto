/* Ajustes de Sabor Vinotinto. Cambia estos valores y listo. */
window.SV_CONFIG = {
  // Número de WhatsApp en formato internacional, sin + ni espacios.
  whatsapp: '573212739622',
  // Cómo se muestra el número en pantalla.
  whatsappVisible: '+57 321 273 9622',
  instagram: 'https://www.instagram.com/sabor.vinotinto1/',
  tiktok: 'https://www.tiktok.com/@sabor.vinotinto1',
  marca: 'Sabor Vinotinto',

  // Número que sale en "PRODUCTOS" del hero. Es un texto libre, no lo calcula
  // el catálogo: cámbialo cuando quieras (ej: '+25', '+50').
  productosTexto: '+25',

  /* ── Stock en vivo (solo lectura) ──
     La página lee el stock de la base de datos de contaduría para mostrar qué
     está agotado. Lee de una "vista" (stock_publico) que solo tiene nombre y
     stock: nunca ve los costos. La página SOLO lee, nunca escribe. Si la base
     no responde, todo se muestra disponible (no se rompe). */
  stockUrl: 'https://swltxshidnepyrostgxh.supabase.co',
  stockKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bHR4c2hpZG5lcHlyb3N0Z3hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTU2ODMsImV4cCI6MjEwMDA3MTY4M30.ooiO7kO32T0NOitkeVnqo1JTlTS-t-OmwudLxkYnHhU'
};

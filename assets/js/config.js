/* Ajustes de Sabor Vinotinto. Cambia estos valores y listo. */
window.SV_CONFIG = {
  // Número de WhatsApp en formato internacional, sin + ni espacios.
  whatsapp: '573212739622',
  // Cómo se muestra el número en pantalla.
  whatsappVisible: '+57 321 273 9622',
  instagram: 'https://www.instagram.com/sabor.vinotinto1/',
  // Sin los parámetros ?_r=...&_t=... que trae el enlace de "compartir":
  // esos son de la sesión del celular y con el tiempo dejan de servir.
  tiktok: 'https://www.tiktok.com/@sabor.vinotinto1',
  // Clave del panel de admin. Cámbiala por la tuya.
  // Ojo: cualquiera puede leerla viendo el código fuente. Solo protege el panel
  // de curiosos; los datos que maneja viven únicamente en tu propio navegador.
  adminPin: 'vinotinto2026',
  marca: 'Sabor Vinotinto',

  // Número que sale en "PRODUCTOS" del hero. Es un texto libre, no lo calcula
  // el catálogo: cámbialo cuando quieras (ej: '+25', '+50').
  productosTexto: '+25',

  /* ── Ventas compartidas entre socios (Supabase) ──
     Pega aquí los dos datos de tu proyecto de Supabase (Project Settings → API).
     Los pasos completos están en el README.

     Mientras estén vacíos, la página funciona en modo local: la tienda muestra
     el catálogo normal y el panel de admin usa el guardado de este navegador.

     La llave "anon" es pública a propósito; no hay problema en subirla a GitHub.
     NUNCA pegues aquí la llave "service_role". */
  supabaseUrl: '',
  supabaseAnonKey: ''
};

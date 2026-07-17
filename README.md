# Sabor Vinotinto 🇻🇪

Catálogo y tienda de productos venezolanos con pedidos por WhatsApp.
Sitio estático: no necesita servidor ni base de datos.

## Cómo lo abro

Doble clic en `index.html`. Ya está.

## Estructura

```
index.html              La página
assets/css/style.css    Todos los estilos
assets/js/config.js     WhatsApp, Instagram y clave del admin ← empieza por aquí
assets/js/products.js   El catálogo (precios y stock públicos)
assets/js/store.js      Guardado de datos (localStorage)
assets/js/app.js        Catálogo, carrito y pedido por WhatsApp
assets/js/admin.js      Panel de administración
img/logo.png            Logo
img/productos/          Fotos de los productos
```

## Cambiar el número, el Instagram o la clave

Todo está en `assets/js/config.js`.

## Agregar fotos de productos

**Solo guarda la foto en `img/productos/` con el nombre de la tabla de abajo.**
No hay que tocar código: las rutas ya están puestas.

Sirve `.jpg`, `.png` o `.jpeg` — la página prueba las tres. Si un producto no
tiene foto todavía, se muestra su emoji y no se rompe nada.

Importante para que se vean bien:

- **Nombre exacto** el de la tabla: sin mayúsculas, sin espacios ni tildes.
  En internet `Mayonesa Mavesa 920 g.png` y `mayonesa-mavesa-920.jpg` son cosas
  distintas, y los espacios dan problemas.
- **Fondo negro**, como las que ya subiste: la ficha usa fondo negro y así la
  foto se funde. Una con fondo blanco se vería como un recuadro blanco pegado.
- **Máximo ~300 KB.** Si tu foto pesa 2 MB, avísame y la comprimo (las que
  subiste pasaron de 2 MB a ~50 KB sin perder calidad en pantalla).

> ⚠️ Si cambias una foto de extensión (por ejemplo de `.png` a `.jpg`), hay que
> cambiar también `SV_CATALOGO_VERSION` arriba de `products.js`. Si no, los
> navegadores que ya entraron siguen buscando el archivo viejo.

Las 13 ya están puestas. Si quieres cambiar alguna, este es su nombre:

| Producto | Archivo |
|---|---|
| Mayonesa Mavesa 920 g | `mayonesa-mavesa-920.jpg` |
| Margarina Mavesa 500 g | `margarina-mavesa-500.jpg` |
| Heinz Ketchup 397 g | `heinz-ketchup-397.jpg` |
| Toddy 200 g | `toddy-200.jpg` |
| Toddy 400 g | `toddy-400.jpg` |
| Heinz Mostaza 195 g | `heinz-mostaza-195.jpg` |
| Pepitonas Margarita 140 g | `pepitonas-margarita-140.jpg` |
| Diablito 115 g | `diablito-115.jpg` |
| Diablito 54 g | `diablito-54.jpg` |
| Malta 355 ml | `malta-355.jpg` |
| Chichero 250 ml | `chichero-250.jpg` |
| Chichero 1 litro | `chichero-1l.jpg` |
| Salsa Fritz sabor a Maíz 145 g | `salsa-fritz-maiz-145.jpg` |

## El video del hero

Está en `img/video.mp4` y su portada en `img/video-portada.jpg`.

El video **no se descarga solo**: solo baja cuando alguien le da al botón de
play. Es a propósito, porque pesa 10 MB y si se cargara de una le gastaría los
datos a todo el que entre desde el celular sin siquiera verlo.

Si cambias el video, deja el mismo nombre (`img/video.mp4`) y avísame para
sacarle una portada nueva.

> Vale la pena comprimirlo: 10 MB para 1 minuto es mucho. Con
> [handbrake.fr](https://handbrake.fr) (gratis) puedes dejarlo en ~2 MB sin que
> se note la diferencia, y quien le dé play lo verá al instante.

## El panel de admin

Botón **⚙ Admin** al final de la página. La clave está en `config.js`.

- **Resumen**: pedidos, ingresos, ganancia, stock y más vendidos.
- **Productos**: cambiar stock y precios, agregar o borrar productos.
- **Ventas**: registrar pedidos y ver el historial.
- **Ajustes**: exportar, respaldar y restaurar.

### Cómo registrar una venta

Cuando te llegue un pedido por WhatsApp, **copia el mensaje completo** y pégalo
en Admin → Ventas → *Pegar pedido*. La página lo lee, registra la venta y
descuenta el stock. También puedes registrar a mano.

### ⚠️ Dónde viven los datos (importante)

El stock y las ventas se guardan **en el navegador donde los escribiste**,
no en internet. O sea:

- Si abres el admin desde otro celular o computador, **no vas a ver esos datos**.
- Si limpias el caché del navegador, **se borran**.
- Tus clientes no ven los cambios de stock hasta que publiques (ver abajo).

Por eso: **descarga un respaldo cada tanto** desde Ajustes → *Descargar respaldo*.

Si más adelante quieres stock y ventas de verdad compartidos entre dispositivos,
hay que conectar un backend (Supabase tiene plan gratis). El código está separado
para que eso solo implique reescribir `store.js`.

### Cómo publico los cambios para mis clientes

1. Admin → Ajustes → **Exportar products.js**
2. Sube ese archivo a GitHub reemplazando `assets/js/products.js`
3. En 1–2 minutos la página pública queda actualizada

## Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "Sabor Vinotinto"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/sabor-vinotinto.git
git push -u origin main
```

Después, en GitHub: **Settings → Pages → Source: `main` / carpeta `/ (root)` → Save**.

Tu página queda en `https://TU-USUARIO.github.io/sabor-vinotinto/`.

> El repositorio debe ser **público** para que Pages funcione en el plan gratis.
> Recuerda que la clave del admin es visible en el código: no la reutilices de
> otra cuenta tuya.

# Sabor Vinotinto 🇻🇪

Catálogo de productos venezolanos con pedido por WhatsApp.
Sitio estático: no necesita servidor ni base de datos.

**En vivo:** https://sebastian1028.github.io/sabor-vinotinto/

## Cómo funciona

El cliente ve el catálogo, agrega productos al carrito, pone sus datos de entrega
(nombre, teléfono, ciudad, dirección y, si quiere, su ubicación) y al enviar se
abre WhatsApp con el pedido ya escrito hacia el número de la tienda.

## Estructura

```
index.html              La página
assets/css/style.css    Estilos
assets/js/config.js     WhatsApp, Instagram, TikTok ← empieza por aquí
assets/js/products.js   El catálogo (nombres, precios, fotos)
assets/js/store.js      Catálogo + carrito
assets/js/app.js        Tienda, carrito y pedido por WhatsApp
img/productos/          Fotos de los productos
img/video.mp4           Video de la portada
```

## Cambiar el número, Instagram o TikTok

Todo está en `assets/js/config.js`.

## Cambiar precios, nombres o agregar productos

Se edita `assets/js/products.js`. Cada producto tiene id, nombre, categoría,
precio, emoji (respaldo si falta la foto), img y descripción.

## Fotos de productos

Guarda la foto en `img/productos/` con el mismo nombre que el `id` del producto
(ej. `maltin-355.jpg`). Sirve `.jpg`, `.png` o `.jpeg`. Ideal: fondo oscuro,
máximo ~300 KB. Si pesa más, avísame y la comprimo.

## Publicar cambios (importante)

Cada vez que se cambie algo de CSS o JS, **sube el número de versión** en
`index.html`: busca `?v=5` y ponlo `?v=6` en todas las líneas de `<script>` y
`<link>`. Eso obliga a los navegadores a bajar la versión nueva (si no, siguen
mostrando la vieja guardada en caché).

Luego, desde la carpeta del proyecto (Git Bash):

```bash
git add .
git commit -m "lo que cambiaste"
git push
```

En 1–2 minutos queda en la página. GitHub → Settings → Pages ya está configurado
(rama `main`, carpeta raíz).

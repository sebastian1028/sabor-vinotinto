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

Botón **⚙ Admin** al final de la página. Funciona en dos modos:

- **Modo nube** (con Supabase conectado): los dos socios entran con su correo y
  contraseña y comparten los mismos datos. Los pedidos de los clientes caen
  solos como "pendientes"; al confirmarlos baja el stock y cuentan como venta.
- **Modo local** (sin Supabase): con la clave de `config.js`, datos solo en este
  navegador. Es el respaldo mientras no conectes la nube.

Pestañas: **Resumen** (ventas, ingresos, ganancia, stock), **Pedidos** (nube) o
**Ventas** (local), **Productos** y **Ajustes**.

## Conectar la nube (Supabase) para los dos socios

Para que socio 1 y socio 2 vean lo mismo, los datos van a Supabase (gratis, sin
tarjeta). Mientras no lo conectes, el admin funciona en modo local y la página
sigue normal.

### 1. Crea el proyecto
1. Entra a [supabase.com](https://supabase.com), crea cuenta y **New project**.
2. Ponle nombre y una contraseña de base de datos (guárdala). Región: la más cercana.

### 2. Crea las tablas
**SQL Editor → New query**, pega TODO esto y dale **Run**. Ojo: copia solo el SQL,
NO la palabra "sql" ni las comillas ``` de arriba/abajo. Los tres `drop` del
inicio dejan correrlo varias veces sin miedo (limpia lo que hubiera a medias):

```sql
drop function if exists public.confirmar_pedido(bigint, text);
drop table if exists public.pedidos;
drop table if exists public.productos;

-- Catálogo (precio, costo, stock) compartido
create table public.productos (
  id text primary key,
  nombre text not null,
  categoria text,
  precio integer not null default 0,
  costo integer not null default 0,
  stock integer not null default 0,
  emoji text, img text, descripcion text, badge text,
  orden integer default 0
);

-- Pedidos que hacen los clientes
create table public.pedidos (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  estado text not null default 'pendiente' check (estado in ('pendiente','confirmado','cancelado')),
  items jsonb not null,
  total integer not null,
  costo_total integer not null default 0,
  cliente text, telefono text, ciudad text, direccion text, ubicacion text,
  confirmado_por text, confirmado_en timestamptz
);

alter table public.productos enable row level security;
alter table public.pedidos enable row level security;

-- Productos: todos leen (la tienda), solo un socio con sesión escribe
create policy "productos lee" on public.productos for select to anon, authenticated using (true);
create policy "productos escribe" on public.productos for all to authenticated using (true) with check (true);

-- Pedidos: cualquiera crea uno pendiente; solo un socio lee y actualiza
create policy "pedido crea" on public.pedidos for insert to anon, authenticated with check (estado = 'pendiente');
create policy "pedido lee" on public.pedidos for select to authenticated using (true);
create policy "pedido actualiza" on public.pedidos for update to authenticated using (true) with check (true);

-- Confirmar una venta: marca el pedido y descuenta stock en una sola operación
create or replace function public.confirmar_pedido(pid bigint, socio text)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  update public.pedidos set estado='confirmado', confirmado_por=socio, confirmado_en=now()
    where id=pid and estado='pendiente';
  if not found then raise exception 'El pedido ya no está pendiente'; end if;
  for it in select jsonb_array_elements(items) from public.pedidos where id=pid loop
    update public.productos set stock = greatest(0, stock - (it->>'cant')::int)
      where id = it->>'id';
  end loop;
end $$;
revoke all on function public.confirmar_pedido(bigint, text) from anon;
grant execute on function public.confirmar_pedido(bigint, text) to authenticated;
```

### 3. Crea los dos socios
**Authentication → Users → Add user** (dos veces). A cada uno, correo y
contraseña, y activa **Auto Confirm User**. Con eso entran al panel.

### 4. Conecta la página
**Project Settings → API**, copia y pega en `assets/js/config.js`:
- **Project URL** → `supabaseUrl`
- **anon public** → `supabaseAnonKey`

Sube el `config.js` a GitHub y listo: el panel pide correo y contraseña, y los
datos quedan compartidos.

> La llave `anon` es pública a propósito (no da permisos: manda la base de datos).
> **Nunca** pegues la `service_role`.

### La primera vez
El primer socio que entre siembra el catálogo en la nube desde `products.js`
(pasa solo). Desde ahí, lo que cambien en Productos lo ven los dos y los clientes.

### Cómo publican cambios del catálogo
En **modo nube**, cambiar precio/stock/productos se ve al instante (no hay que
subir nada). Solo conviene, de vez en cuando, **Ajustes → Exportar products.js**
y subirlo a GitHub para mantener fresca la copia de respaldo que carga la tienda
mientras responde la nube.

En **modo local**: Ajustes → Exportar products.js → subir a GitHub.

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

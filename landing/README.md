# Landing de Hinch.ar

Landing estática (HTML/CSS, sin build) que da información sobre la plataforma y
manda al usuario a la app. Vive separada del bundle Expo a propósito: carga
rápido y es buena para SEO.

```
landing/
  index.html      # toda la página
  styles.css      # estilos (paleta espejo de lib/constants.ts)
  assets/         # logo, icono, fondo del hero
  vercel.json     # config del proyecto Vercel de la landing
```

## Arquitectura de dominios

| Dominio              | Qué sirve            | Proyecto Vercel |
|----------------------|----------------------|-----------------|
| `hinch.ar` (raíz)    | Esta landing         | Root Directory = `landing` |
| `app.hinch.ar`       | App Expo (RN-web)    | Root Directory = `/` (raíz del repo, `vercel.json` de la raíz) |

## Cómo desplegar (dos proyectos Vercel sobre el mismo repo)

1. **Proyecto APP** (el que ya existe): apunta al repo, Root Directory = raíz.
   Build `npx expo export --platform web` → `dist`. Dominio: `app.hinch.ar`.
2. **Proyecto LANDING** (nuevo): mismo repo, en *Settings → Build & Development*
   poné **Root Directory = `landing`**, Framework Preset = *Other*, sin build
   command (es estático). Dominio: `hinch.ar` y `www.hinch.ar`.
3. **DNS**: `hinch.ar` → proyecto LANDING; registro `app` (CNAME) → proyecto APP.

## Editar la landing

- Es HTML plano: editás `index.html` y `styles.css`, no hay que compilar nada.
- El destino de los botones está en cada `<a data-app-link href="https://app.hinch.ar">`.
  Si cambia el subdominio, actualizá esos `href`.
- Los colores salen de `styles.css` (`:root`), que replica `COLORS` de
  `lib/constants.ts`. Si cambiás la paleta de la app, sincronizá acá.

## Probar localmente

```bash
cd landing
python3 -m http.server 4321   # http://localhost:4321
```

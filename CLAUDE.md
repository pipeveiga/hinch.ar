# Guía para Claude

App de carpool para eventos en Argentina. Stack: **Expo SDK 54 + React Native 0.81 + expo-router + Supabase + Zustand**. Targets: Android (EAS) y web (Vercel).

## Antes de modificar código

```bash
npm install
npm run typecheck
npm run lint
```

## Mantener PROYECTO.txt al día

`PROYECTO.txt` en la raíz es un resumen en castellano del proyecto pensado para
que el usuario (no-dev) lo entienda. Cada vez que un cambio toque alguno de
estos puntos, actualizar el .txt en el mismo commit:

- Funcionalidad visible al usuario (nuevas features, flujos, pantallas).
- Stack técnico, dependencias mayores o targets.
- Estructura de carpetas (mover/agregar/borrar directorios principales).
- Convenciones, despliegues, secrets requeridos.
- Estado actual / próximos pasos (marcar items como hechos, agregar pendientes).

Actualizar también la línea "Última actualización del documento" con la fecha
del día.

## Convenciones del proyecto

- **Idioma UI**: castellano rioplatense. Tildes y eñes incluidas.
- **Tema**: solo dark. Paleta en `lib/constants.ts` (`COLORS`). Usar siempre las constantes, nunca hardcodear colores.
- **Tipos**: en `lib/types.ts`, espejo del schema. Actualizar acá si se cambia la DB en `supabase/migrations/`.
- **Routing**: file-based con expo-router 6. Pantallas en `app/`, layouts con `_layout.tsx`.
- **Estado**: Zustand. Un store por dominio en `stores/`.
- **Acceso a datos**: pasar siempre por `lib/supabase.ts` (`*Api` objects). Whitelistear campos editables en `updateProfile` — nunca permitir editar `is_verified`, `verification_status`, `dni`.

## Plataformas

- **Web (Vercel)**: build estático. `supabase.ts` ya tiene guard SSR para `window`. Cualquier nueva referencia a APIs de browser necesita `typeof window !== 'undefined'`.
- **Android (EAS)**: `eas.json` con perfiles `preview` (APK) y `production` (AAB).
- **Expo Go**: push notifications **no** funcionan en SDK 54 — el código las skipea con `Platform.OS === 'web'` y try/catch dinámico en `hooks/usePushNotifications.ts`.

## Seguridad

- `lib/supabase.ts` filtra campos sensibles en lecturas públicas de usuarios (`getById` solo expone whitelisted).
- RLS asumido en todas las tablas (ver migraciones).
- No commitear `.env`. `google-services.json` está commiteado: contiene solo config Firebase, no claves privadas.

## Despliegues

- **Web**: push a `main` → Vercel.
- **Android**: manual con `eas build --profile production --platform android`.

## Cosas que no hay que hacer

- No mergear directo a `main` sin pasar typecheck + lint (CI lo valida).
- No editar `supabase/functions/` desde el typecheck principal — está excluido en `tsconfig.json` porque corre en Deno.
- No agregar lógica condicional `if (Platform.OS === 'web')` para esconder features — preferir componentes específicos de web o degradar elegantemente.

## Branches activas

- `main`: branch principal. CI corre acá en cada push y PR.

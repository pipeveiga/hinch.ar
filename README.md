# hinch.ar

App de carpool para hinchas: viajes compartidos a partidos, recitales y otros eventos en Argentina.

Stack: **Expo SDK 54 + React Native 0.81 + expo-router 6 + Supabase + Zustand**.
Targets: Android (EAS), iOS (EAS), Web (Vercel).

## Quickstart

```bash
npm install
cp .env.example .env   # completar credenciales Supabase
npm run start          # Expo dev server
npm run android        # build dev Android
npm run web            # web (Vercel-compatible)
```

## Variables de entorno

Crear `.env` en la raíz:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

En producción (EAS / Vercel) se setean como env vars del entorno.
La Edge Function `send-notification` necesita además:

```
EXPO_ACCESS_TOKEN=<token-de-expo-push>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
```

## Scripts

| Script         | Descripción                                    |
|----------------|------------------------------------------------|
| `npm run start`| Inicia Expo dev server                         |
| `npm run android` | Lanza en emulador / device Android          |
| `npm run ios`  | Lanza en simulador iOS                         |
| `npm run web`  | Modo web                                       |
| `npm run lint` | ESLint sobre `.ts` / `.tsx`                    |
| `npm run typecheck` | TypeScript en modo `--noEmit`             |

## Estructura

```
app/                expo-router (file-based routing)
  (auth)/           login + registro
  (tabs)/           home, mis-viajes, chats, notificaciones, perfil
  evento/[id]       detalle de evento + lista de viajes
  viaje/[id]        detalle de viaje + reservar
  viaje/nuevo       crear viaje (drivers)
  chat/[bookingId]  chat por reserva
  usuario/[id]      perfil público + ratings
  calificar/        flujo de calificación post-viaje
components/         EventCard, TripCard, UserAvatar, VerificationBadge
hooks/              usePushNotifications
stores/             zustand: auth, trips, chats, notifications
lib/                supabase client, types, constants (theme)
supabase/
  migrations/       schema + chat
  functions/        edge function send-notification (Deno)
assets/             logo, splash, íconos
scripts/            seeds SQL
```

## Base de datos

Migraciones en `supabase/migrations/` (orden numérico).
Aplicar con Supabase CLI:

```bash
supabase db push
```

Seed inicial de eventos:

```bash
psql "$SUPABASE_DB_URL" -f scripts/seed-events.sql
```

## Despliegue

### Android (EAS)

Perfiles en `eas.json`:
- `preview`: APK interno
- `production`: AAB para Play Store (autoincrementa `versionCode`)

```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

`google-services.json` está commiteado en el repo. **No incluye claves
sensibles** (solo configuración del proyecto Firebase), pero conviene
revisar antes de hacer el repo público — si en algún momento se agregan
claves, moverlo a EAS secrets.

**Submit a Play Store**: generar un service account JSON en Google Cloud
con permisos en Play Console, guardarlo como `play-store-key.json` en la
raíz (ya está gitignored) y correr:

```bash
eas submit --profile production --platform android
```

Por defecto sube a track `internal` con `releaseStatus: draft` (configurado
en `eas.json`).

### iOS (EAS)

Perfiles en `eas.json`:
- `preview`: build interno para device (no simulador)
- `production`: build para App Store / TestFlight (autoincrementa `buildNumber`)

```bash
eas build --profile preview --platform ios
eas build --profile production --platform ios
```

En el primer build EAS pide las credenciales de Apple Developer (Apple ID
+ contraseña / app-specific password) y se encarga solo del certificado
de distribución y los provisioning profiles.

**Submit a App Store / TestFlight**: completar en `eas.json` los campos
`submit.production.ios`:

- `appleId`: email de la cuenta Apple Developer
- `ascAppId`: ID numérico de la app en App Store Connect (lo ves al crear
  la app en https://appstoreconnect.apple.com)
- `appleTeamId`: ID del equipo en https://developer.apple.com/account

Después:

```bash
eas submit --profile production --platform ios
```

### Web (Vercel)

Configuración en `vercel.json`. Push a la branch principal dispara el
deploy. Variables `EXPO_PUBLIC_*` van seteadas en el dashboard de Vercel.

## Push notifications

- Expo Notifications + Firebase (Android).
- Token registrado en `users.expo_push_token` al login.
- Edge Function `send-notification` envía via Expo Push API.
- En Expo Go se skipean (incompatibilidad SDK).

## Convenciones

- Dark theme por defecto; paleta en `lib/constants.ts`.
- Todos los textos UI en castellano rioplatense.
- Tipos espejados al schema en `lib/types.ts`. Actualizar al cambiar la DB.
- `lib/supabase.ts`: whitelistear campos editables en `updateProfile`
  para no permitir editar `is_verified`, `verification_status`, etc.

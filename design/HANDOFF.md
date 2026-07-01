# App · Rediseño — Handoff / Spec de porteo a React Native

Prototipo de alta fidelidad de la app (`App Rediseño.dc.html`), espejo de la
landing rediseñada. Es la **especificación visual** para portar a StyleSheet.
No es código RN: la app corre con `View/Text/StyleSheet` y hay que traducir
estos layouts a componentes nativos, **usando siempre los tokens de
`lib/constants.ts`** (nada de hex hardcodeado).

> Por qué no un PR de código directo: no puedo generar 20 pantallas de RN que
> garanticen pasar `typecheck`/`lint` sin poder correrlas. Este prototipo deja
> cada pantalla resuelta al pixel para implementarla sin ambigüedad.

## Pantallas incluidas (14, en 5 flujos)
1. **Entrada** — onboarding · login · register
2. **Descubrir** — home/eventos (+ tab bar de vidrio) · evento/[id] · viaje/[id] (reservar)
3. **Conductor** — viaje/nuevo · mis-viajes
4. **Coordinar** — chats · chat/[bookingId] · notificaciones
5. **Confianza** — perfil · verificacion · calificar/[bookingId]

Variantes que reusan estos patrones (no dibujadas aparte): `recuperar`/
`restablecer` (= card de login), `usuario/[id]` (= perfil en modo público, sin
menú de cuenta), `terminos`/`privacidad` (documento de texto), `+not-found`.

## Decisiones de diseño
- **Tipografía**: en el prototipo, titulares en *Inter Tight* (800/900,
  tracking −0.03em) y datos en *Space Grotesk* (precios, hora). En RN mapean a
  **System (SF/Roboto)** —que es lo que ya usa `FONTS`— y se ven equivalentes;
  si quieren el mismo carácter, cargar Inter Tight con `expo-font` (opcional,
  suma peso). Cuerpo/UI: System.
- **Elevación sobre el diseño actual** (mismo layout, más premium):
  - Sombras más suaves y difusas, radios apenas mayores (cards 20→22, sheets 28).
  - Botones primarios con **degradé** `primaryLight → primary` (ya lo usa login/
    onboarding) extendido a los CTA principales (reservar, publicar, enviar).
  - Tab bar de vidrio flotante idéntica al patrón actual (BlurView + velo).
  - Header de tarjeta de viaje/booking con jerarquía tipográfica más marcada.
- **Íconos**: se usa el set propio (`components/Icon.tsx`) en todas las pantallas.
  Sugerencia de porteo: **reemplazar los emojis que quedan** por íconos del set,
  para coherencia total:
  - `calificar`: categorías ⏰🛡️🚗💬😎 → `clock` `shield` `car` `chat` `star`.
  - `verificacion`: pasos 🪪🔄🤳 y 🔒📷 → `id` `camera` `shield`.
  - `chat` (empty state) 💬 → `chat`.
  Íconos nuevos a agregar a `Icon.tsx` en el mismo estilo (line, stroke 1.7,
  viewBox 24): **`arrow-left`** (volver) y **`send`** (enviar mensaje) — hoy el
  chat usa glifos `←` y `↑`.
- **Fix de contraste en el chat**: hoy `bubbleTextMe` es `textPrimary` (oscuro)
  sobre burbuja `primary` (azul) → poco contraste. En el rediseño la burbuja
  propia es **degradé azul con texto blanco**. Cambiar `bubbleTextMe` a
  `COLORS.white` (o `textInverse`) al portar.

## Paleta — landing ↔ app SINCRONIZADAS
Todo sale de `COLORS` de `lib/constants.ts` (idénticos a la landing):
`primary #1D4ED8`, `primaryLight #3B82F6`, `brandTint #EEF3FF`, `success #34C759`,
`error #FF3B30`, `warning #FF9500`, `textPrimary #0B1220`, `textSecondary #51596B`,
`textMuted #8A93A3`, `surface #F5F7FB`, `border #E7E9EE`, `borderLight #D7DBE3`.
El único token nuevo es **`sky: '#60A5FA'`** (degradé de avatares/glows), el
mismo que ya anoté para la landing — agregarlo una sola vez a `COLORS`.

## Reglas respetadas
- Solo tema light · castellano rioplatense con tildes y eñes.
- Nada de lógica/datos/routing tocado: esto es capa visual pura.
- Multiplataforma: los layouts no dependen de APIs de browser; degradan igual en
  web y Android. La tab bar de vidrio usa el patrón BlurView ya existente.

## Cómo entregar (fases, un PR por bloque)
Recomiendo portar por flujo, un PR cada uno, cada uno pasando `typecheck` + `lint`:
1. Auth (onboarding, login, register, recuperar/restablecer)
2. Home + evento + viaje/[id]
3. viaje/nuevo + mis-viajes
4. chats + chat + notificaciones
5. perfil + usuario + verificacion + calificar
En cada PR: screenshots antes/después + confirmación de que no se tocó lógica.

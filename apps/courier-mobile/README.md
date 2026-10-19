# courier-mobile — app de repartidores

**Propósito/estado:** primer corte de la app para repartidores ([issue #15](https://github.com/raulbellosom/volon/issues/15)). Tiene dos modos. **Demo** (predeterminado) usa datos ficticios en memoria y no se conecta a nada. **Local** (issue #17) conecta solo la identidad y la disponibilidad del repartidor al backend de laboratorio; ofertas y entregas siguen sin conectarse. La app no pide permisos y **no se ha probado en teléfonos Android ni iOS**. Stack y motivos: [ADR-0012](../../docs/decisions/0012-courier-mobile-stack.md).

## Comandos (desde la raíz)
| Comando | Qué hace | Verificado |
| --- | --- | --- |
| `pnpm --filter @delivery/courier-mobile test` | 68 pruebas Jest: demo, modo local, adaptador HTTP y compuerta de modos. También corre en `pnpm check` | Sí, local y CI |
| `pnpm --filter @delivery/courier-mobile typecheck` | TypeScript estricto (incluido en `pnpm check`) | Sí |
| `pnpm courier:export` | Exporta Android (bytecode Hermes) y web sin caché y **falla** si el bundle trae claves o URLs del laboratorio | Sí, local y CI |
| `pnpm courier:local-smoke` | Ejecuta el adaptador HTTP de la app contra el laboratorio: login, perfil, disponibilidad, replay, versión obsoleta, aislamiento A/B. No imprime secretos | Sí, local con `pnpm local:up` |
| `pnpm courier:web` | Abre la app en el navegador para revisar la UI | Sí, en Windows con Edge |
| `pnpm courier` | Servidor de desarrollo de Expo para abrir en un teléfono | **No probado en un dispositivo** |

## Modo local (identidad y disponibilidad reales)
Solo en desarrollo (`__DEV__`). En un build de producción, o con una configuración inválida, la app se bloquea con un mensaje y **nunca** vuelve sola al demo.

1. Levanta el laboratorio: `pnpm local:up`. Crea `courier-a@example.test` y `courier-b@example.test`; la contraseña está en `SYNTHETIC_USER_PASSWORD` de `.env.local` de la raíz.
2. Crea `apps/courier-mobile/.env.local` (lo ignora Git) con la clave **publicable** de `SUPABASE_PUBLISHABLE_KEY`:
   ```
   EXPO_PUBLIC_COURIER_MODE=local
   EXPO_PUBLIC_COURIER_AUTH_URL=http://127.0.0.1:56321
   EXPO_PUBLIC_COURIER_API_URL=http://127.0.0.1:3100
   EXPO_PUBLIC_COURIER_PUBLISHABLE_KEY=sb_publishable_…
   ```
   Solo se aceptan `127.0.0.1`, `localhost` o `10.0.2.2` (emulador Android) con puerto, por `http`, y claves `sb_publishable_`. Una clave secreta nunca pasa.
3. `pnpm courier` y abre la app. Escribe el correo y la contraseña a mano: no se guardan en el código, la configuración ni el disco. La sesión vive en memoria.
4. Al terminar, borra o renombra ese `.env.local`. Mientras exista, `pnpm courier:export` fallará a propósito para no publicar la configuración local.

**Teléfono físico:** el laboratorio solo escucha en loopback. En Android usa `adb reverse tcp:56321 tcp:56321` y `adb reverse tcp:3100 tcp:3100`, y deja las URLs en `127.0.0.1`. No expongas los puertos en la red local.
**Navegador:** la API local no habilita CORS, así que `pnpm courier:web` en modo local no puede guardar disponibilidad. Las capturas del #17 usaron un proxy temporal fuera del repositorio.

| Pantalla (modo local) | Qué hace |
| --- | --- |
| Acceso de repartidor | Correo y contraseña contra Supabase Auth local. Avisa si las credenciales son incorrectas, si la sesión venció o si la cuenta no está habilitada |
| Mi disponibilidad | Muestra solo `courierId`, estado, versión y hora del servidor. Un botón grande activa o desactiva la disponibilidad persistida |
| Ofertas y entregas | Explica que no están conectadas: no hay ofertas, asignaciones ni elegibilidad financiera. No copia datos del demo |

**Reglas de la disponibilidad:**
- Un solo comando a la vez; la doble pulsación se ignora.
- Cada comando lleva `status`, `expectedVersion` e `Idempotency-Key`.
- Sin conexión, timeout o 503: el resultado es desconocido. Se ofrece reintentar **con la misma llave**.
- Tras un reintento o un 409 se relee `GET /v1/couriers/me`, porque un replay puede devolver un recibo histórico (comprobado contra el laboratorio).
- 401 cierra la sesión como vencida y 404 como cuenta no habilitada.

## Abrirla después en un teléfono (pendiente de hacer por una persona)
1. `pnpm install` en la raíz y `pnpm courier`. Aparece un código QR.
2. **Android:** Expo Go de Play Store puede no soportar SDK 57 si ya se actualizó al 58. En ese caso instala el Expo Go compatible con SDK 57 desde expo.dev/go, o crea un development build (`npx expo run:android` con Android Studio).
3. **iOS:** Expo Go de App Store solo carga el SDK más reciente. Para SDK 57 hace falta un development build con Xcode y una cuenta de Apple. No se usó EAS ni se crearon cuentas.
4. El teléfono y la computadora deben estar en la misma red, o usar `pnpm courier -- --tunnel`.

## Pantallas
| Pantalla | Qué muestra |
| --- | --- |
| Acceso de demostración | Entra como «Repartidor de prueba», sin cuenta ni contraseña |
| Mi turno | Disponibilidad simulada (fuera de turno, disponible o con entrega), entrega en curso, apariencia y más opciones |
| Ofertas | Lista con cuenta regresiva del servidor simulado, aceptar y rechazar; estados de carga, vacío, sin conexión y error |
| Detalle de la oferta | Recogida, destino ficticio, indicaciones y avisos de que no hay ruta ni tiempo estimado; oferta vencida o tomada por otra persona |
| Entrega en curso | Seis etapas simuladas (aceptada → camino a recogida → en el comercio → recogido → camino al destino → entregada) con un botón grande por paso |
| Funciones no disponibles | GPS, mapas, cámara, notificaciones, pagos y despacho real, explicados como ausentes |
| Controles de demostración | Simular sin conexión, hacer fallar la siguiente operación (sin conexión, conflicto, servicio caído) y reiniciar |

Las acciones principales van fijas abajo, en la zona del pulgar, con 64 px de alto; el resto de los botones mide al menos 48 px. Aceptar y rechazar siempre son botones, nunca solo un gesto. Claro/oscuro sigue al sistema o se elige en «Mi turno». El texto respeta el tamaño de letra del sistema, con límite de 1.6×. No hay animaciones decorativas; el tema expone la preferencia de «reducir movimiento» para las que lleguen después.

## Estructura
```
src/
  config/app-mode.ts        compuerta demo/local/bloqueado (falla en cerrado)
  domain/                   modelos de turno, ofertas y etapas (sin plataforma)
  ports/courier-gateway.ts  puerto demo (ofertas y etapas simuladas)
  ports/courier-account.ts  puerto real: identidad y disponibilidad
  adapters/synthetic/       fixtures deterministas + gateway en memoria con controles
  adapters/http/            adaptador HTTP del laboratorio (contratos compartidos)
  local/                    sesión en memoria, disponibilidad y pantallas del modo local
  shell/                    cableado del demo y pantalla de bloqueo
  state/                    reducer puro + CourierProvider (doble pulsación e idempotencia)
  theme/                    tema nativo desde @delivery/design-tokens y fuentes
  ui/                       componentes nativos reutilizables
  features/                 una carpeta por pantalla
  navigation/               native-stack tipado
```
**Componentes nativos:** `AppText`, `Button` (variantes, tamaño `action`, estado pendiente), `Screen` (safe areas, banner del modo, pie fijo), `TextField`, `Card`, `Notice`, `StatusPill`, `StopBlock`, `EmptyState`, `LoadingState`, `DemoBanner`, `LocalBanner` y `BrandLogo`.

**Garantías probadas:**
- Una doble pulsación envía un solo comando.
- Un reintento tras una falla de red reutiliza la misma llave de idempotencia.
- La cuenta regresiva usa el reloj del servidor simulado.
- Una oferta vencida o tomada bloquea aceptar y rechazar.
- Las etapas no se saltan y un paso desfasado se reporta como conflicto.
- Cualquier modo distinto de demo bloquea la app.

## Límites que requieren teléfonos reales
- Comprobar en Android e iOS: renderizado, fuentes, safe areas con notch y barra de gestos, modo oscuro del sistema, lector de pantalla (TalkBack y VoiceOver), texto grande, uso con guantes y una mano.
- En iOS el botón «atrás» nativo puede anunciarse en inglés mientras la app no declare idioma español en su configuración nativa.
- Rendimiento y consumo en equipos de gama media.
- Todo lo de [ADR-0003](../../docs/decisions/0003-react-native-expo.md): GPS en segundo plano, permisos, batería y notificaciones. Nada de eso existe en este corte.

## Contrato de backend que necesitará Codex
El puerto `CourierGateway` corresponde a los endpoints **propuestos** en [api-contracts.md](../../docs/specification/api-contracts.md) (`/v1/couriers/me/*`, `/v1/assignment-offers/*`, `/v1/deliveries/{id}/milestones`). Ninguno existe todavía. Para conectarlo hace falta definir:

| Método del puerto | Endpoint propuesto | Lo que falta especificar |
| --- | --- | --- |
| `signIn` | Supabase Auth + `GET /v1/couriers/me` | **Implementado en #16 y conectado en el modo local (#17)**. Pendiente: flotas y elegibilidad |
| `setAvailability` | `POST /v1/couriers/me/availability` | **Implementado y conectado** (`offline`/`available`, versión, idempotencia). Pendiente: `busy` y negar `offline` con entrega activa |
| `listOffers` | `GET /v1/couriers/me/offers` | `{ serverTime, offers: [{ offerId, reference, status, expiresAt, pickup, dropoff, packageNote }] }`; datos mínimos antes de aceptar (sin domicilio completo ni teléfono) |
| `acceptOffer` | `POST /v1/assignment-offers/{id}/accept` + `Idempotency-Key` | Exclusión transaccional; 409 si fue tomada o retirada, 410/409 si venció; respuesta con Assignment y versión |
| `declineOffer` | `POST /v1/assignment-offers/{id}/decline` + `Idempotency-Key` | Motivo opcional; idempotente |
| `advance` | `POST /v1/deliveries/{id}/milestones` + `Idempotency-Key` | `{ from, to, version }`; transición validada por servidor, conflicto ante etapa desfasada, evidencia futura |

Errores esperados en problem+json: `401`, `403`, `404`, `409` (conflicto o versión), `410` u otro código para oferta vencida, `422` y `503`. El cliente mapea a `offline`, `offer-expired`, `conflict`, `not-found` y `unavailable`. Antes de implementarlo hace falta aprobar las identidades de courier, el despacho M0 con pago verificado y la política de datos de destino visibles antes de aceptar.

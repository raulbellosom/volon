# courier-mobile — app de repartidores (demo sintética)

**Propósito/estado:** primer corte de la app para repartidores ([issue #15](https://github.com/raulbellosom/volon/issues/15)). Funciona **solo en modo demostración**, con datos ficticios en memoria. No se conecta a ningún servidor, no pide permisos y **no se ha probado en teléfonos Android ni iOS**. Stack y motivos: [ADR-0012](../../docs/decisions/0012-courier-mobile-stack.md).

## Comandos (desde la raíz)
| Comando | Qué hace | Verificado |
| --- | --- | --- |
| `pnpm --filter @delivery/courier-mobile test` | 28 pruebas Jest (pantallas, navegación, adaptador, estado). También corre en `pnpm check` | Sí, local y CI |
| `pnpm --filter @delivery/courier-mobile typecheck` | TypeScript estricto (incluido en `pnpm check`) | Sí |
| `pnpm courier:export` | Exporta el bundle Android (bytecode Hermes) y la versión web a `apps/courier-mobile/dist` | Sí, local y CI |
| `pnpm courier:web` | Abre la app en el navegador para revisar la UI | Sí, en Windows con Edge |
| `pnpm courier` | Servidor de desarrollo de Expo para abrir en un teléfono | **No probado en un dispositivo** |

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
  config/app-mode.ts        compuerta demo/bloqueado (falla en cerrado)
  domain/                   modelos de turno, ofertas y etapas (sin plataforma)
  ports/courier-gateway.ts  puerto que usarán el adaptador real y el sintético
  adapters/synthetic/       fixtures deterministas + gateway en memoria con controles
  state/                    reducer puro + CourierProvider (doble pulsación e idempotencia)
  theme/                    tema nativo desde @delivery/design-tokens y fuentes
  ui/                       componentes nativos reutilizables
  features/                 una carpeta por pantalla
  navigation/               native-stack tipado
```
**Componentes nativos:** `AppText`, `Button` (variantes, tamaño `action`, estado pendiente), `Screen` (safe areas, banner demo, pie fijo), `Card`, `Notice`, `StatusPill`, `StopBlock`, `EmptyState`, `LoadingState`, `DemoBanner` y `BrandLogo`.

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
| `signIn` | Supabase Auth + `GET /v1/couriers/me` | Identidad de courier, membresía o contrato con flota, estado habilitado y RLS propia |
| `setAvailability` | `POST /v1/couriers/me/availability` | `{ available }` → `{ shift: offline/available/busy, version }`; negar `offline` con entrega activa (409) |
| `listOffers` | `GET /v1/couriers/me/offers` | `{ serverTime, offers: [{ offerId, reference, status, expiresAt, pickup, dropoff, packageNote }] }`; datos mínimos antes de aceptar (sin domicilio completo ni teléfono) |
| `acceptOffer` | `POST /v1/assignment-offers/{id}/accept` + `Idempotency-Key` | Exclusión transaccional; 409 si fue tomada o retirada, 410/409 si venció; respuesta con Assignment y versión |
| `declineOffer` | `POST /v1/assignment-offers/{id}/decline` + `Idempotency-Key` | Motivo opcional; idempotente |
| `advance` | `POST /v1/deliveries/{id}/milestones` + `Idempotency-Key` | `{ from, to, version }`; transición validada por servidor, conflicto ante etapa desfasada, evidencia futura |

Errores esperados en problem+json: `401`, `403`, `404`, `409` (conflicto o versión), `410` u otro código para oferta vencida, `422` y `503`. El cliente mapea a `offline`, `offer-expired`, `conflict`, `not-found` y `unavailable`. Antes de implementarlo hace falta aprobar las identidades de courier, el despacho M0 con pago verificado y la política de datos de destino visibles antes de aceptar.

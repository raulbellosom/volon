# merchant-web — panel de comercios

**Propósito/estado:** primer incremento del panel web para comercios ([issue #10](https://github.com/raulbellosom/volon/issues/10)). Solo se ejecuta en local con datos sintéticos; no hay despliegue, dinero real, GPS ni repartos reales. Stack y motivos: [ADR-0009](../../docs/decisions/0009-merchant-web-stack.md).

## Iniciar
Desde la raíz del repositorio, tras `pnpm install`:

| Modo | Comando | Qué usa |
| --- | --- | --- |
| Backend local | `pnpm local:up` y luego `pnpm merchant` | API real en `127.0.0.1:3100` y Supabase Auth local mediante el proxy de Vite. Entrar con `merchant-a@example.test`; la contraseña es `SYNTHETIC_USER_PASSWORD` de `.env.local` (no se versiona). |
| Demostración | `pnpm merchant:demo` | Datos sintéticos en memoria y una franja visible de «Modo demostración». No contacta al servidor. Cuentas: `comercio@demo.test` (cualquier contraseña), `sin-acceso@demo.test` (403) y `sin-sucursales@demo.test` (sin sucursal). |

Ambos abren `http://127.0.0.1:5173`. Pruebas: `pnpm --filter @delivery/merchant-web test` (también corren en `pnpm check`). Build de producción verificado: `pnpm merchant:build` (falla si el bundle trae datos demo o secretos locales).

## Rutas
| Ruta | Pantalla | Endpoint |
| --- | --- | --- |
| `/acceso` | Inicio de sesión | `POST /auth/v1/token?grant_type=password` (Supabase Auth) |
| `/` | Inicio de la sucursal: historial paginado («Cargar más»), acciones y consulta por folio | `GET /v1/me`, `GET /v1/deliveries?branchId=&limit=20&cursor=` |
| `/sucursal` | Selección de sucursal (se omite si solo hay una) | `GET /v1/me` |
| `/envios/nuevo` | Solicitud: origen → destino → cotización → confirmación | `GET /v1/branches/{id}/pickup-location`, `POST /v1/delivery-quotes` (con `destination` sintético), `GET /v1/delivery-quotes/{id}/locations`, `POST /v1/deliveries` con `Idempotency-Key` |
| `/envios/:deliveryId` | Estado del envío y ubicaciones guardadas | `GET /v1/deliveries/{id}`, `GET /v1/deliveries/{id}/locations` |
| cualquier otra | Página no encontrada | — |

## Estados cubiertos
Los montos indican su origen: «ficticios» en demo y «de prueba con ruta sintética, no son una tarifa comercial» con el backend local. Carga (skeleton), error con reintento, acceso denegado (403), sin sucursal, no encontrado, sesión vencida (401 → vuelve a `/acceso` con aviso), cotización vencida (cuenta regresiva o `409 QUOTE_EXPIRED`), sesión guardada que ya venció (aviso al volver a entrar), fuera de cobertura (`422`), servicio caído (`503`) y sin conexión (aviso global y confirmación deshabilitada). Los reintentos de confirmación reutilizan la misma `Idempotency-Key`, así que no duplican el envío.

## Ubicaciones (issue #11)
- La recogida se pide al servidor para la sucursal elegida; si falla, no se puede cotizar. No tiene dirección escrita y nunca se presenta como verificada.
- La dirección y las indicaciones de prueba se normalizan a una línea, se cuentan por puntos de código (240 y 500), se validan con `parseDeliveryQuoteRequest` y viajan con la cotización como `destination` sintético y sin verificar.
- Antes de confirmar se muestra lo que el servidor guardó con la cotización, no el formulario; sin ese snapshot no se puede confirmar. La confirmación solo envía `branchId`, `quoteId` y la llave de idempotencia.
- Cambiar sucursal, dirección o indicaciones descarta la cotización; una respuesta tardía nunca la revive. Cada cotización tiene su propia llave y los reintentos la reutilizan.
- El detalle del envío lee sus ubicaciones solo al abrirse; el historial no las incluye. Los registros anteriores (`legacy_input`) se muestran como «Registro anterior» sin dirección.

## Estructura
- `src/api/`: puerto `MerchantApi`, adaptador HTTP y errores problem+json → `ApiError`. Las respuestas se validan con los parsers de `@delivery/contracts`. Las pantallas nunca llaman `fetch`.
- `src/demo/`: adaptador en memoria y fixtures, cargado solo con `--mode demo` en desarrollo.
- `src/session/` y `src/workspace/`: sesión (token en `sessionStorage`) y sucursal activa.
- Historial (`src/features/home/`): solo pide la sucursal activa y se monta con una llave por usuario y sucursal, así que cambiar cualquiera de los dos lo vacía. Las respuestas tardías de una consulta anterior se descartan, los envíos repetidos entre páginas se omiten y una página con envíos de otra sucursal se rechaza. Se recarga al volver al inicio, por ejemplo después de crear un envío.
- `src/features/`: una carpeta por pantalla; `src/shared/`: estados de carga/error y hooks.
- La UI sale de `@delivery/ui-web`: Navbar, ThemeToggle, Menu, TextField, PasswordField, RadioGroup/RadioCard, Stepper, RouteSummary, PriceBreakdown, Timeline, DeliveryList/DeliveryListItem, DescriptionList, StatusBadge, Alert, EmptyState, Skeleton, ConnectionStatus, Card, IconChip, Logo, Button y LinkButton. La app no define controles propios.

## Pendiente de backend o decisión
| Falta | Efecto hoy |
| --- | --- |
| Geocodificación, mapa y selección de punto (proveedor sin aprobar; ver [integración de ubicaciones](../../docs/operations/location-integration.md)) | La recogida viene del registro de la sucursal; el destino usa un punto sintético fijo de desarrollo. En un build de producción la cotización queda bloqueada con un aviso. |
| Retención y borrado de domicilios reales ([ADR-0010](../../docs/decisions/0010-delivery-location-snapshots.md)) | Solo se admiten direcciones ficticias y la pantalla lo advierte. Todo se muestra como «Ubicación sin verificar». |
| Estados posteriores a `requested`, asignación y seguimiento en vivo | La línea de tiempo marca «Solicitado» y lista los pasos siguientes como pendientes; no se finge seguimiento. |
| Gateway del mismo origen o CORS, renovación de token y hosting | Solo funciona con el proxy de desarrollo. |

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
| `/` | Inicio de la sucursal: acciones, estado vacío y consulta por folio | `GET /v1/me` |
| `/sucursal` | Selección de sucursal (se omite si solo hay una) | `GET /v1/me` |
| `/envios/nuevo` | Solicitud: origen → destino → cotización → confirmación | `POST /v1/delivery-quotes`, `POST /v1/deliveries` con `Idempotency-Key` |
| `/envios/:deliveryId` | Estado del envío | `GET /v1/deliveries/{id}` |
| cualquier otra | Página no encontrada | — |

## Estados cubiertos
Los montos indican su origen: «ficticios» en demo y «de prueba con ruta sintética, no son una tarifa comercial» con el backend local. Carga (skeleton), error con reintento, acceso denegado (403), sin sucursal, no encontrado, sesión vencida (401 → vuelve a `/acceso` con aviso), cotización vencida (cuenta regresiva o `409 QUOTE_EXPIRED`), sesión guardada que ya venció (aviso al volver a entrar), fuera de cobertura (`422`), servicio caído (`503`) y sin conexión (aviso global y confirmación deshabilitada). Los reintentos de confirmación reutilizan la misma `Idempotency-Key`, así que no duplican el envío.

## Estructura
- `src/api/`: puerto `MerchantApi`, adaptador HTTP y errores problem+json → `ApiError`. Las respuestas se validan con los parsers de `@delivery/contracts`. Las pantallas nunca llaman `fetch`.
- `src/demo/`: adaptador en memoria y fixtures, cargado solo con `--mode demo` en desarrollo.
- `src/session/` y `src/workspace/`: sesión (token en `sessionStorage`) y sucursal activa.
- `src/features/`: una carpeta por pantalla; `src/shared/`: estados de carga/error y hooks.
- La UI sale de `@delivery/ui-web`: Navbar, ThemeToggle, Menu, TextField, PasswordField, RadioGroup/RadioCard, Stepper, RouteSummary, PriceBreakdown, Timeline, DescriptionList, StatusBadge, Alert, EmptyState, Skeleton, ConnectionStatus, Card, IconChip, Logo, Button y LinkButton. La app no define controles propios.

## Pendiente de backend o decisión
| Falta | Efecto hoy |
| --- | --- |
| Listado de envíos por sucursal (`GET /v1/deliveries?branchId=`, #9; hoy responde 405) | «Envíos recientes» muestra un estado vacío y la consulta por folio. No se simula con datos falsos. |
| Geocodificación y ubicación de sucursales en `/v1/me` | La cotización usa coordenadas sintéticas de desarrollo; en un build de producción el paso queda bloqueado con un aviso. |
| Dirección e indicaciones en el contrato de entrega | Se capturan y se muestran solo en la cotización, marcadas como «todavía no se guarda». La confirmación y el estado avisan que el sistema no las registra. |
| Estados posteriores a `requested`, asignación y seguimiento en vivo | La línea de tiempo marca «Solicitado» y lista los pasos siguientes como pendientes; no se finge seguimiento. |
| Gateway del mismo origen o CORS, renovación de token y hosting | Solo funciona con el proxy de desarrollo. |

# Registro de decisiones arquitectónicas (ADR)

Los ADR registran **propuestas** y aceptación explícita. Estado inicial de todos: **Propuesta**, salvo requisito de marca provisional, previamente expresado.

## ADR iniciales
- [ADR-0001 — Monorepo](0001-monorepo.md)
- [ADR-0002 — Backend modular](0002-modular-backend.md)
- [ADR-0003 — React Native + Expo](0003-react-native-expo.md)
- [ADR-0004 — Supabase y eventos en vivo](0004-supabase-realtime.md)
- [ADR-0005 — Diseño UI web/nativo](0005-ui-strategy.md)
- [ADR-0006 — Contratos primero y autoridad del backend](0006-contract-first.md)
- [ADR-0007 — Backend local reproducible](0007-local-backend.md) — aceptado exclusivamente para desarrollo sintético por instrucción del usuario.
- [ADR-0008 — Stack de Volon UI web](0008-ui-web-stack.md) — React Aria Components, Tailwind 4 y Storybook; ajusta la elección candidata de ADR-0005.
- [ADR-0009 — merchant-web con Vite y React Router](0009-merchant-web-stack.md) — SPA autenticada; proxy local y modo demostración solo en desarrollo.

- [ADR-0010 — Direcciones y snapshots sintéticos](0010-delivery-location-snapshots.md)
  — compatible con JSON existente; no adopta proveedor ni autoriza domicilios reales.

- [ADR-0011 — Ciclo de vida de ubicaciones personales](0011-location-privacy-lifecycle.md)
- [ADR-0012 — courier-mobile con Expo SDK 57](0012-courier-mobile-stack.md) — demo sintética headless: React Navigation, jest-expo y `expo export`; ADR-0003 sigue condicionada a teléfonos reales.
  — propuesta, sin plazos aprobados ni borrado productivo.

- [ADR-0013 — Identidad y disponibilidad Courier](0013-courier-identity-and-availability.md)
  — laboratorio local sintético #16; no despacho, PII ni conexión móvil.

## Plantilla de nuevas decisiones

- [ADR-0018 — Persistencia Stripe sandbox](0018-stripe-sandbox-persistence.md):
  reservas/CAS fuera de esperas del proveedor, FORCE RLS y eventos inmutables.

- [ADR-0017 — Stripe Checkout offline](0017-stripe-checkout-offline.md): transporte
  inyectado, firma y reconciliación de prueba; sin red ni gate positivo.

- [ADR-0016 — Base financiera](0016-financial-foundation.md): preparación pendiente
  y evidencias aisladas; sin PSP ni desbloqueo de despacho.

Título, fecha, estado, contexto, motivación, alternativas, decisión, consecuencias, pruebas pendientes, reversibilidad y enlaces. Estados recomendados: Propuesta, Aceptada, Sustituida, Rechazada.

La elección de tecnología no debe basarse exclusivamente en familiaridad; registrar pruebas que motiven su adopción.
## ADR de laboratorio #18

[ADR-0014 — Asignación exclusiva aislada](0014-dispatch-lab.md): aceptada solo
para pruebas locales/sintéticas, no para operación comercial.

- [ADR-0015 — Folios de Delivery](0015-delivery-public-reference.md): referencia
  humana inmutable 1:1, con backfill y búsqueda autenticada; incremento #19.

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
  — propuesta, sin plazos aprobados ni borrado productivo.

## Plantilla de nuevas decisiones

Título, fecha, estado, contexto, motivación, alternativas, decisión, consecuencias, pruebas pendientes, reversibilidad y enlaces. Estados recomendados: Propuesta, Aceptada, Sustituida, Rechazada.

La elección de tecnología no debe basarse exclusivamente en familiaridad; registrar pruebas que motiven su adopción.

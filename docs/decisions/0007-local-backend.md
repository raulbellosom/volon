# ADR-0007 — Backend local reproducible

- **Fecha/estado:** 17-10-2026, aceptado para desarrollo sintético por instrucción del usuario; producción no autorizada.
- **Decisión:** Supabase CLI oficial fijada en el monorepo administra su stack Docker y esquemas internos. Compose administra únicamente API y Redis. Una sola instancia PostgreSQL, con PostGIS. Prisma 7 estable administra exclusivamente el esquema privado `app`, incluyendo extensiones, restricciones y RLS mediante SQL versionado. No usar `supabase db reset/push` ni otro historial para tablas propias.
- **Seguridad:** migración/seed con conexión administrativa local fuera del contenedor API; runtime con login `delivery_api`, sin superuser, propietario, bypass RLS ni acceso a esquemas internos. Cada transacción establece el subject verificado mediante Supabase Auth; membresías vigentes se consultan en DB, nunca en metadata editable. RLS y FKs refuerzan scopes.
- **Alcance:** Merchant, Branch, Membership y PricingQuote (nombre del modelo de especificación; satisface DeliveryQuote solicitado). Lectura de cotizaciones por sucursal autorizada. Sin Delivery, dinero, workers, UI ni tracking.
- **Rutas:** modo local sintético obligatorio: distancia geodésica PostGIS, no ruta vial ni ETA. Recogida debe coincidir con Branch. Tarifa sintética explícita y versionada. Proveedor real pendiente.
- **Alternativas:** Compose copiado de Supabase (descartado por duplicar mantenimiento), PostgreSQL paralelo (descartado), cliente administrativo en runtime (descartado).
- **Reversión:** detener únicamente este proyecto sin borrar volúmenes; migraciones posteriores aditivas. Cualquier reset/eliminación requiere autorización. Self-Hosted oficial requiere evaluación y runbook propios; CLI local no es despliegue productivo.

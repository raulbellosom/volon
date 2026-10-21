# ADR-0019 — Preparar transporte Stripe Test bajo ejecución manual

Aceptado solo para código y pruebas controladas del Issue #25. No autoriza ninguna
solicitud a api.stripe.com. Extiende ADR-0017/0018, sin cambio de elegibilidad.

Transporte HTTPS opt-in, host/rutas/métodos fijos, certificado y hostname verificados,
TLS >=1.2, DNS IPv4 público, sin proxies/redirecciones ni reintentos. Límites de
tiempo, bytes y presupuesto por plan; ninguna transacción abarca transporte.
El transporte predeterminado continúa denegando. No se instala SDK ni dependencia.

El ejecutor exige terminal local, modo sintético, servicios loopback, entorno no
CI/cloud/production y confirmación exacta del hash del plan. Extensión autorizada
#26: cuenta/clave exclusivamente desde `.env.local` privado e ignorado, tras barrera
local; sin exportarlas a process.env, argumentos o logs. JWT y hash sin eco.
Preflight y CI no leen ese archivo de secretos Stripe. Es una
barrera de operación manual, no contención frente a un propietario local hostil.
Plan inmutable para un escenario autorizado de MXN 44.00; primer create máximo
un POST y dos solicitudes, reconcile máximo cuatro GET. Unknown exige revisión,
no segundo POST manual. La idempotencia durable de #24 se conserva.

Receptor de prueba temporal en 127.0.0.1, sin montaje en API ni túnel. Delega los
bytes originales y firma al adaptador, y reautorización al almacén. Un relay
saliente privado y su secreto requieren aprobación posterior, sin registro de
webhook público. No se abre el receptor durante comandos create/reconcile.

#26 acepta rk_test y sk_test con el mismo validador hasta el socket; Live denegado.
Cuenta del archivo debe coincidir con escenario y plan antes de ejecutar;
solo tras aprobación GET Account verifica Stripe antes de POST. Webhook secret y
publishable Test opcionales. API/Snapshot mantienen exactamente 2026-09-30.endive;
2022-11-15 es incompatible. Permisos y revisión pendiente de la clave en runbook.
Este ajuste no autoriza solicitudes externas.

Sin migraciones ni wiring comercial; retiro = dejar de invocar el ejecutor.
[Contrato](../specification/stripe-checkout-test.md) y
[runbook](../operations/stripe-test-trial.md). No acredita captura, PSP real o backups.

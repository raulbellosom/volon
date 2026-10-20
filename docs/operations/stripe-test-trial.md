# Primer ensayo Stripe Test — preparado, ejecución todavía no autorizada

Issue #25 / ADR-0019. Solo prepara código; ninguna solicitud Stripe fue ejecutada.
No portal, Delivery, dinero real ni despacho. Conekta/Openpay siguen alternativas.

## Cuenta y claves: trabajo posterior del fundador

1. Entrar personalmente al Dashboard oficial, crear/seleccionar un sandbox dedicado
   y comprobar visualmente el entorno de prueba y su accountId. No activar Live.
2. Revisar [claves](https://docs.stripe.com/keys) y
   [sandbox](https://docs.stripe.com/sandboxes): Stripe recomienda RAK. El adaptador
   heredado acepta solo sk_test, no rk_test; aprobar explícitamente su alcance
   en sandbox aislado o implementar/revisar RAK antes del ensayo. No usar sk_live.
3. Mantener la clave en un gestor privado del fundador. El ejecutor la solicita
   directamente en una terminal local sin eco; nunca pegarla en chat, Issue,
   comando, .env, archivo versionado, captura o log. No hay picker Stripe de Codex
   integrado. Si la terminal está grabándose/compartida, detenerse.
4. La clave se mantiene en memoria durante el comando; no se garantiza borrado
   físico de strings, memoria, swap o clipboard. Revisar custodia antes de usarla.

## Preparación local sin Stripe

`pnpm local:up` prepara Supabase/DB sintéticos. Un operador de migraciones local
aprovisiona **un** StripeSandboxScenario: UUID nuevo, subject verificado del usuario
sintético, branch_synthetic_a o b con membresía actual, merchant correspondiente,
accountId del sandbox revisado, amountMinor=4400, currency=MXN, purpose=offline-test.
Sin FK a Delivery. El runner no usa rol administrador ni crea escenarios.
Plantilla para el operador en PostgreSQL local (reemplazar solo IDs no secretos;
obtener subject sintético con /v1/me autenticado, nunca copiar el bearer al SQL):

```sql
INSERT INTO app."StripeSandboxScenario"
  (id, "subjectId", "branchId", "merchantId", "accountId", "amountMinor")
VALUES ('UUID_NUEVO'::uuid, 'SUBJECT_LOCAL'::uuid, 'branch_synthetic_a',
        'merchant_synthetic_a', 'acct_SANDBOX_REVISADO', 4400);
```

```powershell
pnpm stripe:sandbox:preflight
pnpm stripe:sandbox:trial --preflight
pnpm stripe:sandbox:trial --plan create UUID_DEL_ESCENARIO
```

Plan pide el bearer local sin eco y verifica Auth/RLS; hace cero consultas Stripe.
Devuelve JSON público mínimo y SHA-256. No es autorización. Revisar HEAD, cuenta,
escenario, MXN 44.00, dos requests máximo, un POST, cero checkout completado,
cero tarjetas, cero reintentos y vencimiento de la aprobación operacional.
El plan se guarda en `.local/stripe-trial-plan.json`, sin secretos, con vigencia
máxima de una hora. Volver a planificar sobrescribe solo ese documento público.

## Comandos preparados, NO ejecutar todavía

```powershell
pnpm stripe:sandbox:trial --create UUID_DEL_ESCENARIO SHA256_DEL_PLAN
pnpm stripe:sandbox:trial --plan reconcile UUID_DEL_ESCENARIO
pnpm stripe:sandbox:trial --reconcile UUID_DEL_ESCENARIO SHA256_DEL_PLAN
```

Create exige teclear `AUTORIZO STRIPE TEST SHA256_DEL_PLAN` en entrada oculta;
después solicita sk_test sin eco. GET /v1/account debe coincidir antes del POST.
Se valida livemode=false en objetos, importe/moneda/binding y clave idempotente.
No abre Checkout ni devuelve URL tokenizada. El regreso del navegador no acredita pago.
Reconcile tiene plan separado, cuatro GET máximo y necesita Session ya enlazada.

Unknown/crash/commit incierto: **detener**, conservar escenario y key/hash en DB;
no repetir create ni crear otro fixture para saltar el bloqueo. Si existe binding,
revisar/autorizar reconcile. Sin binding se necesita investigación y aprobación
de recuperación con la misma clave antes de 23 h; el runner no la automatiza.

## Webhook privado, fase posterior

El receptor preparado solo escucha loopback temporal y delega firma/raw bytes al
adaptador; no hay endpoint público en API. Un relay saliente de Stripe CLI podrá
reenviar eventos al puerto local una vez aprobado. Su whsec es distinto del de
un endpoint Dashboard; no intercambiarlos. Capturarlo por canal privado sin
banner/log, cargarlo en memoria y verificar HMAC antes de JSON. No instalar,
autenticar ni ejecutar Stripe CLI/túneles en este incremento.
El relay deberá entregar eventos snapshot con api_version `2026-09-30.endive`;
otra versión se rechaza, sin relajar validadores para hacer pasar el ensayo.
Ver [CLI](https://docs.stripe.com/cli) y
[firmas](https://docs.stripe.com/webhooks/signature). No hay comando de listener
remoto habilitado: requiere aprobación de TTL, tipos y presupuesto GET separado.

## Aprobación pendiente y riesgos

Fundador: aprobar sandbox/cuenta y alcance de clave, hash/HEAD exactos, ventana
temporal, una Session de MXN 44.00 y dos solicitudes máximo; aceptar que una
respuesta incierta exige revisión. Aprobar por separado webhooks/relay y ensayos
con tarjetas ficticias. Revisar PII/retención y custodia local. Test doubles no
demuestran aceptación de cuenta, captura, reembolso o disputa auténticos.
Preflight continúa readyForExternalCalls:false; ninguna variable desbloquea CI,
production, portal o elegibilidad. No hay aprobación productiva en este documento.

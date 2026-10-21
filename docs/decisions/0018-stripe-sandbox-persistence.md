# ADR-0018 — Reservas recuperables de Stripe sandbox

Estado: aceptado exclusivamente para laboratorio local/sintético por el Issue #24.
Sustituye el almacén efímero y callback de almacenamiento de ADR-0017; conserva
sus fronteras offline, firmas y elegibilidad operativa siempre negativa.

Tres tablas aditivas: escenario aprovisionado administrativamente, proyección de
envío/reserva y eventos append-only. Sin FK a Delivery ni ServicePayment*. El
escenario exige subject propietario y membresía/sucursal/comercio vigentes por RLS.
No se otorgan privilegios a clientes Supabase ni se crean escenarios por API.

El puerto reserva un lease corto mediante SQL; devuelve una copia desconectada.
El adaptador persiste clave/hash antes del transporte y ejecuta TODO await del
proveedor fuera de SQL. Guarda resultados mediante token, versión y vencimiento
CAS; reautoriza cada escritura y replay. PostgreSQL gobierna fechas y versiones.
Un resultado tardío no puede confirmar sobre una reserva reemplazada o expirada.
Los adversos enlazados se guardan antes de consultar al proveedor.

Tras crash/timeout se recupera con la misma clave/cuerpo, nunca con una clave
nueva. Un lease no garantiza exactamente una llamada HTTP: el proveedor simulado
debe respetar idempotencia para obtener una única sesión tras un envío incierto.
Sin binding tras 23 horas no se repite POST. No recuperación automática ni worker.
Los leases duran 30 s por defecto (pruebas pueden reducirlos), máximo 60 s.

Se descartan transacciones que incluyan transporte, bloqueo de proceso como
garantía durable, consumo de eventos antes de comprobar binding y mutaciones de
intentos financieros históricos. Los eventos conservan únicamente digest/recibo,
no body, firma, clave secreta, URL, tarjeta ni datos del comprador.

Retiro seguro: descomponer el adaptador y conservar tablas/historia. No down
destructivo. Pruebas PostgreSQL deben demostrar concurrencia, fencing, reinicio,
rollback, revocación y ausencia de transacciones durante transporte bloqueado.
No valida Stripe real, restauración de backups ni tratamiento productivo.

Contrato y reproducción: [Stripe sandbox](../specification/stripe-checkout-test.md).

Extensión #27 autorizada solo para preparar el fixture local: herramienta en
scripts/local, conexión administrativa postgres local y verificación de la
identidad/membresía existente; sin cambios de grants/RLS ni migraciones. Advisory
lock transaccional por sucursal y bloqueo de escenario durante create/reuse;
dry-run SQL read-only. Una submission, incluso vacía, o escenarios múltiples/
incompatibles bloquean sin reemplazo. No se usan credenciales Stripe ni HTTP.
El bloqueo coordina invocaciones de la herramienta; SQL administrativo ajeno que
ignore el protocolo no queda contenido por un nuevo índice. No es frontera contra
un propietario local hostil. Retiro: dejar de invocarla y conservar historia.

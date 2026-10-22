# ADR-0021 — Recuperación Stripe auditable, implementación offline

Estado: implementación y pruebas aprobadas solo en instancias desechables (#26).
No autoriza migrar ni escribir en la instancia manual ni acceder a Stripe.

Se añaden tres tablas sin alterar columnas, triggers existentes o permisos históricos:
`StripeSandboxRecoveryLab` identifica una base desechable; una decisión inmutable
`StripeSandboxRecoveryDecision` referencia la submission original y conserva
evidencia revisada y digest del registro completo; `StripeSandboxSuccessor`
consume esa decisión mediante FK/UNIQUE y guarda UUID, key y digest nuevos.
Las FK nuevas añaden dependencias referenciales internas, sin reescribir filas.
Una decisión y un sucesor como máximo por escenario. Sin estados de ejecución:
el sucesor queda `prepared-offline`, sin transporte o credenciales Stripe.

La creación es una única transacción mediante función privada con search_path
fijo. Bloquea escenario/submission y membresía sin actualizarlos; comprueba dueño,
habilitación, importe, ausencia de binding/eventos/leases y demás intentos de la
sucursal. Snapshot completo y evidencia deben corresponder. La evidencia requiere
revisión humana de un error oficial 400 y su request; no equivale a una prueba
criptográfica de Stripe y no se obtiene mediante solicitudes nuevas.

RLS de lectura hereda el alcance del escenario. Runtime no tiene INSERT/UPDATE/
DELETE/TRUNCATE directos sobre las tablas nuevas; solo puede invocar la función
acotada con contexto y marcador desechable válidos. Triggers rechazan mutaciones
de las nuevas filas. Los comandos rechazan el perfil manual y CI/cloud/no-TTY;
las integraciones invocan el núcleo sin red en la base desechable de CI.

El plan v2 offline fija decisión/sucesor, cuenta, HEAD, SHA-256, MXN 4400,
caducidad <=1h y presupuesto 2 requests/1 Session. No contiene key ni evidencia
privada y no puede usarse con el ejecutor v1. No hay comando de ejecución externa.

La habilitación futura manual requiere otra revisión y autorización de las
escrituras exactas; este corte no incluye un flag que la habilite. Reversión:
dejar de invocar la herramienta; conservar tablas y evidencia, sin rollback destructivo.

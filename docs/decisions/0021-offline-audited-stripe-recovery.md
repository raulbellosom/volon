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

Preparación administrativa posterior (#26): autorizados únicamente inspección
READ ONLY, respaldo privado completo y pruebas de restauración/migración en clones
sin red. Herramienta de migración única con hash del SQL aprobado, preflight ligado
a HEAD/instancia/huellas y aprobación independiente con TTY. Añade bookkeeping
Prisma dentro de la misma transacción que el DDL y verifica conservación antes de
commit. No se aplica a la manual en este corte, no se habilita recuperación y no
se crea aprobación privada automáticamente. Cualquier aplicación o restauración
en la manual requiere nueva autorización expresa; no hay rollback destructivo.

## Evolución: soporte manual independiente, pendiente de activación

El fundador confirmó posteriormente la aplicación autorizada de la migración
auditada, con 1/1/0 intacto y recuperación aún bloqueada. Se autoriza implementar
el perfil manual y probarlo exclusivamente en bases desechables. No se ejecutan
escrituras en PostgreSQL manual ni se modifica la migración aplicada.

Se añaden funciones manual_ready/manual_catalog_digest/manual_prepare en otra
migración, aún sin aplicar. Conservar la función de laboratorio evita convertir
la procedencia manual en desechable o abrir un flag de bypass. La lógica SQL
manual comparte body/estructuras y RLS existentes; las comprobaciones de evidencia
se repiten deliberadamente en la nueva función de frontera porque la función
auditada anterior conserva exactamente su contrato y su guard de laboratorio.

Inspección/propuesta no autentican ni escriben PostgreSQL: verifican la identidad
provisionada y alcance RLS y declaran pendiente la autenticación del operador.
El password grant oficial crea sesiones Auth; queda reservado para la ejecución
futura tras archivo de autorización y frase oculta por SHA/HEAD. Se documenta ese
efecto no financiero y se mantienen tokens en memoria. No se certifica identidad
del operador ni ausencia de una Session durante una inspección.

La evidencia requiere dos documentos privados distintos y revisión explícita del
historial, sin inferencias automáticas del HTTP 400. Una propuesta inmutable con
plazo <=1h fija huellas, catálogo y efectos. La transacción solo añade Decision y
Successor; la auditoría ampliada vive en el JSON de Decision. No hay otro marcador,
tabla de autorización, edición histórica o permiso directo de escritura runtime.
La aprobación humana es una frontera del CLI local; el digest no es firma de Stripe.
Reversión: conservar funciones/filas y denegar ejecución; nunca reset o borrado.

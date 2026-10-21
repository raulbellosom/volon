# ADR-0020 — Instancia local manual Stripe separada

Estado: remediación técnica aprobada por el fundador el 2026-10-21, exclusivamente
para aprovisionamiento local. No autoriza tráfico Stripe. Extiende ADR-0018/0019.

El stack histórico permanece intacto. Nueva instancia `delivery-stripe-manual`:
PostgreSQL y Supabase Auth con gateway, imágenes fijadas, volumen y red propios,
sin almacenamiento compartido con `delivery-local`. Red Docker dedicada y puertos
explícitos en 127.0.0.1:57321/57322; sin API de Delivery ni despacho. Publicaciones,
etiquetas, montajes, colisiones y procedencia se verifican antes de uso.

Docker Desktop no publicó los puertos del bridge interno durante la comprobación:
se usa bridge dedicado con enlaces explícitos a loopback y default de enlace
127.0.0.1, verificados tras arrancar. No se afirma contención de salida de red;
los contenedores no incluyen integración Stripe ni proveedores externos habilitados.

Configuración privada `.env.stripe-manual.local`, separada del archivo histórico
y del entorno desechable de CI. Solo se copian las claves Stripe internamente al
crear la configuración manual, nunca a contenedores, argv, logs o process.env.
El rol runtime conserva sus permisos de laboratorio; no cambia producción.

Contrato operativo nuevo, solo en la nueva BD: esquema privado `local_control`,
tabla `Environment` singleton con instanceId, purpose manual-stripe-test-v1,
accountId, systemIdentifier y fecha servidor. Metadatos de procedencia, no evidencia
PSP ni habilitación financiera. Acceso de lectura runtime; sin permisos de escritura
runtime. Configuración, marcador y recursos Docker deben corresponder; diferencias
detienen el proceso. No se crea este esquema en el stack histórico.

Se verifica una base vacía de escenarios/submissions/eventos antes del seed y de
la única fixture manual de MXN 4400. Se conserva huella interna, sin publicación,
del historial anterior para comprobar preservación. HISTORY_BLOCKED permanece.
HTTPS recibe contexto local validado explícitamente y verifica procedencia por
solicitud; secretos no se exportan. No se relaja la allowlist de hosts ni puertos.

Reversión: dejar de invocar comandos manuales y detener únicamente su proyecto,
conservando volúmenes e historial. Sin borrado automático, down -v ni reset.
Integraciones automáticas siempre en su instancia desechable; nunca en la manual.

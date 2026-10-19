# ADR-0011 — Ciclo de vida separado de ubicaciones personales

Estado: **Propuesta**, 18-10-2026, issue #12. Requiere aprobación de arquitectura,
seguridad, operación y revisión jurídica/licencias. No hay migración, worker,
endpoint de borrado ni tratamiento de domicilios reales implementado.

## Problema

[ADR-0010](0010-delivery-location-snapshots.md) conserva JSON sintético inmutable.
Un domicilio/coordenada precisa en PricingQuote.request o Delivery.routeSnapshot
no podría eliminarse selectivamente con el trigger actual. El permiso de leer
una Delivery no debe implicar acceso indefinido a su dirección. Cifrar una copia
no elimina el texto de snapshots, logs, exportaciones o respaldos anteriores.

## Diseño propuesto

Separar un núcleo inmutable de hechos comerciales/operativos (ID, sucursal,
quote, importes, moneda, versión de tarifa y estado) de un sobre sensible privado
versionado. El núcleo conserva una referencia aleatoria opaca de alta entropía,
sin domicilio, indicaciones, punto exacto, geometría vial o hash público de dirección.
Los hashes de domicilios son vulnerables a diccionario y no anonimizan.
Distancias/duraciones y contenido derivado de proveedor pertenecen al sobre según
su clasificación/licencia; la factura del servicio conserva importes propios.

El sobre contiene pickup/destino precisos, texto/indicaciones mínimos, procedencia,
estado de verificación, proveedor/producto/versión y restricciones de uso. Payload
cifrado autenticado con clave por sobre o grupo de retención equivalente, fuera
del backup de datos. AAD vincula scope, identificador y versión para impedir
trasplante entre tenants. No guardar secretos de descifrado junto al ciphertext.
La referencia aleatoria también es seudónima: no declarar anonimización automática.

Cotizar congela una versión; confirmar copia/referencia esa versión por transacción
y valida RLS, vigencia, scope, importes e idempotencia. Editar un borrador produce
otra quote/sobre; replay no actualiza dirección. No desactivar inmutabilidad para
implementar privacidad ni modificar importes como efecto de una eliminación.
El núcleo demuestra el hecho comercial, no conserva prueba perpetua del domicilio.
Si se requiere evidencia exacta, aprobar finalidad, acceso y plazo antes de diseñarla.

## Acceso y políticas

RLS del núcleo y del sobre, mínimos grants; autorización mediante identidad Auth
verificada y permisos de Branch/Merchant actuales. El sobre exige además finalidad
y retención vigente. Sin service-role/BYPASSRLS en API. Worker futuro con permiso
acotado y trazable para el ciclo aprobado; no otorgarle acceso global por comodidad.

Comercio: membresía vigente, Branch/Merchant habilitados, entrega de su sucursal.
Courier futuro: Assignment vigente a esa entrega, sujeto verificado y ventana de
necesidad operativa; revocación/reasignación corta acceso inmediatamente. No crear
este permiso hasta implementar su modelo. Soporte excepcional requiere propósito,
autorización y auditoría; ningún ID o rol cliente basta. No direcciones en listas,
eventos, logs, URLs públicas, cachés compartidas o analytics.

Configuración obligatoria aprobada por finalidad y producto/licencia: policyId,
versión, disparador de inicio/cierre, expiresAt y, si procede, excepción legal
justificada con fecha de revisión y acceso restringido. **Sin plazo predeterminado**.
No asumir que un TTL de quote es retención de datos ni que un permiso Permanent
elimina obligaciones de privacidad. Si no existe política aplicable, bloquear
ingesta de PII, no conservarla indefinidamente por defecto. Restricción efectiva
= la más estricta entre finalidad, obligación aplicable y licencia revisadas.

## Eliminación verificable y recuperación

1. Registrar intención/tombstone en ledger de eliminación protegido y duradero,
   independiente del backup restaurable; cortar lecturas de inmediato, también
   si el worker falla después. No registrar el domicilio ni un hash de su texto.
2. Destruir/revocar clave correspondiente y borrar payload/índices/copias derivadas
   por proceso aprobado. Reintentos idempotentes y estados de progreso verificables.
   Rotación de clave maestra por sí sola no elimina una clave recuperable anterior.
3. Confirmar eliminación en almacén, caché, exportaciones, proveedor cuando aplique
   y respaldos conforme a política. El ciphertext residual sigue bajo controles;
   no afirmar borrado físico instantáneo ni cumplimiento basado solo en una marca.
4. Auditoría mínima: identificador opaco, policyId/versión, motivo, actor/job,
   fechas, alcance y confirmaciones sin payload. Retención propia de auditoría
   aprobada; separar tombstone de logs operativos rotables.
5. Restore: cuarentena sin API; recuperar ledger actualizado, aplicar tombstones,
   no restaurar claves revocadas, comprobar inaccesibilidad y después reabrir.
   Si no se puede verificar ledger/KMS, fallar cerrado. Mantener inventario y
   caducidad de copias de seguridad; ensayar recuperación de copias antiguas.

Las excepciones legales no se activan por una bandera cliente. Deben incluir
fundamento, autorización, límite, revisiones y reglas ante vencimiento.

## Compatibilidad, alternativas y transición

No migrar ni destruir datos en este corte. Snapshots actuales siguen funcionando
solo con datos sintéticos. Antes de aceptar PII: migración aditiva y contrato
versionado de sobre, RLS/grants y tests transaccionales aprobados; conservar reader
legacy limitado. La interfaz futura distinguirá disponible, no capturado y
retirado por retención sin reconstruir dirección mediante geocoding silencioso.
El runtime nuevo no debe escribir PII simultáneamente en sobre y JSON legacy.
Si existiera PII antigua, inventariar y aprobar una migración especial de redacción
de esos campos con evidencia, respaldos y revisión del trigger; no ejecutarla aquí.

Alternativas: JSON editable (rechazado: mezcla privacidad e integridad comercial);
borrar Delivery completa (rechazado: pierde hechos/idempotencia); cifrar con clave
incluida en el mismo backup (rechazado: restauración revierte borrado); sobre
separado sin cifrado (posible simplificación, menor protección en backups; revisar).
Elección final de KMS, clave por sobre, retención, legal holds y mecanismo SQL
permanece pendiente. Reversión: mantener ingesta real bloqueada y reader sintético;
una clave destruida no tiene reversión, requiere política aprobada.

## Evidencia y límites del prototipo

`scripts/maps/tests/privacy-lifecycle.test.ts` prueba **solo un modelo en memoria**
con payload artificial: scope, revocación, AAD, expiración configurada por fixture,
retiro idempotente, restauración sin claves y ledger no disponible. No demuestra
RLS, KMS, borrado físico, recuperación productiva ni cumplimiento jurídico.
RLS real existente sigue cubierto por `pnpm test:integration` sin ampliar permisos.
Antes de PII se requieren tests reales de aislamiento, eliminación concurrente,
fallos parciales KMS/DB, backup/restore y ausencia de PII en telemetría.

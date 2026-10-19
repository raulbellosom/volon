# Sobre de ubicación privado — contrato interno de laboratorio (#14)

Estado: implementable exclusivamente local/sintético por instrucción del usuario.
No acepta ADR-0011 para producción. Sin endpoints HTTP, cambios a DTOs existentes,
enlaces a Quote/Delivery o migración de sus datos. RNF-001/009, ADR-0010/0011.

## Datos y autoridad

Tabla aditiva app.PrivateLocationEnvelope: UUID aleatorio, subjectId verificado,
merchantId/branchId, requestId UUID para replay, versión 1, policyId sintético,
expiresAt explícito, keyRef opaco, IV/tag/ciphertext y tiempos de estado. No claves,
domicilios claros ni índices de dirección. FK compuesta a Branch existente.
RLS FORCE con delivery_api: requiere contexto opt-in de laboratorio y Branch
visible mediante membresía actual y Merchant/Branch habilitados. Inserción solo
con subject propio. Sin permisos DELETE ni UPDATE del payload o scope. Trigger
solo permite transición active → revoked → key_destroyed, sin alterar otros campos.
key_destroyed indica confirmación del simulador, no borrado físico o productivo.

Interfaz interna autenticada: create(Request, {branchId,requestId,fixtureId,
policyId,expiresAt}), read(Request,id), retire(Request,id). Bearer verificado
por el adaptador Supabase existente; nunca aceptar subject en argumentos públicos.
Solo fixtureId predefinidos de cuadrícula cerca de (0,0); no campo de texto libre
ni coordenadas suministradas. expiresAt es obligatorio, no existe plazo por defecto.
Solo políticas synthetic-* previamente configuradas. UUID requestId scope actor/
Branch; replay idéntico retorna referencia; comando distinto produce CONFLICT.

Resultados: create {locationId}; read payload sintético o null si no visible,
revocado o caducado; retire {state:key_destroyed} tras confirmar todos los pasos.
Errores constantes UNAUTHENTICATED, INVALID_INPUT, ACCESS_DENIED, CONFLICT,
UNAVAILABLE; sin detalles de claves, SQL o payloads. No hay serialización HTTP.

## Cifrado, ledger y concurrencia

Puerto de claves intercambiable; simulador en memoria AES-256-GCM con clave
aleatoria por referencia, IV aleatorio de 96 bits y tag de 128 bits. AAD incluye
tenant, Branch, ID, versión, subject/request, policyId, expiresAt y keyRef. No
entregar plaintext hasta finalizar autenticación GCM y validar fixture.
El ledger independiente exige registro activo y binding coincidente; registro
ausente o ledger/KMS inaccesible produce UNAVAILABLE. Revalidar ledger, DB/scope y
reloj tras descifrar. Locks transaccionales del laboratorio no modifican tablas
de negocio. Revocaciones concurrentes se observan al último control de lectura;
no se pueden retirar bytes que una lectura autorizada ya entregó.

Retiro: tombstone irreversible primero, estado DB revoked, destruir clave simulada,
confirmación ledger y DB key_destroyed. Reintento completa pasos pendientes, nunca
reactiva. Si DB falla después del tombstone, se conserva denegación externa. Si
creación falla o commit resulta incierto, compensación intenta tombstone y retirar
clave; fallo de compensación requiere reconciliación, no éxito. Activación tardía
no puede sobreescribir tombstone. Estado expired se deriva del reloj de PostgreSQL;
no modifica automáticamente filas ni supone política legal o purge implementado.

Claves y ledger están fuera de PostgreSQL y son efímeros: reinicio del simulador
no restaura acceso. No exportar claves ni inventar ledger activo desde una fila.
Restaurar una fila antigua no permite acceso si ledger está revocado, falta,
binding cambia o clave fue retirada. Pruebas guardan una fila sintética activa en
tabla temporal PostgreSQL y la reproducen mediante el puerto de lectura tras
retirarla, manteniendo verificación de visibilidad actual. No reescriben filas
inmutables ni constituyen backup/restore productivo o recuperación ante desastre.

## Gate y reversión

Composición explícita environment local/test, enabled=true y syntheticOnly=true;
rechazar NODE_ENV=production y puertos sin marca de simulación. No importado por
main.ts. El repositorio verifica delivery_api sin superusuario/BYPASSRLS; rechaza
incluso una conexión administrativa inyectada. Las integraciones
son el ejecutable del laboratorio, sin provisionar un endpoint o daemon persistente.

Migración Prisma exclusivamente CREATE TABLE/INDEX/TRIGGER y grants sobre la nueva
tabla, sin UPDATE/DELETE/ALTER de tablas existentes. Reversión segura: dejar de
construir el laboratorio, conservar tabla/filas y migración; no ejecutar down ni
borrar datos. Campos de Quote/Delivery y trigger de inmutabilidad sin cambios.
KMS real, ledger duradero separado, retención/purge, backups y política legal
requieren aprobación; no habilitar PII aunque las pruebas locales pasen.

# Folios públicos de Delivery — incremento #19

Contrato coordinado API/merchant-web, local y sintético. Delivery.id/deliveryId
siguen siendo identidad técnica, FK, navegación y desempate del cursor. El folio
no es token ni permiso. [ADR-0015](../decisions/0015-delivery-public-reference.md).

## Formato y capacidad

Primera emisión: `VL-26-7K9M2Q` (ejemplo artificial). Prefijo comercial de 2–4
letras ASCII mayúsculas, año UTC de emisión de dos cifras y seis símbolos de
`23456789ABCDEFGHJKMNPQRSTVWXYZ` (30 símbolos, sin 0/1/I/L/O/U).
Seis posiciones ofrecen 729,000,000 combinaciones por prefijo/año. No se presupone
ausencia de colisiones: a 10,000 emisiones la probabilidad de alguna colisión
previa a reintentos es aproximadamente 6.6%; ocupación por intento 0.00137%.
UNIQUE global y ocho intentos acotados resuelven colisiones, nunca truncar UUID.
Node randomInt y pgcrypto gen_random_bytes con rechazo de sesgo son CSPRNG.

Lectores admiten sufijos de 6–10 posiciones para ampliación futura; generador
actual emite seis. Prefijo por defecto en branding; DELIVERY_REFERENCE_PREFIX
validado al arrancar permite cambiar solo emisiones nuevas. No renombrar folios
históricos. El año no concede unicidad por sí mismo, ni es fecha de la entrega.

## Persistencia y rollout

DeliveryPublicReference: deliveryId PK/FK restrict a Delivery, publicReference
UNIQUE/canónico e issuedAt de PostgreSQL. INSERT/SELECT runtime bajo FORCE RLS
por Delivery visible; sin UPDATE/DELETE ni acceso anon/authenticated. Trigger
inmutable también frente a administradores. No duplica snapshot ni scope.
Un constraint trigger diferido en INSERT Delivery exige mapping al commit.
Creación y folio comparten transacción; idempotencia relee el mapping existente.
Colisiones de folio se resuelven mediante INSERT ON CONFLICT DO NOTHING, sin
abortar la transacción PostgreSQL. Agotamiento revierte Delivery y consumo quote.

Séptima migración aditiva: bloquea brevemente escrituras Delivery, agrega tabla,
backfill de filas anteriores con prefijo VL/año UTC de emisión y activa el
constraint. No UPDATE de Delivery, snapshot, timestamp, quote ni recibo antiguo.
Función backfill solo para migración/admin, idempotente y con ocho intentos por
fila; repetirla con otra marca no cambia mappings. Fallo revierte la migración
completa. Despliegue local coordinado: migrar y reconstruir API/cliente juntos;
el código anterior no podrá confirmar nuevas entregas sin mapping tras migrar.
No hay fallback que muestre UUID como Folio. Reversión conserva datos/tablas.

## HTTP y DTO

DeliveryResponse agrega campo requerido `publicReference: string` canónico al
esquema cerrado existente, manteniendo exactamente sus otros campos. Creación,
detalle UUID e items del historial usan el mismo DTO/validador compartido.
Los clientes de esquema cerrado deben actualizarse junto con API; no se promete
compatibilidad de parsers antiguos. Idempotencia, cursores y rutas UUID no cambian.

`GET /v1/deliveries/by-reference/{reference}` requiere bearer Supabase verificado.
Entrada máxima 32 caracteres antes de trim; ASCII únicamente. Se aceptan prefijo,
año y sufijo completos, con separador opcional (guion o espacio) entre grupos,
mayúsculas/minúsculas y espacios exteriores. Ejemplos equivalentes:
`vl-26-7k9m2q`, `VL267K9M2Q`, `VL 26 7K9M2Q`.
Sin coincidencias parciales, fuzzy, prefijos o caracteres ambiguos del sufijo.

200: DeliveryResponse. 401: UNAUTHENTICATED; 422: INVALID_PUBLIC_REFERENCE;
404: NOT_FOUND idéntico para inexistente/otra sucursal/membresía revocada;
503: SERVICE_UNAVAILABLE seguro para Auth/DB. GET solamente, query params
rechazados con 422; Cache-Control no-store. Ruta explícita previa a lookup UUID.
RLS y membresía/Branch/Merchant habilitados se aplican incluso con folio conocido.
No expone snapshot/dirección, hashes o idempotency keys.

## Portal y validación

Confirmación, historial y detalle muestran publicReference. Copia accesible con
confirmación/fallo visibles; código monoespaciado en una línea. Búsqueda resuelve
el folio por API y navega al detalle UUID; no interpreta un folio como deliveryId.
Demo usa folios sintéticos válidos, sin convertirlos en autorización real.
Pruebas: formato/año/prefijo, colisiones/agotamiento, concurrencia, backfill previo
a migración, atomicidad/idempotencia, RLS y búsqueda/copia en portal.

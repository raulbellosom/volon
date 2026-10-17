# 12 — Próximas acciones priorizadas

**Estado observado al 17-10-2026:** monorepo previsto pero sin código; docs de arquitectura, especificación y reglas para IA publicados. Este master plan es **borrador**, no aprobado. No se han ejecutado spikes, entrevistas ni despliegues.

## Orden concreto recomendado
1. **Acordar el primer negocio:** envíos para negocios, marketplace o lanzamiento híbrido; elegir un flujo principal y responsables.
2. **Elegir cobertura piloto y horario:** zonas, radios, transporte, volumen mínimo y límites comerciales.
3. **Mapear quién cobra a quién:** sin suponer split/payout legal; preparar flujo completo de factura, reembolso y liquidación.
4. **Revisar modelo jurídico mexicano:** modalidad laboral, contratación, seguridad social/seguros, privacidad GPS, manejo de efectivo y documentos.
5. **Obtener insumos de comercios y couriers reales:** sin ellos precios, ETA, suposiciones de demanda y prioridades no se pueden validar.
6. **Aprobar journey completo y máquina de estados de Delivery y Assignment:** eventos de excepción, custodia, cancelación y reasignación.
7. **Hacer lista mínima de pantallas por rol M0:** comercio, courier nativo, admin, tracking destinatario; preparar prototipos.
8. **Diseñar contrato OpenAPI/eventos y modelos lógicos versionados:** no producir tablas indiscriminadamente.
9. **Ejecutar spikes de Expo GPS/gestos y Supabase Realtime/RLS:** priorizar condiciones que pueden forzar un cambio de stack.
10. **Probar selección de proveedor de mapas y PSP** con sandbox/costos/matriz mexicana.
11. **Definir baseline NFR y presupuesto**, sobre datos y pruebas, no aproximaciones arbitrarias.
12. **Ratificar ADR/plan de releases y dar permiso de implementación P2** tras superar condiciones.

## Tres decisiones para una revisión de producto
- ¿Primera comercialización: mensajería/reparto para comercios con ventas propias?
- ¿Quién es responsable de la flota (plataforma, tercero o comercio) y cómo cambia tarifa y relación jurídica?
- ¿A través de quién fluye el dinero en el primer servicio, con o sin cobro al destinatario?

No es necesario elegir stack móvil o completar diseño final para responder estas tres preguntas de negocio.

## Artefactos para la próxima revisión
- `product-brief-v1` ratificado: qué problema/actor se atiende, qué no incluye, criterios de éxito.
- `pilot-zone-v1`: geografía de prueba, horario, categorías y capacidad (sin datos personales).
- `money-flow-v1`: dinero por actor, factura y pasarela, revisado fiscal/legalmente.
- `delivery-state-v1`: transiciones y excepciones revisadas por operación.
- `spike-report-expo` y `spike-report-realtime`: resultados técnicos medidos, no predicciones.
- `go-no-go-F1`: aprobación explícita con responsables.

## Qué NO voy a asumir
No dar por aprobada comisión, contratación o distribución de fondos; no imponer Expo, Supabase, Next.js o shadcn como inamovibles; no anunciar «app terminada», «servidor listo», pruebas verdes ni permisos legales por el hecho de que exista documentación.

## Próxima decisión controlada
Propuesta: cerrar `STR-005` (modalidad de primer servicio), `STR-003` (cobertura) y `STR-007` (economía por entrega), después preparar la matriz de flujos y contratos de negocio. Si el usuario aprueba otra secuencia, registrar su motivación y dependencias.

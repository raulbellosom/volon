# 08 — Operación real, soporte y crecimiento comercial

**Estado:** playbooks y operaciones previstas; no hay acuerdos ni equipos contratados.

## Operación no es un módulo opcional
Una entrega real con incidencias necesita personas y procedimientos, además de apps. El piloto no puede depender de que cada error se resuelva editando una fila de base de datos.

## Comercios: adquisición y onboarding
1. Precalificar zona/categoría/volumen y verificar modalidad permitida.
2. Formalizar contrato, términos, identidad de negocio y obligaciones fiscales aplicables.
3. Registrar Merchant, Branch, responsable, horarios, lugar de recogida, zonas, contacto operativo y usuarios.
4. Capacitar en cotización, solicitud, preparación, cancelación, evidencia y soporte.
5. Ejecutar entrega de ensayo con datos apropiados y revisar facturación/cobro.
6. Activar de forma gradual con responsable de acompañamiento y métricas.
7. Medir retención, uso semanal, fricción y costo de adquisición.

## Repartidores: incorporación y actividad
1. Comunicar condiciones económicas/operativas y tratamiento legal validado.
2. Validar documentación pertinente, identidad, vehículo, cobertura, seguros/obligaciones según modalidad.
3. Registro Courier/FleetMembership, permisos por actor y sesiones seguras.
4. Entrenamiento GPS/permisos Android+iOS, turnos, aceptar/rechazar, zonas, mapas, recogida, entrega y seguridad.
5. Protocolos de desconexión, batería, incidentes, custodia del pedido y soporte humano.
6. Conciliación/confirmación de ganancias y procedimientos de disputa según modelo financiero.
7. Supervisión con finalidad limitada, sin usar GPS como vigilancia general.

## Centro de despacho y soporte
- Consola por zona: deliveries, offers, ETA/frescura, disponibilidad, incidencias y reintentos.
- Runbooks: nadie acepta, courier se retrasa/desconecta, local cerrado, cliente no recibe, artículo dañado, contracargo, accidente, robo, quejas de privacidad.
- Intervención autorizada: reasignar con causa y custodia; suspender zona/comercio/courier con justificación; no saltar ledger.
- Escalación: primer contacto → dispatcher → responsable de operación → legal/seguridad/finanzas según gravedad.
- Trazabilidad de tickets, tiempos y resolución; métricas por categoría, evitando métricas que incentiven decisiones inseguras.

## Clientes finales
En envío contratado externamente, el destinatario puede recibir enlace/estado restringido. En marketplace: búsqueda, compra, seguimiento, recibo, devoluciones y soporte. No crear cuentas a destinatarios sin fundamento ni exponer direcciones en links enumerables.

## Canales de adquisición comercial
- **M0:** visitas/alianzas locales, contacto directo, landing, casos de uso, demostraciones y referidos permitidos.
- **M1:** SEO local, landing por negocio/categoría, redes, campañas de conversión, recuperación de clientes, promociones con presupuesto y atribución.
- **M2:** asociaciones con operadores de flotas y API/POS, alianzas comerciales, expansión geográfica validada.
- No asumir un presupuesto publicitario ni una tasa de conversión sin experimentos. Definir coste por lead/comercio activo y margen de clientes retenidos.

## Métricas operativas mínimas
Oferta aceptada, tiempo solicitud→courier, tiempo pickup, tiempo viaje, completadas/canceladas/fallidas, GPS stale, solicitudes sin courier, soporte por 100 entregas, entrega por zona y franja, ingreso repartidor y margen de contribución, satisfacción y retención de comercio. Ver [modelo financiero](09-finance-and-capacity.md).

## Planeación de turnos y cobertura
Antes de ofertar servicio: capacidad de couriers, zonas, restricciones de circulación/vehículos, demanda estimada, horarios, lluvia/picos, mecanismos de pausa y contingencia. No prometer cobertura/tiempos sin soporte operativo.

## Políticas antes de piloto
Atención y canales, tarifas visibles, cancelación, límites por producto/tamaño/distancia, bienes restringidos, tratamiento de efectivo si existe, reclamaciones, evidencia y retención, seguridad de ruta, accident reporting, proceso de fraude, conductas prohibidas y mecanismo de inconformidad de repartidores conforme a ley.

## Roles funcionales, no personas asignadas
Responsable producto, comercial, operaciones, desarrollo backend, mobile, frontend/design, plataforma/SRE, QA, seguridad, legal/fiscal y soporte. Una persona puede desempeñar varios roles al principio, **pero no debe existir ausencia de responsabilidad ni de separación en actos financieros sensibles**.

## Prueba piloto y aprendizaje
Operar pocos comercios elegibles en una zona claramente definida, documentar cada incidencia, revisar datos por cohorte y pausar ampliación si seguridad, cumplimiento, conciliación, soporte o calidad no cumplen.

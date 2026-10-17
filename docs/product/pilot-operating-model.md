# Modelo operativo elegido para el piloto M0

**Versión de diseño:** 0.2 · **Fecha:** 2026-10-17 · **Estado:** dirección de producto elegida por delegación del fundador para avanzar en planificación. **No significa que el modelo comercial, legal, financiero o tecnológico esté validado, aprobado para producción o contratado.**

Este es el **documento propietario** de las decisiones operativas del primer servicio. Los RF/UC, contratos y WBS solo deben enlazarlo, sin copiar toda su lógica.

## Resultado ejecutivo: qué se hará primero

**Servicio inicial:** entrega local B2B solicitada por negocios que ya vendieron por teléfono, WhatsApp, redes, su tienda u otro canal externo. Volón coordina el reparto; **no crea un `Order` marketplace, no recauda el valor de la mercancía y no ofrece checkout al consumidor en M0**.

**Área:** una **microzona urbana contigua dentro de Puerto Vallarta, Jalisco**, elegida por densidad de comercios, seguridad y cobertura disponible. **Bahía de Banderas, Nayarit, queda para una expansión posterior**, evitando inicio simultáneo de varias áreas/jurisdicciones operativas. La delimitación geográfica concreta requiere datos reales y aprobación de Operaciones: no inventar colonia, polígono o kilómetro de cobertura.

**Cliente pagador M0:** el comercio, no el destinatario. Volón cobra **exclusivamente su servicio logístico**, con concepto, impuesto aplicable y CFDI conforme a la evaluación fiscal. El comercio conserva el cobro y relación comercial de los productos con su cliente.

**Repartidor inicial:** persona en motocicleta elegible para las reglas del servicio. Incorporación y remuneración bajo **modelo de relación jurídica y obligaciones IMSS/fiscales que debe dictaminarse antes del piloto pagado**. No etiquetar `independent contractor` por conveniencia sin revisión. No se requiere `fleet-web` inicial.

## Perfil de piloto controlado

| Aspecto | Elección para planeación | Condición de activación |
| --- | --- | --- |
| Participantes | Hasta 10 comercios invitados como tope inicial de ensayo; cantidad final según capacidad | Confirmar comercios y couriers disponibles |
| Cobertura | Una microzona de Puerto Vallarta, Jalisco | Mapa validado, rutas seguras y cobertura real |
| Horario operativo tentativo | 12:00 a 20:00, hora local, sujeto a capacidad y seguridad | Equipo de soporte/couriers y reglas aprobadas |
| Transporte | Motocicleta, trayectos locales de una recogida y un destino | Documentación, equipo y obligaciones legales |
| Categoría | Comida preparada empaquetada y pequeños bienes ordinarios permitidos | Compatibilidad con seguro, condiciones de temperatura, peso y transporte |
| Mercancía restringida en M0 | Sin alcohol, nicotina, medicamentos restringidos, armas, efectivo transportado, seres vivos, mercancía peligrosa/alto valor y bienes que requieran cadena de frío | Lista de artículos prohibidos y responsabilidades validada legalmente |
| Estructura de tarifa | **Base + tramo de distancia/ruta** por zona, cotización desglosada y sin `surge pricing` en M0 | Ruta medible, unidad económica y reglas fiscales |
| Vigencia de cotización | **10 minutos configurables** para confirmar solicitud, desde emisión; precio aceptado se congela como snapshot | Pruebas de expiración/PSP, caso ACC-015 |
| Cobro del servicio | **Pago individual del comercio mediante PSP externo** al solicitar entrega; sin billetera o split de productos | PSP México, CFDI e impuestos aprobados |
| Cobro al destinatario | No en la plataforma durante M0 | Crear modelo legal nuevo si cambia |
| Pago al courier | Obligación/compensación registrada de modo separado del cobro al comercio; proceso de pago conforme a régimen legal aplicable | Dictamen laboral/fiscal, seguridad social, contrato y conciliación |
| Despacho | Ofertas **secuenciales**, aceptación exclusiva transaccional y despacho manual de respaldo | Ensayos concurrentes y protocolo de incidencias |
| Tracking | GPS durante entrega/turno permitido, canal privado y enlace de destinatario restringido | Permisos, consentimiento/legalidad y pruebas Android/iOS |
| Soporte | Operador humano durante horario habilitado y responsable de incidentes | Personal, capacitación y runbooks comprobados |
| Evidencia de entrega | PIN o confirmación apropiada; fotografía solo cuando justificada y permitida | Retención, consentimiento/información y control Storage |
| Marketing | Onboarding por invitación / relaciones comerciales, no marketplace público | Capacidad real para cumplir servicio |

Los números `10 comercios`, `12:00–20:00` y `10 minutos` son **parámetros iniciales elegidos para planear**, no mediciones ni acuerdos comerciales. Deben ser configurables y revisarse antes de activar operaciones. Ninguna tarifa en MXN o promesa de ETA está definida.

## Proceso comercial y logístico elegido

1. Comercio habilitado inicia una `PricingQuote` con recogida en sucursal, destino y tipo de paquete elegible.
2. Backend valida restricciones, ubicación, disponibilidad operativa y tarifa; devuelve desglose, ID y caducidad.
3. Comercio confirma la solicitud **antes de expirar la cotización**; backend crea una `Delivery` en estado `requested` con snapshot de tarifa e idempotencia.
4. La solicitud queda **no despachable** hasta que el cobro propio del servicio esté verificado conforme al PSP, con separación entre `Delivery.status` y `Payment.status`. No inventar éxito ante timeout; registrar incertidumbre y reconciliar.
5. Después de verificar cobro, se habilita `dispatching`, se buscan couriers elegibles y se ofrece de forma secuencial según reglas de servidor.
6. El courier acepta; backend confirma `Assignment` única y auditable, notifica a comercio y destinatario mediante canales autorizados.
7. Courier reporta recogida, traslado y entrega con hitos/evidencia; la app transmite GPS conforme a finalidad, permisos y capacidades del SO.
8. Comercio/destinatario pueden seguir **solo su entrega** con ubicación fresca y conexión recuperable por API.
9. Finalización/cancelación dispara conciliación de hechos y obligaciones económicas sin mezclar estado de `Order`, `Delivery` y `Payment`.

## Qué ocurre ante excepciones

| Escenario | Decisión de producto |
| --- | --- |
| Sin courier elegible | No prometer ETA; reintentar de manera acotada, operador decide o inicia cancelación/reembolso según política |
| Pago en estado incierto | Bloquear despacho, consultar/conciliar PSP por clave idempotente; no efectuar cargo nuevo a ciegas |
| Pago rechazado | Solicitud no despachable; reintento o expiración según contrato, sin crear entrega activa |
| Oferta expirada o rechazada | Ofertar al siguiente candidato; nada queda asignado por silencio |
| Dos aceptaciones simultáneas | Solo una `Assignment` válida; devolver conflicto y refrescar estado |
| Courier cancela antes de recoger | Revocación y reasignación con historial, sujeto a reglas de compensación |
| Después de recoger | No dejar paquete sin custodio; incidencia y procedimiento manual; resolución y cargo auditados |
| GPS, push o websocket caído | Seguimiento `stale`, snapshot/polling y operador; las entregas no se confirman por socket |
| Fuera de cobertura | Rechazar cotización antes de cobrar; sugerir alternativa sin inventar tarifa |
| Negocio cerrado o paquete no listo | Incidencia con evidencia, espera/cancelación según política aprobada |
| Objetos restringidos o peso incompatible | Rechazar cotización/solicitud según categoría y límites aprobados |
| Reembolso o disputa | Recurso financiero y asiento de ajuste independientes de `Delivery.status` |

## Reglas de tarifario y dinero

- El importe de mercancía nunca pasa por Volón durante M0; los negocios siguen vendiendo directamente a sus clientes.
- Para cada servicio, la tarifa cubre solo logística; monto calculado como cargo base y tramo/distancia por zona. No fijar montos sin costos reales.
- No hacer split de compras, cuentas de saldo prepago, propinas en app, efectivo, cuotas de suscripción o crédito de comercio en M0.
- La creación de `Delivery(requested)` no significa pago confirmado. El filtro de despacho debe exigir `servicePaymentEligible = true` derivado de un `Payment` verificado, sin usar un booleano editable por cliente.
- Los pagos contra PSP se reconcilian (autorizados/capturados/reembolsados), y las condiciones de cancelación/compensación se definen en un documento contractual validado. No prometer reembolso automático antes de establecer políticas y soporte.
- Los devengos/remuneraciones de couriers son un flujo separado según relación legal, con trazabilidad y factura/recibo que corresponda; no presumir una figura contractual ni periodicidad.

## Derechos, legalidad y riesgos: bloqueantes externos

La **plataforma no debe operar entregas remuneradas antes de revisar con especialistas en México** obligaciones laborales/de seguridad social para repartidores de plataformas, seguros, documentación, retenciones, IVA/CFDI, propiedad legal del cobro por logística y responsabilidad sobre mercancía.

Fuentes de contexto a revisar al ejecutar el gate, sin concluir aplicación particular:
- IMSS/STPS 2026: https://www.imss.gob.mx/node/111772 (tras prueba piloto finalizada 31-dic-2025 siguen reglas hasta directrices nuevas, según comunicado).
- IMSS orientación: https://www.imss.gob.mx/empresas-personas-trabajadoras-plataformas-digitales
- SAT: https://wwwmat.sat.gob.mx/consulta/52846/complemento-servicios-de-plataformas-tecnologicas

**Esto no es dictamen legal.** La elección de motocicleta/comercio pagador no elimina obligaciones de plataforma digital; la aplicación concreta debe determinarse profesionalmente.

## M0: superficies efectivas

- `merchant-web`: sucursal, quote, confirmar solicitud/pago, seguimiento e incidencias.
- `courier-mobile`: identidad, turno, ofertas, navegación, hitos/evidencia y GPS (React Native+Expo condicionado a prueba).
- `admin-web`: onboarding restringido, zonas/tarifas autorizadas, despacho, cambios y soporte.
- `tracking-web`: **vista restringida dentro de customer-web u otra ruta web mínima**, no una app nativa completa.
- `marketing`: página de información/captación de comercios.
- `api` y `worker`: contratos, autorización, pagos, realtime, outbox, jobs, notificaciones y auditoría.

No crear en M0 panel `fleet-web`, customer-mobile, catálogo, carrito, cupones, marketplace ni rutas multi-stop.

## No cerrado aún

**DEC-02** relación jurídica y compensación; **DEC-03** viabilidad PSP/CFDI/retenciones; **DEC-04** importes y cancelación; **DEC-05/06/07/08** pruebas tecnología; **DEC-09** polígono/horarios/capacidad; **DEC-10** base/retención GPS; **DEC-11** excepciones y estados finales revisados; **DEC-13** SLO/costos. Ver [registro de decisiones](../specification/open-decisions.md).

## Trazabilidad y cambio

- Requisitos: [RF-005 a RF-024](requirements.md), [UC-03 a UC-11](use-cases.md).
- Contratos: [máquinas de estados](../specification/state-machines.md), [API](../specification/api-contracts.md), [modelo de finanzas](../architecture/finance.md).
- Planificación: [Plan Maestro](../../MASTER_PLAN.md), [WBS](../master-plan/05-work-breakdown.md), [P0](../roadmap/phase-0.md).
- Cualquier cambio a comercio pagador, dinero de mercancía, cobertura o estrategia de despacho deberá modificar **este** documento y los RF/UC/API afectados, con explicación y pruebas. Evitar copiar todas sus tablas en otros documentos.

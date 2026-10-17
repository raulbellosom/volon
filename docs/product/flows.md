# Flujos operativos principales

**Estado:** propuesta de procesos a desglosar en diagramas de secuencia y criterios de aceptación.

## A. Pedido marketplace
1. Cliente consulta disponibilidad y precios vigentes de sucursal.
2. Backend vuelve a calcular importe antes de confirmar.
3. Se registra pedido y resultado de pago, o estado pendiente según proveedor.
4. Negocio recibe evento y confirma preparación.
5. Se crea solicitud de entrega vinculada al pedido.
6. Motor de despacho ofrece el trabajo a un repartidor elegible.
7. Repartidor acepta; el backend decide la asignación transaccionalmente.
8. Se captura recogida, trayecto y prueba de entrega.
9. Se reconcilian cargos, devoluciones e ingresos con trazabilidad.

## B. Solo entrega
1. Comercio crea una Delivery sin Order marketplace.
2. Valida cobertura, tarifa y condiciones.
3. Selecciona repartidor propio, tercero o despacho de Volón conforme al contrato.
4. Se siguen los mismos estados logísticos y controles de evidencia.
5. Cobro y liquidación siguen el modelo acordado para este servicio.

## C. Excepciones
- No hay repartidor: reintentar, ofrecer en otra zona o escalar a operador, nunca garantizar ETA inventado.
- Repartidor desconectado: última ubicación con edad visible, estado de entrega persistido y protocolo de apoyo.
- Doble aceptación: aceptación atómica; solo una asignación ganadora.
- Cliente no localizado: llamada/canal de soporte, tiempo de espera y desenlace registrado.
- Pedido cancelado: política por etapa y consecuencias monetarias diferenciadas.
- Push no recibido: app sincroniza vía API al abrirse o reconectar.
- Incidencia de pago: mantener estado del dinero separado de entrega.

## Semántica de estados
Definir una máquina de estados versionada por Order, Delivery, Assignment y Payment. Cada transición requiere actor autorizado, versión/condiciones previas, marca temporal, idempotencia, auditoría y posibles compensaciones.

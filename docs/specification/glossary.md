# Glosario normativo inicial

**Estado:** guía semántica propuesta, independientemente del nombre comercial.

- **Marketplace:** canal de venta donde una persona compra artículos al comercio mediante nuestra plataforma.
- **Delivery-as-a-Service:** traslado solicitado sin requerir un Order dentro del marketplace.
- **Merchant:** negocio, no necesariamente una sucursal.
- **Branch:** unidad operativa con ubicación y horarios.
- **Courier:** repartidor registrado y elegible, no confundir con vehículo ni flota.
- **Fleet:** entidad operadora/agregadora de repartidores según relación contractual vigente.
- **CourierShift:** declaración operativa de disponibilidad con control de vigencia, no sesión WebSocket.
- **Order:** transacción comercial de compra/venta, puede generar entregas.
- **Delivery:** compromiso logístico de recogida y destino, exista o no Order.
- **Stop:** punto de recogida/entrega; el MVP no implementa rutas multi-parada complejas.
- **AssignmentOffer:** propuesta temporal de trabajo dirigida a repartidor elegible.
- **Assignment:** vinculación operativa confirmada entre courier y Delivery, con historial y estado.
- **PricingQuote:** cotización aceptable con vigencia y desglose inmutable al confirmar.
- **Payment:** objeto de cobro en PSP; no es el valor económico total ni equivale al estado logístico.
- **LedgerEntry:** movimiento financiero inmutable conciliable, no balance editable arbitrario.
- **Domain Event:** hecho de negocio emitido tras commit; no es comando ni simple Broadcast.
- **Outbox:** cola durable en DB para publicar efectos sin perder cambios confirmados.
- **Realtime:** transporte de actualizaciones a interfaces conectadas; requiere recuperación desde API.
- **GPS Sample:** observación con tiempo de dispositivo y recepción de servidor; no prueba automática de entrega.
- **Tenant:** ámbito lógico de autorización; puede ser merchant, fleet u organización según recurso. No supone DB por empresa.
- **ADR:** registro de decisión técnica con estado, alternativas y evidencia.
- **SLO/SLI:** objetivo de nivel de servicio / indicador de medición; definir antes de ofrecer garantías.
- **Spikes:** prototipos de investigación para reducir riesgos antes de implementación real.

Un nombre visible puede cambiar; estas palabras definen conceptos técnicos independientes de marca.

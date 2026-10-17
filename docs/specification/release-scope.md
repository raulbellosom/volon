# MVP y evolución por capacidades

**Estado:** hipótesis prioritaria: iniciar con **Delivery-as-a-Service** (solicitudes de entrega para comercios con ventas por canales propios). Validar antes de declararlo la primera línea comercial.

## Propuesta de valor por etapa
- **Piloto controlado:** negocios registrados solicitan recogida y entrega; operadores controlan excepciones y repartidores utilizan app nativa.
- **Marketplace:** clientes exploran productos, compran y pagan dentro de la plataforma; crea Order y normalmente Delivery.
- **Flotas:** operadores terceros, múltiples repartidores/vehículos, políticas de asignación y conciliaciones más complejas.
- **Expansión:** ciudades/zonas, reglas fiscales/operativas locales, integraciones y automatización.

## Matriz de capacidades y releases

| Capacidad | Piloto envíos | Marketplace | Flotas avanzadas |
| --- | --- | --- | --- |
| Identidad y organizaciones/roles | Básico seguro | Reutiliza | Amplía |
| Comercios/sucursales/horarios | Sí | Amplía catálogo | Reutiliza |
| Solicitud, tarifa y estados de Delivery | Sí | Reutiliza | Reutiliza |
| Repartidor móvil, ofertas, GPS | Sí | Reutiliza | Amplía |
| Despacho manual y semiautomático | Sí | Amplía | Políticas avanzadas |
| Notificaciones + soporte + auditoría | Sí | Reutiliza | Reutiliza |
| Cobro/conciliación | Según modelo legal/comercial aprobado | Checkout marketplace | Payout multiparte |
| Catálogo, carrito, checkout cliente | No, salvo descubrimiento comercial | Sí | Reutiliza |
| Apps móviles de clientes | No | A evaluar | A evaluar |
| Optimización multi-parada/route batching | No | A evaluar | A evaluar |
| Empresas de flota con liquidación propia | No, gestión mínima | A evaluar | Sí |

## Entregable mínimo para poder operar en un piloto
1. Un comercio autorizado crea una cotización y solicitud de entrega con consentimiento/aviso de privacidad apropiado.
2. El sistema valida zona, precio, identidad, datos y términos; registra Delivery con un ID único.
3. Un operador ofrece o asigna a un repartidor elegible y se evita doble aceptación concurrente.
4. El repartidor visualiza, acepta, navega, reporta recogida y confirma entrega con evidencia proporcionada.
5. Comercio/operador/cliente autorizado visualiza un estado persistente y GPS con antigüedad explícita.
6. Ante falla de socket, GPS, push o conectividad se mantiene el flujo por API y soporte humano.
7. Una incidencia/cancelación conserva auditoría y reglas económicas aprobadas.
8. Registro financiero y conciliación solo para los flujos de cobro legalmente habilitados.

## Fuera del piloto por defecto
Descubrimiento público de miles de productos, recomendaciones inteligentes, enrutamiento de cientos de paradas, wallets internas, créditos, múltiples países, suscripción dinámica, bots de despacho sin control humano, IA autónoma financiera, reparto de ganancias no autorizado.

## Restricciones comerciales por verificar
- Comercios y cantidad de repartidores piloto, tipo de transporte, cobertura, tiempo operativo.
- Quién cobra a quién, cuándo nace la obligación de entrega, políticas de cancelación y compensación.
- Responsable de soporte, horario y protocolos ante accidentes e incidencias.
- Condiciones laborales/seguridad social y protección de datos.

## Criterio para priorizar
Ordenar por impacto al usuario, riesgo de seguridad/finanzas, dependencia técnica y costo de operación. No crear una capacidad «para escalar» si no existe límite modular que la justifique. Ver [plan de implementación](implementation-roadmap.md).

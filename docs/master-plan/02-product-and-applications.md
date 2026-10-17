# 02 — Producto completo y aplicaciones

**Estado:** catálogo de producto a largo plazo, no backlog comprometido. [Modelo M0 elegido para diseño](../product/pilot-operating-model.md): entrega externa B2B, logística pagada por comercio, PSP confirmado antes de despacho, una zona en Puerto Vallarta. Etiquetas: **M0** = piloto esencial propuesto; **M1** = marketplace; **M2** = flotas/crecimiento; **E** = exploración posterior.

## Journey A — Envío sin marketplace (M0)
Comercio inicia sesión → elige sucursal → indica recogida/destino/ventana y referencias → recibe cotización → confirma solicitud → plataforma verifica el cobro del servicio logístico al comercio → despacho ofrece secuencialmente a repartidor → repartidor acepta → seguimiento privado → recoge y entrega con evidencia → soporte/conciliación. Todo paso crítico debe reflejar un estado backend auditable.

## Journey B — Pedido dentro del marketplace (M1)
Cliente encuentra comercio disponible → explora catálogo/variantes → arma carrito → valida dirección, horario, subtotal, envío, comisión e impuestos → confirma pago según flujo autorizado → comercio acepta/prepara → entrega usando el mismo motor logístico → seguimiento → recibo, calificación y soporte. **Order, Delivery y Payment son procesos distintos.**

## Journey C — Flota (M2)
Operador empresarial registra miembros/vehículos y elegibilidad → indica turnos/capacidad → consulta asignaciones por scope → aplica reglas de reparto → seguimiento e incidencias → conciliación de servicios y reportes. No usar flota como puerta para leer ubicaciones ajenas a trabajos autorizados.

## Superficies y funcionalidades

| Experiencia | M0 | M1 | M2 / E |
| --- | --- | --- | --- |
| Marketing web (Astro candidato) | Presentación, contacto, interés de comercios, aviso de privacidad, SEO básico | Landing por categoría/ciudad, campañas | Contenido y referidos medidos |
| Comercio web | Usuarios y sucursales, cotización, solicitar reparto, lista/estado, incidencias | Catálogos, productos, modificadores, inventario disponible, pedidos, preparación | Integraciones POS/API, analítica, suscripciones |
| Repartidor Android/iOS | Acceso y onboarding, documentación, turnos, ofertas, aceptar/rechazar, navegación externa, GPS, pickup/dropoff, pruebas y ganancias informativas | Más categorías de servicio, preferencias | Multi-parada, flotas, capacitación, optimización |
| Cliente web/PWA | Página de seguimiento restringida / contacto si negocio solicita reparto | Descubrir, buscar, catálogo, carrito, checkout, direcciones, perfil, seguimiento, historial, ayuda | Personalización, fidelidad, suscripciones |
| Cliente móvil nativo | No | Evaluar evidencia | Publicar si hay necesidad real de retención/funciones |
| Administrador web | Comercios, couriers, zonas, precios, consola de despacho, permisos, soporte, auditoría | Moderación, promociones, reembolsos, dashboard financiero | Gestión multi-ciudad, antifraude avanzado |
| Gestión de flotas | Administrador básico dentro de consola si se requiere | Perfiles/membresías | Portal propio y reglas avanzadas tras validación |
| Backend y workers | API, authz, Delivery, Pricing, Dispatch, Tracking, Notifications, Audit y registros financieros según PSP | Orders, Catalog, Cart, Checkout, promociones | Integraciones, logística avanzada y reportes |

## Feature slices de producto
**M0 esenciales:** onboarding de comercio y repartidor; quote/cobertura; creación y ciclo de Delivery; asignación exclusiva; vista operativa de despacho; localización con consentimiento; Realtime + re-sync; push; incidencias; evidencia; auditoría; cobros conforme a modelo legal aprobado; informes mínimos.

**M1 marketplace:** publicaciones comerciales, productos, precios y horarios, carrito, promociones con límites, checkout seguro, Payment, Order, preparación, tracking y soporte; adquisición de clientes y SEO por tienda.

**M2 flotas:** contratos de prestación/roles, turnos por grupo, capacidad, rutas de equipo, conciliaciones, reportes, manejo multi-sucursal, APIs externas.

**E futuras:** app cliente Android/iOS, multi-parada, batch optimization, recomendaciones, loyalty, expansión regional, APIs públicas, mayor automatización de dispatch; cada una requiere caso comercial y ADR.

## Comportamientos transversales
- Internacionalización preparada pero **es-MX** inicialmente; moneda MXN y montos enteros (centavos).
- Estados de UI: loading, empty, failure, offline, stale location, unauthorized, version conflict.
- Dirección precisa, referencias y teléfono son datos de acceso restringido y finalidad limitada.
- Alternativa accesible a gestos; compatibilidad con teléfonos modestos.
- Experiencia operativa para alta humedad/calor/lluvia o batería limitada, sin garantizar sensores de GPS en todas las condiciones.

## No incluir «por si acaso»
Chat interno universal, mapas 3D, wallets, créditos, IA para asignar dinero, microservicios por rol, SaaS multi-país o un panel separado por cada actor sin evidencia.

## Aceptación
Para M0, revisar [22 escenarios ACC](../specification/acceptance-matrix.md) y [máquinas de estados](../specification/state-machines.md). M1 y M2 tendrán sus propios criterios antes de que comiencen.

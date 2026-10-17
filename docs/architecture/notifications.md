# Notificaciones, mensajes y entregabilidad

**Estado:** diseño de responsabilidades.

## Canales
- Realtime Broadcast cuando la app está conectada.
- Mobile Push: proveedor capaz de enrutar a FCM/APNs (directo o servicio intermediario como Expo Push).
- Web Push: service worker, permisos y push subscriptions según navegador y plataforma.
- Correo transaccional o mensajería opt-in para confirmaciones y atención.

## Modelo de entrega
Backend genera un hecho persistido y worker produce el aviso con deduplicación, reintentos, límites y métricas. El resultado del proveedor no equivale a que el usuario lo leyó. Eventos relevantes requieren confirmación explícita en la API (por ejemplo, aceptar asignación).

## Casos
Nuevo pedido; asignación ofrecida; aceptación/vencimiento; negocio confirma; repartidor cerca; entrega completada; cancelación; incidencia; pago/recibo.

## Condiciones
Registrar dispositivos y sesiones; revocar tokens caducos; respetar permisos; contenido mínimo en pantalla bloqueada; evitar revelar direcciones exactas si no es necesario. Gestionar quiet hours donde aplique, tipos de avisos y consentimiento.

## Pruebas
Web cerrada, Android en background, iPhone en background, red intermitente, token caducado, reintento duplicado y fallback a consulta de API.

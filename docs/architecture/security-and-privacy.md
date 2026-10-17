# Seguridad, identidad y privacidad

**Estado:** requisitos no negociables de diseño; revisión legal pendiente.

## Identidad y autorización
- Autenticar comprador, empleado, operador de flota y repartidor.
- Autorizar cada operación sobre recurso y tenant; no confiar en un rol indicado por cliente.
- Permisos jerárquicos por Merchant/Branch/Fleet/Delivery y roles globales limitados.
- Usar mínimos privilegios, MFA para roles sensibles, rotación de secretos y audit logs.
- Policies RLS para acceso directo justificado; API repite autorización de negocio.

## Geolocalización
- Recoger ubicación precisa solo durante el propósito documentado y con permisos apropiados.
- Permitir que el repartidor entienda cuándo está siendo rastreado.
- Limitar difusión temporal de ubicación del repartidor: cliente de esa entrega, comercio/operador pertinente.
- Mostrar último punto y antigüedad; no fingir posición actual.
- Definir consentimiento/avisos, finalidad, retención y borrado conforme a regulación aplicable y revisión especializada.
- No exponer ubicaciones de terceros en enlaces públicos sin protección proporcional.

## Controles
TLS, cifrado en reposo según datos, secretos en gestor seguro, control de tasa, límites de payload, validación de archivos, antifraude básico, auditoría de cambios y detección de comportamientos anómalos. Evitar registrar números completos de tarjetas y coordenadas precisas en logs generales.

## Seguridad operativa
Plan de respuesta a incidentes, monitoreo de acceso, copias fuera del VPS, recuperación de prueba, aislamiento de entornos, seguridad de supply chain, revisión de dependencias, pruebas de autorización cruzada entre comercios y protección ante replay de eventos.

## Pendiente
Evaluación formal de privacidad mexicana, obligaciones de conservación y derechos ARCO, evaluaciones de proveedores y diseño de consentimiento de localización para Android/iOS.

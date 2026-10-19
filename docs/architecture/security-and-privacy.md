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

### Direcciones y ubicaciones de entregas (#11)

El incremento actual solo admite datos sintéticos. No recopila nombre, teléfono
ni datos del destinatario; texto e indicaciones son datos no verificados. No
registrar cuerpos, direcciones ni coordenadas en logs, analítica o errores.
Pickup y snapshots requieren bearer y RLS actual; no se agregan a historial,
listados, eventos ni enlaces públicos. Las lecturas de registros legacy devuelven
texto null y fuente desconocida, sin intentar geocodificar datos antiguos.

Los plazos de retención requieren una política aprobada por finalidad, evento y
licencia; no hay duración predeterminada. El issue #12 reemplaza los ejemplos
temporales anteriores por configuración obligatoria sin valores inventados.
Diseño propuesto de sobre sensible, eliminación y recuperación en
[ADR-0011](../decisions/0011-location-privacy-lifecycle.md), todavía sin migración.

No existe todavía ejecución de esta retención. El trigger inmutable de Delivery
impide redactar/borrar el JSON; antes de domicilios reales se necesita un diseño
aprobado de redacción o sobre sensible con ciclo de vida separado, manejo de
respaldos y prueba de borrado. Tampoco existen cierres operativos reales en este
corte. No simular cumplimiento mediante un flag, ni desactivar el trigger para
limpiar datos. Los fixtures sintéticos persistentes no son autorización para PII.

### Laboratorio privado de ubicaciones (#14)

La implementación separada añade almacenamiento cifrado con RLS, Auth verificada,
gate local/sintético y ledger obligatorio. No sustituye los JSON anteriores ni
acepta entrada libre. [Contrato y límites](../specification/private-location-lab.md).
KMS/ledger simulados viven fuera de PostgreSQL, solo en memoria; si se pierden,
no se recupera acceso desde una copia de DB. Las pruebas de fila archivada no
equivalen a restauración física. Retención, KMS y ledger duraderos, auditoría,
borrado físico y recuperación productiva requieren revisión y aprobación.

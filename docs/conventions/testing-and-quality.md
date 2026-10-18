# Estrategia de pruebas y puertas de calidad

**Estado:** CI activo para generación/validación Prisma, límites, TypeScript estricto y tests de dominio/contratos/API/políticas. El job backend agrega Supabase local oficial, migraciones, build Docker e integración Auth/PostGIS/RLS. No se mide cobertura ni se implementó lint de estilo. Ver [comandos locales](../operations/local-backend.md).

## Pirámide de pruebas
| Nivel | Casos | Cuándo |
| --- | --- | --- |
| Unitarias | reglas de tarifa, estado, validadores, cálculo de ETA, parsers, hooks puros | cada cambio de lógica |
| Componentes | props, estados, accesibilidad, gestos con pruebas adecuadas | UI nueva/modificada |
| Integración | API, permisos, DB/PostGIS, colas, outbox, conflictos, webhooks | límite entre módulos/servicios |
| Contrato | esquemas API, eventos, compatibilidad móvil/web y versionado | al modificar contratos |
| E2E | compra/solicitud, aceptación, pickup, entrega, cancelación, pago | trayectos principales |
| Dispositivo físico | GPS background, batería, push, mapas, gestos y offline | antes de aprobar stack y releases |
| Seguridad/carga | cross-tenant, acceso a ubicación, rate limits, 100+ sockets simulados según plan | hitos de arquitectura y pre-piloto |

## Principios
- Escribir pruebas de comportamiento, no pruebas que solo copian la implementación o verifican componentes triviales.
- Cada bug corregido requiere prueba que reproduzca el fallo, cuando sea viable.
- Simular proveedores externos, pero también mantener pruebas de integración/sandbox para hechos importantes.
- Ejecutar en CI las pruebas que no necesiten dispositivos/servicios de pago; las manuales deben tener acta de ejecución con evidencia.
- No aceptar nuevas funcionalidades sin pruebas apropiadas ni omitir errores de TypeScript/lint para que pase un pipeline.
- Nunca afirmar «tests passed» ni cobertura determinada si no hay un resultado reproducible.

## Cobertura
Objetivo orientativo global ≥80% **de código lógico medible**, ≥90% en reglas de tarifa, asignación, permisos y movimientos monetarios, sujeto a revisión por riesgo. Ningún porcentaje sustituye pruebas de bordes, concurrencia, integraciones o flujos reales. Estos umbrales se aplicarán únicamente después de crear la infraestructura de pruebas.

## Casos críticos de Volón
- Dos repartidores aceptan a la vez; solo un ganador válido.
- Webhook duplicado o tardío no genera doble cargo ni liquidación.
- Usuario de una tienda intenta leer pedidos y ubicaciones de otra.
- Cliente ve solo coordenadas de su reparto mientras la entrega permita seguimiento.
- Repartidor pierde Internet, batería o permisos de GPS; reconcilia al volver.
- WebSocket se desconecta; UI restaura estado confiable desde API.
- App cerrada/background recibe push cuando sistema y permisos lo permiten.
- Rutas de pago, cancelaciones, reembolsos y retornos generan estados trazables.
- Accesibilidad y alternativas a swipe en móvil, cambios de orientación y datos largos.

## Puertas de CI futuras
1. formato y lint sin errores;
2. typecheck estricto;
3. regla automatizada de longitud de archivos y límites de paquete;
4. unit/component/integration tests y contratos;
5. build independiente de apps afectadas;
6. análisis de dependencias/secretos y licencias apropiadas;
7. inspección de diffs de migraciones, permisos, datos y despliegue;
8. revisión humana en cambios de seguridad, finanzas o arquitectura.

No activar herramientas ficticias ni inventar comandos npm hasta que el monorepo exista. Registrar excepciones de pruebas y criterios de salida en cada PR.

## Checklist de release a piloto
Validaciones en staging; pruebas de restore, carga medida, dispositivos reales, métricas/logs y alertas, matriz de permisos, operación manual si fallan GPS/push, control de versión móvil y procedimiento de rollback.

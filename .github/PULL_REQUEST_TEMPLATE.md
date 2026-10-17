## Objetivo y alcance
¿Qué problema resuelve? ¿Qué dominios/apps cambia? Enlazar issue o ADR si aplica.

## Diseño
¿Se buscó reutilizar componentes, hooks y lógica existentes antes de crear más código? ¿Mantiene separación por capas y contratos tipados? ¿Cambia la marca provisional o alguna interfaz pública?

## Verificaciones realizadas
Listar **comandos ejecutados y sus resultados**. Marcar explícitamente pruebas pendientes, no aplicables o bloqueadas.

## Riesgos y reversión
Permisos/GPS, pagos, concurrencia, datos, migraciones, compatibilidad móvil y pasos para revertir si aplica.

## Checklist
- [ ] Cambio enfocado, sin código spaghetti ni duplicación significativa (DRY con criterio).
- [ ] Componentes visuales ≤250 líneas; hooks/controladores ≤200; servicios/módulos ≤300; fuente de producción ≤400 o excepción humana registrada.
- [ ] UI/documentación en español México; código/contratos en inglés; neutralidad de marca.
- [ ] Reutilización apropiada; componentes accesibles en web y gestos alternativos en móvil.
- [ ] Pruebas de comportamiento y regresión agregadas/actualizadas, o motivo de no aplicar.
- [ ] Lint/typecheck/build/tests pertinentes **ejecutados** cuando el código y herramientas existan.
- [ ] Sin credenciales, GPS de personas ni información sensible en diff o logs.
- [ ] Seguridad, idempotencia y permisos por tenant considerados donde corresponde.
- [ ] Arquitectura y contratos documentados; ADR actualizado cuando corresponde.
- [ ] Cambios riesgosos/destructivos requieren aprobación explícita.

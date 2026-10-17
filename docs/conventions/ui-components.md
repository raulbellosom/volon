# Componentes reutilizables — UI web y móvil

**Estado:** reglas para implementación futura; no hay librería creada aún.

## Filosofía
Queremos un **design system propio**, no el diseño predeterminado de una librería. shadcn/ui es fuente opcional de primitivas web modificables; Tailwind CSS 4 es candidato web. React Native + Expo es candidato móvil sujeto a validación GPS y gestos. NativeWind no se exige hasta fijar versión estable y comprobar compatibilidad.

## Paquetes y dependencias
- `design-tokens`: colores semánticos, fuentes, espaciados, radios, elevaciones y estados, en formatos consumibles por web y native.
- `ui-web`: primitivas web accesibles (shadcn selectivo y adaptado); no mezclar con reglas de pedidos.
- `ui-native`: componentes nativos hechos para Android/iOS; no importar DOM, CSS web ni componentes web.
- `ui-commerce` y `ui-logistics`: componentes de negocio, idealmente con variantes/adaptadores explícitos por plataforma cuando sea necesario.
- `domain`, `contracts`, `api-client`: lógica pura, validación y tipos reutilizables entre canales.

## Reglas obligatorias
1. **Antes de crear un componente**, buscar si existe uno apropiado y revisar su contrato para ampliarlo sin romper consumidores.
2. Crear componentes reutilizables para patrones repetidos con semántica compartida; mantener elementos exclusivos de una pantalla dentro de esa feature.
3. Props pequeñas y tipadas; composición/slots para flexibilidad; prohibir props bandera proliferantes que mezclan responsabilidades.
4. Separar render, loading/error/empty states, obtención de datos y lógica de negocio.
5. Evitar `BaseComponent` gigantes con docenas de variantes, y evitar abstracciones de una sola utilización sin valor claro.
6. Seguir límites de líneas: componentes ≤250; hooks ≤200; fuentes ≤400 máximo sin excepción.
7. Cada componente público define propósito, props, estados, accesibilidad, ejemplos de uso y restricciones (web/mobile).
8. Si cambia una API pública de componentes, documentar migración y actualizar consumidores y pruebas.
9. Cada token refleja un significado (`color.text.muted`, `surface.raised`), no un nombre de marca ni un color arbitrario incrustado por pantalla.
10. Respetar responsive web, dark mode donde exista, tamaño mínimo de touch target y compatibilidad con fuentes ampliadas.

## Mobile: gestos y experiencia nativa
- Preferir navegación y controles nativos del sistema sobre emular el navegador.
- Para swipe, long-press, drag, pan, bottom sheets y animaciones, evaluar React Native Gesture Handler / Reanimated con releases compatibles.
- Evitar conflictos de gestos con scroll vertical, navegación atrás y mapa.
- No hacer depender una acción importante exclusivamente de un gesto: incluir alternativa accesible (botón/menú).
- Respetar safe areas, teclado, pantalla pequeña, orientación y reduce motion.
- Comprobar TalkBack, VoiceOver, foco, feedback táctil, cancelación de interacción y dobles toques.
- Probar en **dispositivos físicos** Android de gama de entrada e iOS, no solo en simuladores.
- GPS y ubicación en segundo plano se prueban separadamente; una librería UI no garantiza tracking.

## Revisión visual
Documentar estados default/hover/focus/pressed/disabled/loading/error/empty cuando correspondan, pruebas de contraste, screenshots aprobadas y comportamiento con datos largos/localizados.

## Selección de dependencias
Registrar licencias/versiones de shadcn, primitivas, iconos, navegación y gestos; verificar mantenimiento y evitar dependencia rígida con la marca provisional.

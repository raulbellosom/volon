# ADR-0005: Design system propio con base selectiva shadcn
- **Fecha:** 2026-10-17
- **Estado:** Propuesta avanzada
- **Contexto:** se desean componentes altamente personalizables que funcionen de manera confiable en web y móvil.
- **Elección candidata:** design-tokens centrales; ui-web propia utilizando opcionalmente código shadcn/ui y Tailwind CSS 4; ui-native propia con primitives nativos.
- **Alternativas:** crear absolutamente toda la UI web desde cero; imponer el mismo renderer web en aplicaciones móviles.
- **Motivos:** control visual/código sin reconstruir todas las piezas accesibles; gestos y patrones nativos preservados.
- **Condiciones:** confirmar licencias de dependencias, API de componentes, pruebas A11y, Gesture Handler/Reanimated y estabilidad de sistema de estilos React Native.
- **Consecuencia:** dos implementaciones visuales coordinadas por tokens; no prometer paridad automática.

import { Screen } from '../ui/Screen.tsx';
import { EmptyState } from '../ui/StateViews.tsx';
import { Notice } from '../ui/Notice.tsx';

/** In local mode offers and deliveries are not connected; the demo ones are never copied here. */
export function NotConnectedScreen() {
  return (
    <Screen>
      <EmptyState
        icon="file-tray-outline"
        title="Ofertas y entregas aún no conectadas"
        description="El backend del laboratorio no genera ofertas ni asignaciones todavía. Esta pantalla no muestra datos ficticios para no confundirlos con trabajo real."
      />
      <Notice tone="info" title="Qué falta en el servidor">
        Elegibilidad financiera confirmada del envío, ofertas con vencimiento del servidor, exclusión de asignaciones y reglas de qué datos del destino puedes ver antes de aceptar.
      </Notice>
    </Screen>
  );
}

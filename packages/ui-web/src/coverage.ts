/**
 * Single source for the Volon UI coverage matrix (rendered in the gallery and checked by
 * tests). `reviewed` is set only after the product owner approves the component visually.
 */
export type CoverageStatus = 'pending' | 'implemented' | 'documented' | 'tested' | 'reviewed';

export type ComponentFamily = 'Acciones' | 'Formularios' | 'Contenido' | 'Navegación' | 'Overlays' | 'Retroalimentación' | 'Dominio';

export interface ComponentCoverage {
  readonly name: string;
  readonly family: ComponentFamily;
  /** Highest status reached; each status implies the previous ones. */
  readonly status: CoverageStatus;
  /** Source file relative to src/components, required once implemented. */
  readonly source?: string;
  readonly notes?: string;
}

const done = (name: string, family: ComponentFamily, source: string, notes?: string): ComponentCoverage =>
  ({ name, family, status: 'tested', source, ...(notes ? { notes } : {}) });

const pending = (name: string, family: ComponentFamily, notes?: string): ComponentCoverage =>
  ({ name, family, status: 'pending', ...(notes ? { notes } : {}) });

export const coverage: readonly ComponentCoverage[] = [
  done('Button', 'Acciones', 'actions/Button.tsx'),
  done('IconButton', 'Acciones', 'actions/IconButton.tsx'),
  pending('ButtonGroup', 'Acciones'),
  pending('ToggleButton', 'Acciones'),
  pending('Link', 'Acciones', 'Enlace estilizado y LinkButton.'),
  done('TextField', 'Formularios', 'forms/TextField.tsx', 'Incluye Textarea (multiline).'),
  done('PasswordField', 'Formularios', 'forms/PasswordField.tsx'),
  done('SearchField', 'Formularios', 'forms/SearchField.tsx'),
  done('Checkbox / CheckboxGroup', 'Formularios', 'forms/Checkbox.tsx'),
  done('RadioGroup', 'Formularios', 'forms/RadioGroup.tsx'),
  done('Switch', 'Formularios', 'forms/Switch.tsx'),
  done('Select', 'Formularios', 'forms/Select.tsx'),
  pending('NumberField / CurrencyField', 'Formularios', 'NumberField de React Aria con formato es-MX.'),
  pending('ComboBox', 'Formularios'),
  pending('DatePicker / TimeField', 'Formularios'),
  pending('Slider', 'Formularios'),
  pending('OTPField', 'Formularios', 'Sin primitiva en React Aria; evaluar antes de construir.'),
  done('Card', 'Contenido', 'content/Card.tsx'),
  done('Badge', 'Contenido', 'content/Badge.tsx'),
  done('StatusBadge', 'Contenido', 'content/StatusBadge.tsx'),
  pending('Avatar / AvatarGroup', 'Contenido'),
  pending('Divider', 'Contenido'),
  pending('Tooltip', 'Contenido'),
  pending('Progress', 'Contenido'),
  pending('DescriptionList', 'Contenido'),
  pending('Table / DataTable', 'Contenido'),
  pending('Stat', 'Contenido'),
  pending('Tabs', 'Navegación'),
  pending('Breadcrumbs', 'Navegación'),
  pending('DropdownMenu', 'Navegación'),
  pending('Pagination', 'Navegación'),
  pending('SegmentedControl', 'Navegación'),
  pending('Stepper', 'Navegación'),
  pending('Sidebar primitives', 'Navegación'),
  done('Dialog', 'Overlays', 'overlays/Dialog.tsx'),
  done('AlertDialog', 'Overlays', 'overlays/AlertDialog.tsx'),
  done('Popover', 'Overlays', 'overlays/Popover.tsx'),
  done('Toast', 'Overlays', 'overlays/Toast.tsx', 'Envuelve la API UNSTABLE de React Aria.'),
  pending('Drawer / Sheet', 'Overlays'),
  done('Alert', 'Retroalimentación', 'feedback/Alert.tsx'),
  done('Spinner', 'Retroalimentación', 'feedback/Spinner.tsx'),
  done('Skeleton', 'Retroalimentación', 'feedback/Skeleton.tsx'),
  pending('EmptyState / ErrorState', 'Retroalimentación'),
  pending('Accordion', 'Retroalimentación'),
  pending('Timeline', 'Dominio', 'Eventos de una entrega con datos sintéticos.'),
  pending('PriceBreakdown', 'Dominio', 'Desglose monetario; sin tarifas reales.'),
  pending('RouteSummary', 'Dominio'),
  pending('ConnectionStatus', 'Dominio'),
];

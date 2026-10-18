/**
 * Single source for the Volon UI coverage matrix, rendered in the gallery and enforced by
 * `coverage.test.ts`:
 * - `implemented`: source and story exist (checked).
 * - `tested`: plus behavior tests; every listed test file must render one of `renders`.
 * - `reviewed`: visual approval by the product owner. Never set by an agent.
 */
export type CoverageStatus = 'pending' | 'implemented' | 'tested' | 'reviewed';

export type ComponentFamily =
  | 'Acciones' | 'Formularios' | 'Contenido' | 'Datos' | 'Navegación'
  | 'Overlays' | 'Retroalimentación' | 'Marca' | 'Logística';

export interface ComponentCoverage {
  readonly name: string;
  readonly family: ComponentFamily;
  readonly status: CoverageStatus;
  /** Source file relative to src/components. */
  readonly source?: string;
  /** Test files relative to src/components. */
  readonly tests?: readonly string[];
  /** JSX names the tests must render to count as covering this entry. */
  readonly renders?: readonly string[];
  readonly notes?: string;
}

interface Spec {
  source: string;
  tests: readonly string[];
  renders: readonly string[];
  notes?: string;
}

const tested = (name: string, family: ComponentFamily, spec: Spec): ComponentCoverage =>
  ({ name, family, status: 'tested', ...spec });

const pending = (name: string, family: ComponentFamily, notes?: string): ComponentCoverage =>
  ({ name, family, status: 'pending', ...(notes ? { notes } : {}) });

const ACTIONS = 'actions/Button.test.tsx';
const TEXT = 'forms/TextFields.test.tsx';
const SELECTION = 'forms/SelectionControls.test.tsx';
const CONTENT = 'content/Content.test.tsx';
const NAV = 'navigation/Navigation.test.tsx';
const OVERLAYS = 'overlays/Overlays.test.tsx';

export const coverage: readonly ComponentCoverage[] = [
  tested('Button', 'Acciones', { source: 'actions/Button.tsx', tests: [ACTIONS], renders: ['Button'] }),
  tested('IconButton', 'Acciones', { source: 'actions/IconButton.tsx', tests: [ACTIONS], renders: ['IconButton'] }),
  tested('SegmentedControl', 'Acciones', { source: 'actions/SegmentedControl.tsx', tests: ['actions/SegmentedControl.test.tsx'], renders: ['SegmentedControl'] }),
  tested('ThemeToggle', 'Acciones', { source: '../theme/ThemeToggle.tsx', tests: ['../theme/Theme.test.tsx'], renders: ['ThemeToggle'], notes: 'Claro / Oscuro / Sistema, persistente.' }),
  tested('ButtonGroup', 'Acciones', { source: 'actions/ButtonGroup.tsx', tests: ['actions/Interaction.test.tsx'], renders: ['ButtonGroup'] }),
  tested('ToggleButton', 'Acciones', { source: 'actions/ToggleButton.tsx', tests: ['actions/Interaction.test.tsx'], renders: ['ToggleButton'] }),
  tested('Link / LinkButton', 'Acciones', { source: 'actions/Link.tsx', tests: ['actions/Interaction.test.tsx'], renders: ['Link', 'LinkButton'], notes: 'Externos con aviso y rel seguro.' }),
  tested('TextField', 'Formularios', { source: 'forms/TextField.tsx', tests: [TEXT], renders: ['TextField'], notes: 'Incluye Textarea (multiline); ícono obligatorio.' }),
  tested('PasswordField', 'Formularios', { source: 'forms/PasswordField.tsx', tests: [TEXT], renders: ['PasswordField'] }),
  tested('SearchField', 'Formularios', { source: 'forms/SearchField.tsx', tests: [TEXT], renders: ['SearchField'] }),
  tested('Checkbox / CheckboxGroup', 'Formularios', { source: 'forms/Checkbox.tsx', tests: [SELECTION], renders: ['Checkbox', 'CheckboxGroup'] }),
  tested('RadioGroup', 'Formularios', { source: 'forms/RadioGroup.tsx', tests: [SELECTION], renders: ['RadioGroup'] }),
  tested('Switch', 'Formularios', { source: 'forms/Switch.tsx', tests: [SELECTION], renders: ['Switch'] }),
  tested('Select', 'Formularios', { source: 'forms/Select.tsx', tests: [SELECTION], renders: ['Select'] }),
  tested('RadioCard / CheckboxCard', 'Formularios', { source: 'forms/ChoiceCard.tsx', tests: ['forms/ChoiceCard.test.tsx'], renders: ['RadioCard', 'CheckboxCard'] }),
  tested('NumberField', 'Formularios', { source: 'forms/NumberField.tsx', tests: ['forms/NumberFields.test.tsx'], renders: ['NumberField'] }),
  tested('CurrencyField', 'Formularios', { source: 'forms/CurrencyField.tsx', tests: ['forms/NumberFields.test.tsx'], renders: ['CurrencyField'], notes: 'MXN es-MX; entrega centavos enteros.' }),
  tested('ComboBox', 'Formularios', { source: 'forms/ComboBox.tsx', tests: ['forms/ComboBox.test.tsx'], renders: ['ComboBox'], notes: 'Filtra al escribir; «Sin resultados».' }),
  tested('Calendar', 'Formularios', { source: 'forms/Calendar.tsx', tests: ['forms/DateTime.test.tsx'], renders: ['Calendar'] }),
  tested('DatePicker', 'Formularios', { source: 'forms/DatePicker.tsx', tests: ['forms/DateTime.test.tsx'], renders: ['DatePicker'] }),
  tested('TimeField', 'Formularios', { source: 'forms/TimeField.tsx', tests: ['forms/DateTime.test.tsx'], renders: ['TimeField'] }),
  tested('Slider', 'Formularios', { source: 'forms/Slider.tsx', tests: ['forms/Slider.test.tsx'], renders: ['Slider'], notes: 'Valor único o rango.' }),
  pending('OTPField', 'Formularios', 'Sin primitiva en React Aria; evaluar antes de construir.'),
  tested('Card', 'Contenido', { source: 'content/Card.tsx', tests: [CONTENT], renders: ['Card'] }),
  tested('Badge', 'Contenido', { source: 'content/Badge.tsx', tests: [CONTENT], renders: ['Badge'] }),
  tested('IconChip', 'Contenido', { source: 'content/IconChip.tsx', tests: [CONTENT], renders: ['IconChip'] }),
  tested('StatusBadge', 'Contenido', { source: 'content/StatusBadge.tsx', tests: [CONTENT], renders: ['StatusBadge'] }),
  tested('Accordion', 'Contenido', { source: 'content/Accordion.tsx', tests: ['navigation/Wayfinding.test.tsx'], renders: ['Accordion', 'AccordionItem'] }),
  tested('Avatar / AvatarGroup', 'Contenido', { source: 'content/Avatar.tsx', tests: ['content/Display.test.tsx'], renders: ['Avatar', 'AvatarGroup'], notes: 'Iniciales de respaldo y disponibilidad.' }),
  tested('Divider', 'Contenido', { source: 'content/Divider.tsx', tests: ['content/Display.test.tsx'], renders: ['Divider'] }),
  tested('Stat', 'Datos', { source: 'data/Stat.tsx', tests: ['content/Display.test.tsx'], renders: ['Stat'] }),
  tested('DescriptionList', 'Datos', { source: 'data/DescriptionList.tsx', tests: ['content/Display.test.tsx'], renders: ['DescriptionList'] }),
  tested('Table + TableFooter', 'Datos', { source: 'data/Table.tsx', tests: ['data/Table.test.tsx'], renders: ['Table'], notes: 'Orden, selección, fila de totales y estado vacío.' }),
  tested('Tabs', 'Navegación', { source: 'navigation/Tabs.tsx', tests: [NAV], renders: ['Tabs'] }),
  tested('Menu (DropdownMenu)', 'Navegación', { source: 'navigation/Menu.tsx', tests: [NAV], renders: ['Menu'] }),
  tested('Pagination', 'Navegación', { source: 'navigation/Pagination.tsx', tests: [NAV], renders: ['Pagination'] }),
  tested('Navbar', 'Navegación', { source: 'navigation/Navbar.tsx', tests: [NAV], renders: ['Navbar'], notes: 'Responsiva con menú lateral en teléfono.' }),
  tested('SiteFooter', 'Navegación', { source: 'navigation/SiteFooter.tsx', tests: [NAV], renders: ['SiteFooter'] }),
  tested('Breadcrumbs', 'Navegación', { source: 'navigation/Breadcrumbs.tsx', tests: ['navigation/Wayfinding.test.tsx'], renders: ['Breadcrumbs'] }),
  tested('Stepper', 'Navegación', { source: 'navigation/Stepper.tsx', tests: ['navigation/Wayfinding.test.tsx'], renders: ['Stepper'] }),
  tested('Sidebar', 'Navegación', { source: 'navigation/Sidebar.tsx', tests: ['navigation/Wayfinding.test.tsx'], renders: ['Sidebar', 'SidebarItem'], notes: 'Contraíble; en teléfono va dentro de Drawer.' }),
  tested('Dialog', 'Overlays', { source: 'overlays/Dialog.tsx', tests: [OVERLAYS], renders: ['Dialog'] }),
  tested('AlertDialog', 'Overlays', { source: 'overlays/AlertDialog.tsx', tests: [OVERLAYS], renders: ['AlertDialog'] }),
  tested('Popover', 'Overlays', { source: 'overlays/Popover.tsx', tests: [OVERLAYS], renders: ['Popover'] }),
  tested('Drawer / Sheet', 'Overlays', { source: 'overlays/Drawer.tsx', tests: [OVERLAYS], renders: ['Drawer'] }),
  tested('Tooltip', 'Overlays', { source: 'overlays/Tooltip.tsx', tests: [OVERLAYS], renders: ['Tooltip'], notes: 'No se muestra en táctil; el control conserva su nombre.' }),
  tested('Toast', 'Overlays', { source: 'overlays/Toast.tsx', tests: [OVERLAYS], renders: ['ToastRegion'], notes: 'Envuelve la API UNSTABLE de React Aria.' }),
  tested('Alert', 'Retroalimentación', { source: 'feedback/Alert.tsx', tests: [CONTENT], renders: ['Alert'] }),
  tested('EmptyState / ErrorState', 'Retroalimentación', { source: 'feedback/EmptyState.tsx', tests: [CONTENT, 'data/Table.test.tsx'], renders: ['EmptyState'] }),
  tested('Spinner', 'Retroalimentación', { source: 'feedback/Spinner.tsx', tests: [CONTENT], renders: ['Spinner'], notes: 'Animación de marca pendiente para una iteración posterior.' }),
  tested('Skeleton', 'Retroalimentación', { source: 'feedback/Skeleton.tsx', tests: [CONTENT], renders: ['Skeleton', 'SkeletonText'] }),
  tested('Progress', 'Retroalimentación', { source: 'feedback/Progress.tsx', tests: ['content/Display.test.tsx'], renders: ['Progress'], notes: 'Determinado e indeterminado.' }),

  tested('Logo', 'Marca', { source: 'brand/Logo.tsx', tests: ['brand/Logo.test.tsx'], renders: ['Logo'], notes: 'PNG oficiales; SVG pendiente de diseño.' }),
  pending('Timeline', 'Logística', 'Eventos de una entrega con datos sintéticos.'),
  pending('PriceBreakdown', 'Logística', 'Desglose monetario; sin tarifas reales.'),
  pending('RouteSummary', 'Logística'),
  pending('ConnectionStatus', 'Logística'),
];

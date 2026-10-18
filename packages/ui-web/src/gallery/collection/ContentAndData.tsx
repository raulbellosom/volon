import { CircleCheck, Clock, MoreHorizontal, Sparkles, Store, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/actions/Button.tsx';
import { IconButton } from '../../components/actions/IconButton.tsx';
import { Badge } from '../../components/content/Badge.tsx';
import { Card, CardContent, CardFooter, CardHeader } from '../../components/content/Card.tsx';
import { IconChip } from '../../components/content/IconChip.tsx';
import { StatusBadge, type DeliveryStatusTone } from '../../components/content/StatusBadge.tsx';
import { Cell, Column, Row, Table, TableBody, TableFooter, TableFooterRow, TableHeader } from '../../components/data/Table.tsx';
import { Pagination } from '../../components/navigation/Pagination.tsx';
import { ShowroomSection, Specimen, SpecimenGrid } from './Showroom.tsx';

const STATUSES: DeliveryStatusTone[] = ['requested', 'searching', 'in-transit', 'delivered', 'incident', 'failed'];

export function ContentSection() {
  return (
    <ShowroomSection id="contenido" overline="04 · Contenido" title="Tarjetas, badges y estados" description="Contenedores concéntricos, la variante de marca en degradado y estados de entrega que siempre llevan ícono y texto.">
      <SpecimenGrid columns={3}>
        <Specimen title="Card" storyId="contenido-card--overview">
          <Card>
            <CardHeader icon={<Store />} overline="Sucursal" title="Centro" description="Juárez 120" action={<IconButton label="Más" icon={<MoreHorizontal />} size="sm" />} />
            <CardContent><Badge tone="success">Abierta</Badge></CardContent>
            <CardFooter><Button size="sm">Solicitar envío</Button></CardFooter>
          </Card>
        </Specimen>
        <Specimen title="Card de marca" storyId="contenido-card--brand" note="Mismo aspecto en ambos temas">
          <Card variant="brand">
            <CardHeader icon={<Zap />} overline="Pídelo de Volon" title="98% a tiempo" description="Promedio de la semana" />
            <CardFooter align="start"><Button size="sm" variant="accent">Ver reporte</Button></CardFooter>
          </Card>
        </Specimen>
        <Specimen title="Badges e IconChip" storyId="contenido-badge--tones">
          <div className="flex flex-wrap gap-2">
            {(['neutral', 'info', 'success', 'warning', 'danger'] as const).map((tone) => <Badge key={tone} tone={tone}>{tone}</Badge>)}
            <Badge tone="brand" icon={<Zap />}>Express</Badge>
            <Badge tone="accent" icon={<Sparkles />}>Nuevo</Badge>
          </div>
          <div className="flex gap-2">
            <IconChip icon={<Store />} />
            <IconChip icon={<Zap />} tone="accent" />
            <IconChip icon={<CircleCheck />} tone="success" />
            <IconChip icon={<Clock />} tone="warning" />
          </div>
        </Specimen>
        <Specimen title="StatusBadge · estados de entrega" storyId="contenido-statusbadge--all-statuses" note="El punto pulsa en estados en vivo" className="md:col-span-2 xl:col-span-3">
          <div className="flex flex-wrap gap-2">{STATUSES.map((status) => <StatusBadge key={status} status={status} />)}</div>
        </Specimen>
      </SpecimenGrid>
    </ShowroomSection>
  );
}

const ROWS = [
  { id: '1', folio: 'PV-1042', zone: 'Centro', status: 'in-transit' as const, fee: 6000 },
  { id: '2', folio: 'PV-1043', zone: 'Marina', status: 'searching' as const, fee: 5250 },
  { id: '3', folio: 'PV-1044', zone: 'Versalles', status: 'delivered' as const, fee: 4500 },
];
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function DataSection() {
  const [page, setPage] = useState(2);
  return (
    <ShowroomSection id="datos" overline="05 · Datos" title="Tablas" description="Orden por columna, selección con el checkbox de marca, fila de totales y desplazamiento horizontal en teléfono. Montos de ejemplo, sin tarifas reales.">
      <Specimen title="Table + Pagination" storyId="datos-table--deliveries">
        <Table aria-label="Envíos de ejemplo" selectionMode="multiple" defaultSelectedKeys={['1']}>
          <TableHeader>
            <Column isRowHeader allowsSorting>Folio</Column>
            <Column>Zona</Column>
            <Column>Estado</Column>
            <Column align="end">Tarifa</Column>
          </TableHeader>
          <TableBody items={ROWS}>
            {(row) => (
              <Row id={row.id}>
                <Cell><span className="font-semibold">{row.folio}</span></Cell>
                <Cell>{row.zone}</Cell>
                <Cell><StatusBadge status={row.status} size="sm" /></Cell>
                <Cell align="end">{money.format(row.fee / 100)}</Cell>
              </Row>
            )}
          </TableBody>
          <TableFooter>
            <TableFooterRow id="total"><Cell>Total</Cell><Cell /><Cell /><Cell align="end">{money.format(157.5)}</Cell></TableFooterRow>
          </TableFooter>
        </Table>
        <Pagination page={page} pageCount={8} pageSize={3} totalItems={23} onPageChange={setPage} />
      </Specimen>
    </ShowroomSection>
  );
}

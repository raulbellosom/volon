import { Button } from '@delivery/ui-web';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

/** Human-facing reference only; navigation continues to use the delivery UUID. */
export function PublicReference({ value }: { value: string }) {
  const [feedback, setFeedback] = useState<{ value: string; status: 'copied' | 'failed' } | null>(null);
  const status = feedback?.value === value ? feedback.status : null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ value, status: 'copied' });
    } catch { setFeedback({ value, status: 'failed' }); }
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <code className="select-all whitespace-nowrap font-mono text-base font-semibold tracking-wide">{value}</code>
        <Button variant="ghost" size="sm" aria-label={`Copiar folio ${value}`} leadingIcon={status === 'copied' ? <Check /> : <Copy />} onPress={() => void copy()}>
          {status === 'copied' ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <span role="status" className="text-xs text-text-secondary">
        {status === 'copied' ? 'Folio copiado.' : status === 'failed' ? 'No pudimos copiar. Selecciona el folio y cópialo manualmente.' : ''}
      </span>
    </div>
  );
}

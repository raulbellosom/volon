import { Skeleton, SkeletonText } from '@delivery/ui-web';

/** Placeholder with the rough shape of a page while its data loads. */
export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4 max-w-md" />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-border-subtle p-5">
        <div className="flex items-center gap-3">
          <Skeleton shape="circle" className="size-10" />
          <SkeletonText lines={2} className="flex-1" />
        </div>
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

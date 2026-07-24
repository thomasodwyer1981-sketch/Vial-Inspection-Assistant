import { ShieldAlert } from 'lucide-react';
import { SHORT_DISCLAIMER } from '@/constants/copy';

export default function DisclaimerBanner() {
  return (
    <div className="bg-muted/60 border-t border-border/60 w-full pt-3 pb-safe-6 px-5 flex items-center justify-center gap-2">
      <ShieldAlert className="w-3 h-3 text-muted-foreground/60 shrink-0" />
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-semibold leading-none">
        {SHORT_DISCLAIMER}
      </p>
    </div>
  );
}

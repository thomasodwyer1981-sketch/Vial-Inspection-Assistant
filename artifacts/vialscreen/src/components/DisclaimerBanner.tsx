import { SHORT_DISCLAIMER } from '@/constants/copy';

export default function DisclaimerBanner() {
  return (
    <div className="bg-muted py-3 px-4 border-t w-full text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-relaxed">
        {SHORT_DISCLAIMER}
      </p>
    </div>
  );
}

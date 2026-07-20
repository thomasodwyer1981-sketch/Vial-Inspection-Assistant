import { Checkbox } from '@/components/ui/checkbox';

interface ChecklistItemProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function ChecklistItem({ label, checked, onCheckedChange }: ChecklistItemProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer p-3 bg-card border rounded-lg shadow-sm hover:bg-secondary/50 transition-colors">
      <Checkbox 
        checked={checked} 
        onCheckedChange={(c) => onCheckedChange(c === true)} 
        className="mt-0.5"
      />
      <span className="text-sm font-medium leading-snug">{label}</span>
    </label>
  );
}

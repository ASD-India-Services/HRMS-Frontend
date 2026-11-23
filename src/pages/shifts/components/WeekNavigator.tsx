/** WeekNavigator — Prev / Today / Next controls shared by the shift roster and schedule. */
import { Button } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';

interface WeekNavigatorProps {
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
}

export function WeekNavigator({ onPrevious, onToday, onNext }: WeekNavigatorProps) {
  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={onPrevious}
        aria-label="Previous week"
        startIcon={<Iconify icon="arrow-left" />}
      >
        Prev
      </Button>
      <Button variant="soft" size="small" onClick={onToday}>
        Today
      </Button>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={onNext}
        aria-label="Next week"
        endIcon={<Iconify icon="arrow-right" />}
      >
        Next
      </Button>
    </>
  );
}

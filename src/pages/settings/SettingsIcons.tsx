/**
 * Settings icon names mapped onto the shared Iconify registry. Kept as thin wrappers so tabs
 * keep their `className` sizing (h-4 w-4 ...) while every icon comes from one icon set.
 */
import { Iconify, type IconName } from '@/components/Iconify';

interface IconProps {
  className?: string;
}

function make(icon: IconName) {
  return function SettingsGlyph({ className }: IconProps) {
    return <Iconify icon={icon} className={className} />;
  };
}

export const SettingsIcon = make('settings');
export const InfoIcon = make('info');
export const CheckIcon = make('check');
export const AlertCircleIcon = make('error');
export const LoaderIcon = make('refresh');
export const HashIcon = make('code');
export const SparklesIcon = make('magic-wand');
export const ClockIcon = make('attendance');
export const CalendarIcon = make('leaves');
export const MailIcon = make('send');
export const SendIcon = make('send');
export const ShieldCheckIcon = make('compliance');
export const ShieldAlertIcon = make('warning');
export const MapPinIcon = make('geoLocations');
export const CopyIcon = make('copy');
export const ExternalLinkIcon = make('external');
export const ChevronDownIcon = make('chevron-down');
export const ChevronRightIcon = make('chevron-right');
export const LayersIcon = make('departments');
export const UsersIcon = make('employees');
export const TagIcon = make('expenseTypes');
export const CloudIcon = make('upload');
export const BriefcaseIcon = make('recruitment');
export const GridIcon = make('dashboard');
export const ClipboardDocumentIcon = make('onboardingTemplates');
export const BanknotesIcon = make('payroll');
export const ChartBarIcon = make('chart');
export const HeadphonesIcon = make('helpdesk');
export const PlusIcon = make('plus');
export const PencilIcon = make('pencil');
export const TrashIcon = make('trash');
export const SearchIcon = make('search');

/**
 * Every Lucide icon the app uses, re-exported from its own module.
 *
 * Never import from the `lucide-react-native` barrel: it evaluates all
 * 3,500+ icons at launch, which is what held the splash screen for tens of
 * seconds. The per-icon subpaths cost exactly what they name — an ESLint
 * `no-restricted-imports` rule keeps the barrel out.
 *
 * Adding an icon is one line here: `export { default as Name } from
 * 'lucide-react-native/icons/<kebab-name>';`.
 */
// eslint-disable-next-line no-restricted-imports -- type-only, erased at compile time.
export type { LucideIcon } from 'lucide-react-native';

export { default as Bell } from 'lucide-react-native/icons/bell';
export { default as BellOff } from 'lucide-react-native/icons/bell-off';
export { default as BellRing } from 'lucide-react-native/icons/bell-ring';
export { default as CalendarCheck } from 'lucide-react-native/icons/calendar-check';
export { default as Check } from 'lucide-react-native/icons/check';
export { default as ChevronLeft } from 'lucide-react-native/icons/chevron-left';
export { default as ChevronRight } from 'lucide-react-native/icons/chevron-right';
export { default as Coins } from 'lucide-react-native/icons/coins';
export { default as EllipsisVertical } from 'lucide-react-native/icons/ellipsis-vertical';
export { default as Lightbulb } from 'lucide-react-native/icons/lightbulb';
export { default as Lock } from 'lucide-react-native/icons/lock';
export { default as Menu } from 'lucide-react-native/icons/menu';
export { default as Plus } from 'lucide-react-native/icons/plus';
export { default as MessageCircleQuestionMark } from 'lucide-react-native/icons/message-circle-question-mark';
export { default as Share2 } from 'lucide-react-native/icons/share-2';
export { default as Spade } from 'lucide-react-native/icons/spade';
export { default as Trash2 } from 'lucide-react-native/icons/trash-2';
export { default as Trophy } from 'lucide-react-native/icons/trophy';
export { default as UserRoundPlus } from 'lucide-react-native/icons/user-round-plus';
export { default as X } from 'lucide-react-native/icons/x';

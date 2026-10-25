import React from 'react';

/**
 * AVORA Unified Pure SVG Icon Design System
 * Modeled after Lucide & Feather Icons specifications:
 * - 24x24 viewBox
 * - Uniform strokeWidth (default 2)
 * - strokeLinecap="round", strokeLinejoin="round"
 * - stroke="currentColor", fill="none" (customizable via props)
 */

const createIcon = (displayName, renderPaths) => {
  const Icon = ({
    size = 20,
    width,
    height,
    color = 'currentColor',
    strokeWidth = 2,
    className = '',
    style = {},
    fill = 'none',
    ...props
  }) => {
    const w = width || size;
    const h = height || size;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={w}
        height={h}
        viewBox="0 0 24 24"
        fill={fill}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`avora-icon ${className}`.trim()}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
        aria-hidden="true"
        {...props}
      >
        {renderPaths({ color, fill, strokeWidth })}
      </svg>
    );
  };

  Icon.displayName = displayName;
  return React.memo(Icon);
};

/* ─── NAVIGATION & GENERAL UI ──────────────────────────────────────────────── */

export const SearchIcon = createIcon('SearchIcon', () => (
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>
));

export const CloseIcon = createIcon('CloseIcon', () => (
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>
));
export const XIcon = CloseIcon;

export const ChevronLeftIcon = createIcon('ChevronLeftIcon', () => (
  <polyline points="15 18 9 12 15 6" />
));

export const ChevronRightIcon = createIcon('ChevronRightIcon', () => (
  <polyline points="9 18 15 12 9 6" />
));

export const ChevronDownIcon = createIcon('ChevronDownIcon', () => (
  <polyline points="6 9 12 15 18 9" />
));

export const ChevronUpIcon = createIcon('ChevronUpIcon', () => (
  <polyline points="18 15 12 9 6 15" />
));

export const CheckIcon = createIcon('CheckIcon', () => (
  <polyline points="20 6 9 17 4 12" />
));

export const SlidersIcon = createIcon('SlidersIcon', () => (
  <>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </>
));

export const ShareIcon = createIcon('ShareIcon', () => (
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </>
));

export const InfoIcon = createIcon('InfoIcon', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>
));
export const InfoCircleIcon = InfoIcon;

export const AlertTriangleIcon = createIcon('AlertTriangleIcon', () => (
  <>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </>
));

export const LightbulbIcon = createIcon('LightbulbIcon', () => (
  <>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
  </>
));

export const AwardIcon = createIcon('AwardIcon', () => (
  <>
    <circle cx="12" cy="8" r="6" />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </>
));

/* ─── LOCATION & MAPS ──────────────────────────────────────────────────────── */

export const PinIcon = createIcon('PinIcon', () => (
  <>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </>
));
export const MapPinIcon = PinIcon;

export const MapIcon = createIcon('MapIcon', () => (
  <>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </>
));

export const CompassIcon = createIcon('CompassIcon', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </>
));

export const NavigationIcon = createIcon('NavigationIcon', () => (
  <polygon points="3 11 22 2 13 21 11 13 3 11" />
));

/* ─── HOSPITALITY, BOOKING & USER ─────────────────────────────────────────── */

export const BedIcon = createIcon('BedIcon', () => (
  <>
    <path d="M2 4v16" />
    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
    <path d="M2 17h20" />
    <circle cx="7" cy="11" r="2" />
  </>
));

export const BuildingIcon = createIcon('BuildingIcon', () => (
  <>
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="18" />
    <line x1="15" y1="22" x2="15" y2="18" />
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="8" y1="6" x2="10" y2="6" />
    <line x1="14" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="10" y2="14" />
    <line x1="14" y1="14" x2="16" y2="14" />
  </>
));
export const HotelIcon = BuildingIcon;

export const CalendarIcon = createIcon('CalendarIcon', () => (
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </>
));

export const CalendarCheckIcon = createIcon('CalendarCheckIcon', () => (
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="9 16 11 18 15 14" />
  </>
));

export const UserIcon = createIcon('UserIcon', () => (
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
));

export const UsersIcon = createIcon('UsersIcon', () => (
  <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
));

/**
 * Clean Heart icon for favorites/wishlist
 * Supports `filled={true}` or explicit `fill` & `color`
 */
export const HeartIcon = ({ filled = false, color, fill, strokeWidth = 2, ...props }) => {
  const strokeColor = color || (filled ? '#ef4444' : 'currentColor');
  const fillColor = fill || (filled ? '#ef4444' : 'none');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || props.width || 20}
      height={props.size || props.height || 20}
      viewBox="0 0 24 24"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`avora-icon ${props.className || ''}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...props.style }}
      aria-hidden="true"
      {...props}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
};
HeartIcon.displayName = 'HeartIcon';

/**
 * Clean Star icon for ratings & star quality
 * Supports `filled={true}` (defaults to #f59e0b) or outline
 */
export const StarIcon = ({ filled = true, color, fill, strokeWidth = 2, ...props }) => {
  const strokeColor = color || (filled ? '#f59e0b' : 'currentColor');
  const fillColor = fill || (filled ? '#f59e0b' : 'none');
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || props.width || 18}
      height={props.size || props.height || 18}
      viewBox="0 0 24 24"
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`avora-icon ${props.className || ''}`.trim()}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...props.style }}
      aria-hidden="true"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
};
StarIcon.displayName = 'StarIcon';

export const ShieldCheckIcon = createIcon('ShieldCheckIcon', () => (
  <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </>
));

export const HeadsetIcon = createIcon('HeadsetIcon', () => (
  <>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </>
));

export const PiggyBankIcon = createIcon('PiggyBankIcon', () => (
  <>
    <path d="M19 5c-1.5 0-2.8 1.2-3 2.7-.8-.4-1.9-.7-3-.7-4.4 0-8 3.6-8 8v1h14c1.1 0 2-.9 2-2V9c0-2.2-1.8-4-4-4z" />
    <path d="M16 11h.01" />
    <path d="M7 16v3" />
    <path d="M15 16v3" />
    <path d="M2 9v1a2 2 0 0 0 2 2h1" />
  </>
));

export const CreditCardIcon = createIcon('CreditCardIcon', () => (
  <>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </>
));

export const TagIcon = createIcon('TagIcon', () => (
  <>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </>
));

export const DollarSignIcon = createIcon('DollarSignIcon', () => (
  <>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>
));

/* ─── HOTEL AMENITIES & FEATURES ───────────────────────────────────────────── */

export const WifiIcon = createIcon('WifiIcon', () => (
  <>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth={3} />
  </>
));

export const PoolIcon = createIcon('PoolIcon', () => (
  <>
    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
  </>
));

export const CoffeeIcon = createIcon('CoffeeIcon', () => (
  <>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </>
));

export const SpaIcon = createIcon('SpaIcon', () => (
  <>
    <path d="M12 2C6.5 7 4 11 4 14.5a8 8 0 0 0 16 0C20 11 17.5 7 12 2z" />
    <path d="M12 22a8.5 8.5 0 0 1-6-2.5" />
    <path d="M12 12c0 3-1.5 5-3.5 6.5" />
    <path d="M12 12c0 3 1.5 5 3.5 6.5" />
  </>
));

export const DumbbellIcon = createIcon('DumbbellIcon', () => (
  <>
    <path d="M6.5 6.5L17.5 17.5" />
    <path d="M4 10l2-2 2 2-2 2-2-2z" />
    <path d="M16 22l2-2 2 2-2 2-2-2z" />
    <path d="M2 8l4-4" />
    <path d="M18 24l4-4" />
    <path d="M14 4l6 6" />
    <path d="M4 14l6 6" />
  </>
));

export const WineIcon = createIcon('WineIcon', () => (
  <>
    <path d="M8 22h8" />
    <path d="M12 11v11" />
    <path d="m19 3-7 8-7-8h14z" />
  </>
));

/**
 * Authentic Airport Shuttle Van / Bus (clean transportation vehicle, NOT credit card)
 */
export const BusIcon = createIcon('BusIcon', () => (
  <>
    <rect x="3" y="3" width="18" height="15" rx="3" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="7" cy="15" r="1.5" />
    <circle cx="17" cy="15" r="1.5" />
    <line x1="6" y1="18" x2="6" y2="21" />
    <line x1="18" y1="18" x2="18" y2="21" />
  </>
));

export const BeachIcon = createIcon('BeachIcon', () => (
  <>
    <path d="M12 2v20" />
    <path d="M17.5 6.5C16 4 13.5 2 12 2s-4 2-5.5 4.5c-1.5 2.5-1.5 5.5-1.5 5.5h14s0-3-1.5-5.5z" />
    <path d="m9 12 3 9" />
  </>
));

export const CameraIcon = createIcon('CameraIcon', () => (
  <>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </>
));

export const FlameIcon = createIcon('FlameIcon', () => (
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
));

export const CartIcon = createIcon('CartIcon', () => (
  <>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </>
));

export const GridIcon = createIcon('GridIcon', () => (
  <>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </>
));
export const LayoutGridIcon = GridIcon;

export const PlusIcon = createIcon('PlusIcon', () => (
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>
));

export const TrashIcon = createIcon('TrashIcon', () => (
  <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </>
));
export const DeleteIcon = TrashIcon;

export const EditIcon = createIcon('EditIcon', () => (
  <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>
));
export const PencilIcon = EditIcon;

export const EyeIcon = createIcon('EyeIcon', () => (
  <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>
));

export const RefreshCwIcon = createIcon('RefreshCwIcon', () => (
  <>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </>
));
export const RefreshIcon = RefreshCwIcon;

export const DownloadIcon = createIcon('DownloadIcon', () => (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>
));

export const UploadIcon = createIcon('UploadIcon', () => (
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>
));

export const FilterIcon = createIcon('FilterIcon', () => (
  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
));

export const DoorClosedIcon = createIcon('DoorClosedIcon', () => (
  <>
    <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
    <path d="M2 20h20" />
    <circle cx="14" cy="12" r="1" />
  </>
));

export const BanIcon = createIcon('BanIcon', () => (
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </>
));

export const ActivityIcon = createIcon('ActivityIcon', () => (
  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
));
export const PulseIcon = ActivityIcon;

export const ListIcon = createIcon('ListIcon', () => (
  <>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </>
));

export const FileTextIcon = createIcon('FileTextIcon', () => (
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </>
));

export const SpinnerIcon = ({ size = 16, className = '', color = 'currentColor', ...props }) => (
  <svg
    className={`avora-btn-spinner ${className}`.trim()}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
  </svg>
);

export const LoaderIcon = createIcon('LoaderIcon', () => (
  <>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </>
));

export const CheckCircleIcon = createIcon('CheckCircleIcon', () => (
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>
));

export const PercentIcon = createIcon('PercentIcon', () => (
  <>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </>
));

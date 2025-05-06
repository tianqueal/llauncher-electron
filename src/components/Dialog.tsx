import { XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx'; // Import clsx

// Define the possible variants
type DialogVariant = 'info' | 'warning' | 'error' | 'success';

// Define the component props
interface DialogProps {
  title: string;
  description: string;
  onClose: () => void;
  variant?: DialogVariant; // Add variant prop
  className?: string; // Allow passing custom classes
  // onConfirm?: () => void // Keep for future use if needed
}

export default function Dialog({
  title,
  description,
  onClose,
  variant = 'info', // Default variant is 'info'
  className,
}: DialogProps) {
  // Base styles for the dialog container
  const baseStyles = 'w-full max-w-xs rounded-xl border p-4 text-sm'; // Adjusted padding and size

  // Variant-specific styles (dark mode focused)
  const variantStyles = {
    info: 'dark:bg-slate-800 dark:border-slate-700 dark:text-white',
    warning:
      'dark:bg-yellow-900/70 dark:border-yellow-700/50 dark:text-yellow-100',
    error: 'dark:bg-red-900/70 dark:border-red-700/50 dark:text-red-100',
    success:
      'dark:bg-green-900/70 dark:border-green-700/50 dark:text-green-100',
  };

  // Variant-specific styles for the title
  const titleStyles = {
    info: 'dark:text-white', // Default title color
    warning: 'dark:text-yellow-100 font-semibold',
    error: 'dark:text-red-100 font-semibold',
    success: 'dark:text-green-100 font-semibold',
  };

  // Variant-specific styles for the description text
  const descriptionStyles = {
    info: 'dark:text-white/70', // Default description color
    warning: 'dark:text-yellow-100/80',
    error: 'dark:text-red-100/80',
    success: 'dark:text-green-100/80',
  };

  // Variant-specific styles for the close button icon
  const closeIconStyles = {
    info: 'dark:text-white/50 dark:hover:text-white',
    warning: 'dark:text-yellow-100/50 dark:hover:text-yellow-100',
    error: 'dark:text-red-100/50 dark:hover:text-red-100',
    success: 'dark:text-green-100/50 dark:hover:text-green-100',
  };

  return (
    <div
      className={clsx(
        baseStyles,
        variantStyles[variant], // Apply variant background/border/base text
        className, // Apply custom classes passed via props
      )}
      role="alertdialog" // Improve accessibility role
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className={clsx(
          'absolute top-2 right-2 cursor-pointer rounded p-1 transition-colors',
          'focus:ring-2 focus:ring-white/50 focus:outline-none focus:ring-inset', // Basic focus style
          closeIconStyles[variant], // Apply variant-specific icon color
        )}
        aria-label="Close" // Accessibility label
      >
        <XMarkIcon className="size-4" />
      </button>

      {/* Title */}
      <div
        id="dialog-title" // Accessibility link
        className={clsx('text-base font-medium', titleStyles[variant])} // Apply variant title color
      >
        {title}
      </div>

      {/* Description */}
      <div
        id="dialog-description" // Accessibility link
        className={clsx('mt-1 leading-relaxed', descriptionStyles[variant])} // Apply variant description color
      >
        {description}
      </div>

      {/* Optional: Placeholder for action buttons */}
      {/* <div className="mt-4 flex justify-end gap-2">
        <FormButton variant="secondary" onClick={onClose}>Cancel</FormButton>
        <FormButton variant="primary" onClick={onConfirm}>Confirm</FormButton>
      </div> */}
    </div>
  );
}

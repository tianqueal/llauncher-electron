import { Button } from '@headlessui/react';
import clsx from 'clsx';
import { FormButtonProps } from '../../types/FormButtonProps';

export default function FormButton({
  variant = 'primary',
  isLoading = false,
  isSuccess = false,
  disabled = false,
  children,
  className,
  ...props // Pass rest of the props like type, onClick
}: FormButtonProps) {
  const baseStyles =
    'rounded-lg py-2 px-4 text-sm font-semibold shadow-sm transition-all duration-200 ease-in-out focus-visible:outline focus-visible:outline-offset-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';

  const variantStyles = {
    primary: clsx(
      // Base primary (not loading, not success)
      !isLoading &&
        !isSuccess &&
        'dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus-visible:outline-indigo-600',
      // Loading state
      isLoading && 'dark:bg-indigo-400 cursor-wait',
      // Success state
      isSuccess && 'dark:bg-green-600 cursor-default',
    ),
    secondary: clsx(
      // Base secondary (not loading, not success - assuming no loading/success states needed for secondary)
      'dark:bg-gray-600 dark:hover:bg-gray-500 dark:focus-visible:outline-gray-700 ',
      'dark:disabled:bg-gray-500 dark:disabled:hover:bg-gray-500',
      // Add loading/success styles for secondary if needed later
    ),
  };

  return (
    <Button
      disabled={disabled || isLoading} // Disable if explicitly disabled or loading
      className={clsx(
        baseStyles,
        variantStyles[variant],
        className, // Allow overriding styles
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

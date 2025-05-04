import clsx from 'clsx'
import Spinner from './Spinner'

interface LoadingOverlayProps {
  isLoading: boolean
  className?: string
  spinnerClassName?: string
}

/**
 * Displays a semi-transparent overlay with a spinner when isLoading is true.
 * Covers its parent container.
 */
export default function LoadingOverlay({
  isLoading,
  className,
  spinnerClassName,
}: LoadingOverlayProps) {
  if (!isLoading) {
    return null
  }

  return (
    <div
      className={clsx(
        'absolute inset-0 flex items-center justify-center z-20 dark:bg-black/30 backdrop-blur-sm rounded-xl',
        className
      )}
      aria-busy="true"
      aria-live="polite" // Indicate loading state changes
    >
      <Spinner className={spinnerClassName} />
    </div>
  )
}

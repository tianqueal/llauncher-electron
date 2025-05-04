import { Button, ButtonProps } from '@headlessui/react'
import clsx from 'clsx'
import { LaunchStatus } from '../types/LaunchStatus'

interface PlayButtonProps extends ButtonProps {
  isLoading?: boolean
  className?: string
  launchStatus: LaunchStatus
  onClickPlay?: () => void
  onClickStop?: () => void
}

export default function PlayButton({
  isLoading = false,
  disabled = false,
  className,
  launchStatus,
  onClickPlay,
  onClickStop,
  ...props
}: PlayButtonProps) {
  const variantStyles = {
    play: clsx(
      'dark:focus:ring-offset-gray-800 dark:focus:ring-green-500',
      'dark:bg-green-900',
      'dark:hover:bg-green-800',
      'hover:scale-105 disabled:hover:scale-100',
    ),
    stop: clsx(
      'dark:focus:ring-offset-gray-800 dark:focus:ring-red-500',
      'dark:bg-red-900',
      'dark:hover:bg-red-800',
      'hover:scale-105 disabled:hover:scale-100',
    ),
    downloading: clsx(
      'dark:focus:ring-offset-gray-800 dark:focus:ring-blue-500',
      'dark:bg-blue-900'
    ),
  }

  const isPlayButton =
    launchStatus !== LaunchStatus.RUNNING &&
    launchStatus !== LaunchStatus.LAUNCHING

  return (
    <Button
      disabled={disabled || isLoading}
      className={clsx(
        'w-full',
        'cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center rounded-lg px-2 py-1 text-lg font-bold shadow-lg disabled:bg-gray-900/50 disabled:hover:bg-gray-900/50',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'transition-all duration-300 ease-in-out',
        isPlayButton ? variantStyles.play : variantStyles.stop,
        className
      )}
      onClick={isPlayButton ? onClickPlay : onClickStop}
      {...props}
    >
      {isPlayButton ? 'Play!' : 'Stop!'}
    </Button>
  )
  // const bgUrl =
  //   'https://upload.wikimedia.org/wikipedia/commons/1/10/Userbox_creeper.svg'

  // return (
  //   <Button
  //     disabled={disabled || isLoading}
  //     style={
  //       {
  //         '--bg-image-url': `url('${bgUrl}')`,
  //       } as React.CSSProperties
  //     }
  //     className={clsx(
  //       'relative',
  //       'overflow-hidden',
  //       'z-0',
  //       'w-max',
  //       'cursor-pointer inline-flex items-center justify-center rounded-md px-5 py-3 text-lg font-bold shadow-lg',
  //       'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500',
  //       'dark:bg-green-900',
  //       'transition-transform duration-300 ease-in-out',
  //       'hover:scale-105',
  //       "before:content-['']",
  //       'before:absolute before:inset-0',
  //       'before:bg-[image:var(--bg-image-url)] before:bg-cover before:bg-center before:bg-no-repeat',
  //       'before:opacity-0',
  //       'before:transition-opacity before:duration-300 before:ease-in-out',
  //       'hover:before:opacity-100',
  //       'before:-z-10',
  //       className
  //     )}
  //     {...props}
  //   >
  //     {/* Span to ensure text is above the pseudo-element */}
  //     <span className="relative z-10">Play!</span>
  //   </Button>
  // )
}

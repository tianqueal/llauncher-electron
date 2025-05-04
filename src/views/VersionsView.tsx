import Card from '../components/Card'
import { FolderOpenIcon, TrashIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import { useLocalVersions } from '../hooks/useLocalVersions'
import FormButton from '../components/FormButton'
import Spinner from '../components/Spinner'
import Dialog from '../components/Dialog'
import { formatBytes } from '../utils/formatUtils'
import { getErrorMessage } from '../utils/errorUtils'
import LoadingOverlay from '../components/LoadingOverlay'
import { motion, AnimatePresence } from 'motion/react'

export default function VersionsView() {
  const {
    localVersions,
    isLoading,
    isDeleting,
    error,
    handleDelete,
    // handleReinstall,
    clearError,
  } = useLocalVersions()

  // const { getFilteredVersionOptions } = useVersionManifest()

  // --- Version Options ---
  // Get the filtered options when needed
  // const versionOptions = useMemo(() => {
  //   return getFilteredVersionOptions([VersionType.Release]).slice(0, 10)
  // }, [getFilteredVersionOptions]) // Recalculate if the function instance changes (it shouldn't often due to useCallback)

  // --- Install New Version ---
  // const handleInstallNew = (versionOption: VersionOption) => {
  //   // Call the function to install the new version
  //   // window.electron.installVersion(versionOption)
  //   console.log('Installing new version:', versionOption)
  // }

  // Handler for opening directory
  const handleOpenDirectory = async (path: string) => {
    console.log(`VersionsView: Requesting to open directory ${path}`)
    try {
      const result = await window.electron.openDirectory(path)
      if (!result.success) {
        // Optionally show an error to the user if opening fails
        console.error('Failed to open directory:', result.error)
        // You could use the Dialog component here if desired
        alert(`Error opening directory: ${result.error}`)
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'IPC Error opening directory')
      console.error(`VersionsView: ${errorMessage}`, err)
      alert(`Error: ${errorMessage}`)
    }
  }

  return (
    <div className="w-full flex justify-center relative max-w-4xl transition-[width] duration-300 ease-in-out">
      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />

      {/* Error Display */}
      {error && (
        <Dialog
          variant="error"
          title="Error"
          description={error}
          onClose={clearError}
          className="fixed bottom-5 right-5 z-30"
        />
      )}
      <Card
        className={clsx(
          'transition-opacity duration-300',
          isLoading && 'opacity-50 pointer-events-none'
        )}
      >
        {' '}
        {/* Dim card while loading */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-6">
          {' '}
          {/* Increased margin */}
          <p className="text-xl font-semibold self-start">
            Downloaded Versions
          </p>
          {/* Install New Version Button */}
          {/* <FormButton
            variant="primary" // Use primary style
            onClick={handleInstallNew}
            disabled={isLoading} // Disable while loading initial list
            className="inline-flex items-center gap-2" // Ensure icon and text align
          >
            <ArrowDownTrayIcon className="size-4" />
            Install New Version
          </FormButton> */}
          {/* <SelectVersion
            versionOptions={versionOptions}
            handleInstall={handleInstallNew}
          /> */}
        </div>
        {/* List of Versions */}
        <div className="space-y-3">
          {!isLoading && localVersions.length === 0 && !error && (
            <p className="text-center text-white/60 py-4">
              No versions downloaded yet.
            </p>
          )}

          {/* Only map versions if not loading and no error occurred */}
          <AnimatePresence initial={false}>
            {!isLoading &&
              !error &&
              localVersions.map((version) => {
                const isCurrentlyDeleting = isDeleting === version.id

                return (
                  <motion.div
                    key={version.id}
                    layout
                    initial={{ opacity: 1, scale: 1 }} // Start fully visible and scaled
                    animate={{
                      opacity: isCurrentlyDeleting ? 0.5 : 1,
                      scale: 1, // Maintain scale while present or dimming
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.8, // Shrink slightly
                      transition: { duration: 0.25, ease: 'easeIn' }, // Faster, easeIn looks good for shrinking
                    }}
                    // Apply base classes
                    className={clsx(
                      'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg dark:bg-white/5 p-3 origin-center' // Added origin-center for scale
                    )}
                  >
                    {/* ... Version Info ... */}
                    <div className="flex-grow">
                      <p className="font-medium">{version.name}</p>
                      <p className="text-sm dark:text-white/50">
                        Status:{' '}
                        {isCurrentlyDeleting ? 'Deleting...' : version.status}
                        {version.sizeBytes !== undefined && (
                          <span className="ml-2 text-white/40">
                            ({formatBytes(version.sizeBytes)})
                          </span>
                        )}
                      </p>
                    </div>
                    {/* ... Action Buttons ... */}
                    <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                      <FormButton
                        variant="secondary"
                        onClick={() => handleOpenDirectory(version.path)}
                        title="Open Version Directory"
                        disabled={isLoading || !!isDeleting}
                        className="px-2 py-1"
                      >
                        <FolderOpenIcon className="size-4" />
                      </FormButton>
                      <FormButton
                        className="dark:bg-red-700 dark:hover:bg-red-600 dark:focus-visible:outline-red-500 px-2 py-1"
                        onClick={() => handleDelete(version.id)}
                        title="Delete Version"
                        disabled={isLoading || !!isDeleting}
                      >
                        {isCurrentlyDeleting ? (
                          <Spinner className="size-4" />
                        ) : (
                          <TrashIcon className="size-4" />
                        )}
                      </FormButton>
                    </div>
                  </motion.div>
                )
              })}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  )
}

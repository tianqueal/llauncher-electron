import Container from '../components/Container';
import { FolderOpenIcon, TrashIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { useLocalVersions } from '../hooks/useLocalVersions';
import FormButton from '../components/forms/FormButton';
import Spinner from '../components/Spinner';
import { formatBytes } from '../utils/formatUtils';
import { getErrorMessage } from '../utils/errorUtils';
import LoadingOverlay from '../components/LoadingOverlay';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';

export default function VersionsView() {
  const { localVersions, isLoading, isDeleting, error, handleDelete } =
    useLocalVersions();

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
    console.log(`VersionsView: Requesting to open directory ${path}`);
    try {
      const result = await window.electron.openDirectory(path);
      if (!result.success) {
        // Optionally show an error to the user if opening fails
        console.error('Failed to open directory:', result.error);
        toast(`Error opening directory: ${result.error}`, {
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'IPC Error opening directory');
      console.error(`VersionsView: ${errorMessage}`, err);
      toast(`Error opening directory: ${errorMessage}`, {
        type: 'error',
      });
    }
  };

  return (
    <div className="relative flex w-full max-w-4xl justify-center transition-[width] duration-300 ease-in-out">
      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} />

      <Container
        className={clsx(
          'transition-opacity duration-300',
          isLoading && 'pointer-events-none opacity-50',
        )}
      >
        {' '}
        {/* Dim card while loading */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          {' '}
          {/* Increased margin */}
          <p className="self-start text-xl font-semibold">
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
            <p className="py-4 text-center text-white/60">
              No versions downloaded yet.
            </p>
          )}

          {/* Only map versions if not loading and no error occurred */}
          <AnimatePresence initial={false}>
            {!isLoading &&
              !error &&
              localVersions.map((version) => {
                const isCurrentlyDeleting = isDeleting === version.id;

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
                      'flex origin-center flex-col items-start justify-between gap-3 rounded-lg p-3 sm:flex-row sm:items-center dark:bg-white/5', // Added origin-center for scale
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
                    <div className="flex flex-shrink-0 gap-2 self-end sm:self-center">
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
                        className="px-2 py-1 dark:bg-red-700 dark:hover:bg-red-600 dark:focus-visible:outline-red-500"
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
                );
              })}
          </AnimatePresence>
        </div>
      </Container>
    </div>
  );
}

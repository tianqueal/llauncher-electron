import { useState, useEffect, useCallback } from 'react';
import { LocalVersion } from '../types/LocalVersion';
import { compareVersions } from '../utils/versionUtils';
import { getErrorMessage } from '../utils/errorUtils';
import { toast } from 'react-toastify';

/**
 * Custom hook to manage the list of installed versions and related actions.
 */
export function useLocalVersions() {
  const [localVersions, setLocalVersions] = useState<Array<LocalVersion>>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Add state for potential errors during loading or actions
  const [error, setError] = useState<string | null>(null);
  // Add state for actions like deleting/installing if needed
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Effect to load versions on initial mount
  useEffect(() => {
    console.log('useVersions: useEffect running, requesting version list.');
    setIsLoading(true);
    setError(null); // Reset error on new load attempt

    const fetchVersions = async () => {
      try {
        const loadedVersions = await window.electron.listVersions();
        console.log('useVersions: Received versions', loadedVersions);
        const sortedVersions = loadedVersions.sort((a, b) =>
          compareVersions(b.id, a.id),
        );
        setLocalVersions(sortedVersions);
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error loading versions');
        console.error(`useVersions: ${errorMessage}`, err);
        setError(errorMessage);
        toast(`Error loading versions: ${errorMessage}`, {
          type: 'error',
        });
        setLocalVersions([]); // Clear versions on error
      } finally {
        setIsLoading(false);
        console.log('useVersions: isLoading set to false.');
      }
    };

    fetchVersions();
  }, []); // Empty dependency array ensures this runs only once

  // Delete action
  const handleDelete = useCallback(
    async (id: string) => {
      // Prevent deleting if already deleting or loading initial list
      if (isDeleting || isLoading) return;

      console.log(`useVersions: Requesting delete for version ${id}`);
      setIsDeleting(id); // Set deleting state for this ID
      setError(null); // Clear previous errors

      // Store the version being deleted in case we need to revert
      const versionToDelete = localVersions.find((v) => v.id === id);

      // Optimistic update: remove immediately from UI
      setLocalVersions((prev) => prev.filter((v) => v.id !== id));

      try {
        const result = await window.electron.deleteVersion(id);
        if (!result.success) {
          // Deletion failed in main process, revert UI and show error
          const errorMessage = getErrorMessage(
            result.error,
            `Failed to delete version ${id}`,
          );
          console.error(`useVersions: ${errorMessage}:`, result.error);
          setError(errorMessage);
          toast(errorMessage, {
            type: 'error',
          });
          // Add the version back if it was found
          if (versionToDelete) {
            setLocalVersions((prev) =>
              [...prev, versionToDelete].sort(/* Add sorting if needed */),
            );
          }
        } else {
          // Deletion successful in main process, UI already updated
          console.log(`useVersions: Successfully deleted version ${id}`);
          toast(`Version ${id} deleted successfully.`, {
            type: 'success',
          });
        }
      } catch (err: unknown) {
        // IPC error, revert UI and show error
        const errorMessage = getErrorMessage(
          err,
          `IPC Error deleting version ${id}`,
        );
        console.error(`useVersions: ${errorMessage}:`, err);
        setError(errorMessage);
        toast(errorMessage, {
          type: 'error',
        });
        // Add the version back if it was found
        if (versionToDelete) {
          setLocalVersions((prev) =>
            [...prev, versionToDelete].sort(/* Add sorting if needed */),
          );
        }
      } finally {
        setIsDeleting(null); // Clear deleting state regardless of outcome
      }
    },
    [localVersions, isLoading, isDeleting],
  );

  // Placeholder for reinstall/install action
  const handleReinstall = useCallback(async (id: string) => {
    // TODO: Implement IPC call to main process for reinstallation
    console.log(`useVersions: Requesting reinstall for version ${id}`);
    toast(
      `Mock reinstall for version ${id}. Implement actual reinstall via IPC.`,
      {
        type: 'info',
      },
    );
    // try {
    //   setIsLoading(true); // Or a specific installing state
    //   await window.electron.reinstallVersion(id);
    //   // TODO: Potentially update version status after reinstall
    // } catch (err) {
    //    console.error(`useVersions: Error reinstalling version ${id}:`, err);
    //    setError(`Failed to reinstall version ${id}`);
    // } finally {
    //    setIsLoading(false);
    // }
  }, []);

  // Placeholder for installing a new version
  const handleInstallNew = useCallback(async () => {
    // TODO: Implement logic to show install options / trigger install process via IPC
    console.log('useVersions: Requesting install new version');
    toast('Mock install new version. Implement actual install process.', {
      type: 'info',
    });
  }, []);

  // Function to clear the error state if needed externally
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    localVersions,
    isLoading,
    isDeleting,
    error,
    clearError,
    handleDelete,
    handleReinstall,
    handleInstallNew,
  };
}

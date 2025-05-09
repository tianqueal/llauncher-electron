import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  VersionInfo,
  VersionManifest,
  VersionType,
} from '../types/VersionManifest';
import { VersionOption } from '../types/VersionOption';
import { getErrorMessage } from '../utils/errorUtils';
import { toast } from 'react-toastify';

export function useVersionManifest() {
  const [manifest, setManifest] = useState<VersionManifest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... useEffect to fetch manifest ...
  useEffect(() => {
    console.log('useVersionManifest: Fetching manifest data...');
    setIsLoading(true);
    setError(null);

    const fetchManifest = async () => {
      try {
        const data = await window.electron.getVersionManifest();
        if (data) {
          console.log('useVersionManifest: Manifest data received.');
          setManifest(data);
        } else {
          const errorMessage = 'Received null manifest data from main process.';
          console.error(`useVersionManifest: ${errorMessage}`);
          setError(errorMessage);
          toast(errorMessage, {
            type: 'error',
          });
          setManifest(null);
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error fetching manifest');
        console.error(`useVersionManifest: ${errorMessage}:`, err);
        setError(errorMessage);
        toast(errorMessage, {
          type: 'error',
        });
        setManifest(null);
      } finally {
        setIsLoading(false);
        console.log('useVersionManifest: Loading finished.');
      }
    };

    fetchManifest();
  }, []);

  // Function to clear the error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoize the base list of all relevant version options
  const baseVersionOptions = useMemo<Array<VersionOption>>(() => {
    if (!manifest) return [];
    console.log('useVersionManifest: Recalculating baseVersionOptions');
    // Filter for relevant types first, then map
    return manifest.versions.map((v: VersionInfo) => ({
      value: v.id,
      label: `${v.type === VersionType.Snapshot ? 'Snapshot ' : ''}${v.id}`, // Add prefix for snapshots
      type: v.type,
    }));
    // Consider adding sorting here if needed (e.g., by release time descending)
    // .sort((a, b) => new Date(b.releaseTime).getTime() - new Date(a.releaseTime).getTime()); // Requires releaseTime in VersionInfo
  }, [manifest]); // Only depends on the manifest itself

  // Memoized function to filter the base options by type
  const getFilteredVersionOptions = useCallback(
    (typesToInclude: Array<VersionType>): Array<VersionOption> => {
      if (!typesToInclude || typesToInclude.length === 0) {
        return baseVersionOptions; // Return all if no filter specified
      }
      console.log(
        `useVersionManifest: Filtering options for types: ${typesToInclude.join(
          ', ',
        )}`,
      );
      return baseVersionOptions.filter((option) =>
        typesToInclude.includes(option.type),
      );
    },
    [baseVersionOptions], // Depends on the calculated base options
  );

  const latestReleaseId = useMemo(
    () => manifest?.latest?.release ?? null,
    [manifest],
  );

  const latestRelease = useMemo(() => {
    if (!manifest) return null;
    return manifest.versions.find((v) => v.id === latestReleaseId);
  }, [manifest, latestReleaseId]);

  return {
    manifest,
    baseVersionOptions,
    getFilteredVersionOptions,
    latestReleaseId,
    latestRelease,
    isLoading,
    error,
    clearError, // Return the clearError function
  };
}

import { useState, useEffect } from 'react';
import { PatchNotes } from '../types/PatchNotes';
import { getErrorMessage } from '../utils/errorUtils';

/**
 * Hook to fetch and manage the Game patch notes data.
 */
export function usePatchNotes() {
  const [patchNotes, setPatchNotes] = useState<PatchNotes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('usePatchNotes: Fetching patch notes data...');
    setIsLoading(true);
    setError(null);

    const fetchPatchNotes = async () => {
      try {
        const data = await window.electron.getPatchNotes();
        if (data) {
          console.log('usePatchNotes: Patch notes data received.');
          setPatchNotes(data);
        } else {
          console.error(
            'usePatchNotes: Received null patch notes data from main process.',
          );
          // Don't necessarily set an error here, maybe patch notes are just unavailable
          setPatchNotes(null);
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error fetching patch notes');
        console.error(`usePatchNotes: ${errorMessage}:`, err);
        setError(errorMessage);
        setPatchNotes(null);
      } finally {
        setIsLoading(false);
        console.log('usePatchNotes: Loading finished.');
      }
    };

    fetchPatchNotes();
  }, []); // Fetch only once on mount

  return {
    patchNotes,
    isLoading,
    error,
  };
}

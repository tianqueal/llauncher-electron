import { useState, useEffect, useCallback, useRef } from 'react';
import { IpcRendererEvent } from 'electron';
import { DebouncedFunc, throttle } from 'lodash';
import { LaunchStatus } from '../types/LaunchStatus';
import {
  DownloadProgressArgs,
  LaunchOutputArgs,
  LaunchStatusArgs,
} from '../types/IpcEvents';
import { DownloadStatus } from '../types/DownloadStatus';
import { getErrorMessage } from '../utils/errorUtils';

interface FileProgress {
  progress: number; // -1 if total size unknown, 0-100 otherwise
  status: DownloadStatus;
  downloadedBytes?: number;
  totalBytes?: number;
  file: string; // Added file name for potential use
}

export function useLaunchManager() {
  const [launchStatus, setLaunchStatus] = useState<LaunchStatus>(
    LaunchStatus.IDLE,
  );
  const [launchMessage, setLaunchMessage] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, FileProgress>
  >({});
  const [currentTaskLabel, setCurrentTaskLabel] = useState<string>('');
  const [totalFilesToDownload, setTotalFilesToDownload] = useState<number>(0);
  const [processedFilesCount, setProcessedFilesCount] = useState<number>(0);

  // --- Throttled State Update Logic ---
  const progressDataRef = useRef<Record<string, FileProgress>>({});
  const throttledSetProgressRef =
    useRef<
      DebouncedFunc<((data: Record<string, FileProgress>) => void) | null>
    >(null);

  // Effect for IPC Listeners
  useEffect(() => {
    // Define the actual state update logic
    const updateProgressState = (data: Record<string, FileProgress>) => {
      setDownloadProgress(data);
      // Update related states based on the latest batch of progress
      const files = Object.values(data);
      const completedCount = files.filter(
        (f) =>
          f.status === DownloadStatus.VALIDATED ||
          f.status === DownloadStatus.DOWNLOADED_NO_CHECKSUM ||
          f.status === DownloadStatus.VALIDATION_FAILED ||
          f.status === DownloadStatus.ERROR,
      ).length;
      setProcessedFilesCount(completedCount);

      // Find the last "active" file for the label
      const activeFile = files
        .reverse()
        .find(
          (f) =>
            f.status === DownloadStatus.DOWNLOADING ||
            f.status === DownloadStatus.VALIDATING,
        );
      setCurrentTaskLabel(activeFile ? activeFile.file : '');
    };

    // Create the throttled function instance only once
    if (!throttledSetProgressRef.current) {
      throttledSetProgressRef.current = throttle(updateProgressState, 300, {
        leading: true,
        trailing: true,
      });
    }

    const handleStatus = (_event: IpcRendererEvent, args: LaunchStatusArgs) => {
      console.log('Launch Status Update:', args);
      setLaunchStatus(args.status);
      setLaunchMessage(
        args.message ||
          (args.status === LaunchStatus.CLOSED
            ? `Exited with code ${args.code}`
            : ''),
      );
      setTotalFilesToDownload(args.totalFiles || 0);
      setProcessedFilesCount(0); // Reset processed count on new stage
      setCurrentTaskLabel(''); // Reset current task label

      // Reset progress ref when download starts/ends/errors
      if (
        args.status === LaunchStatus.DOWNLOADING ||
        args.status === LaunchStatus.CLOSED ||
        args.status === LaunchStatus.ERROR
      ) {
        progressDataRef.current = {};
        // Also reset the visual state immediately if needed
        setDownloadProgress({});
      }
    };

    const handleProgress = (
      _event: IpcRendererEvent,
      args: DownloadProgressArgs,
    ) => {
      // 1. Update the ref immediately
      progressDataRef.current = {
        ...progressDataRef.current,
        [args.file]: {
          progress: args.progress,
          status: args.status,
          downloadedBytes: args.downloadedBytes,
          totalBytes: args.totalBytes,
          file: args.file, // Store filename in ref data
        },
      };
      // 2. Call the throttled function to update React state
      throttledSetProgressRef.current?.(progressDataRef.current);
    };

    const handleOutput = (_event: IpcRendererEvent, args: LaunchOutputArgs) => {
      console.log(`[Game ${args.type.toUpperCase()}]:`, args.message.trim());
    };

    window.electron.onLaunchStatus(handleStatus);
    window.electron.onDownloadProgress(handleProgress);
    window.electron.onLaunchOutput(handleOutput);

    // Cleanup listeners and cancel throttled calls
    return () => {
      window.electron.removeAllListeners('launch-status');
      window.electron.removeAllListeners('download-progress');
      window.electron.removeAllListeners('launch-output');
      throttledSetProgressRef.current?.cancel();
    };
  }, []); // Empty dependency array is correct here

  // --- Action Handlers ---
  const handlePlay = useCallback(
    async (selectedVersion: string) => {
      if (
        !selectedVersion ||
        launchStatus === LaunchStatus.RUNNING ||
        launchStatus === LaunchStatus.LAUNCHING
      )
        return;

      setLaunchStatus(LaunchStatus.PREPARING);
      setLaunchMessage('Initiating launch...');
      setDownloadProgress({}); // Clear old visual progress

      try {
        const result = await window.electron.launchVersion(selectedVersion);
        if (!result.success) {
          setLaunchStatus(LaunchStatus.ERROR);
          setLaunchMessage(result.error || 'Failed to initiate launch.');
        }
        // Status updates will now come via IPC listeners
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(
          err,
          'Error calling launch method',
        ); // Pass error object
        console.error(`useLaunchManager: ${errorMessage}:`, err);
        setLaunchStatus(LaunchStatus.ERROR);
        setLaunchMessage(errorMessage);
      }
    },
    [launchStatus],
  ); // Dependency on launchStatus to prevent multiple clicks

  const handleKill = useCallback(async () => {
    console.log('Requesting game kill...');
    console.log('Current launch status:', launchStatus);
    if (
      launchStatus !== LaunchStatus.RUNNING &&
      launchStatus !== LaunchStatus.LAUNCHING
    )
      return;
    console.log('Requesting game kill...');
    try {
      await window.electron.killGame();
      // Status update should come via IPC when process actually closes
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error calling kill method'); // Pass error object
      console.error(`useLaunchManager: ${errorMessage}`, err);
      setLaunchStatus(LaunchStatus.ERROR);
      setLaunchMessage('Failed to send kill signal.');
    }
  }, [launchStatus]); // Dependency on launchStatus

  const clearLaunchError = useCallback(() => {
    if (launchStatus === LaunchStatus.ERROR) {
      setLaunchStatus(LaunchStatus.IDLE);
      setLaunchMessage('');
    }
  }, [launchStatus]);

  return {
    launchStatus,
    launchMessage,
    downloadProgress,
    currentTaskLabel,
    totalFilesToDownload,
    processedFilesCount,
    handlePlay,
    handleKill,
    clearLaunchError,
  };
}

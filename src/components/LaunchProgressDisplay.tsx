import { LaunchStatus } from '../types/LaunchStatus';

interface LaunchProgressDisplayProps {
  launchStatus: LaunchStatus;
  launchMessage: string;
  overallProgress: number;
  processedFilesCount: number;
  totalFilesToDownload: number;
  currentTaskLabel: string;
  totalDownloadedMB: string;
  totalSizeMB: string;
}

export default function LaunchProgressDisplay({
  launchStatus,
  launchMessage,
  overallProgress,
  processedFilesCount,
  totalFilesToDownload,
  currentTaskLabel,
  totalDownloadedMB,
  totalSizeMB,
}: LaunchProgressDisplayProps) {
  // Only render if in a relevant state
  if (
    launchStatus !== LaunchStatus.PREPARING &&
    launchStatus !== LaunchStatus.DOWNLOADING &&
    launchStatus !== LaunchStatus.LAUNCHING &&
    launchStatus !== LaunchStatus.RUNNING &&
    launchStatus !== LaunchStatus.CLOSED
  ) {
    return null;
  }

  return (
    <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm text-white/70">
      <p className="font-medium capitalize">
        {launchStatus === LaunchStatus.CLOSED
          ? `Game ${launchStatus}`
          : launchStatus}
        ...
        {launchStatus === LaunchStatus.DOWNLOADING &&
          totalFilesToDownload > 0 &&
          ` (${processedFilesCount}/${totalFilesToDownload})`}
      </p>
      {/* Show specific message OR current task label */}
      <p className="h-4 truncate text-xs">
        {' '}
        {/* Fixed height */}
        {launchMessage && launchStatus !== LaunchStatus.DOWNLOADING
          ? launchMessage
          : currentTaskLabel || 'Initializing...'}
      </p>
      {/* Progress Bar */}
      {launchStatus === LaunchStatus.DOWNLOADING && (
        <>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full transition-[width] duration-150 ease-in-out dark:bg-indigo-500"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
          {/* Optional: Show MB downloaded */}
          <p className="text-right text-xs">
            {totalDownloadedMB} MB / {totalSizeMB} MB
          </p>
        </>
      )}
    </div>
  );
}

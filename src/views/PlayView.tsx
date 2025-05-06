import { Field, Fieldset, Legend } from '@headlessui/react';
import clsx from 'clsx';
import { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import { useVersionManifest } from '../hooks/useVersionManifest';
import VersionImage from '../components/VersionImage';
import PlayButton from '../components/PlayButton';
import { useLocalVersions } from '../hooks/useLocalVersions';
import { useVersionDetails } from '../hooks/useVersionDetails';
import { LaunchStatus } from '../types/LaunchStatus';
import { VersionType } from '../types/VersionManifest';
import PlaySelectVersion from '../components/PlaySelectVersion';
import { useLaunchManager } from '../hooks/useLaunchManager';
import LaunchProgressDisplay from '../components/LaunchProgressDisplay';
import { useSettings } from '../hooks/useSettings';
import LoadingOverlay from '../components/LoadingOverlay';

export default function PlayView() {
  // --- Hooks ---
  const {
    latestReleaseId,
    getFilteredVersionOptions,
    isLoading: isLoadingManifest,
    error: manifestError,
  } = useVersionManifest();

  // --- Settings Hook ---
  const {
    settings,
    handleChange,
    isLoading: isLoadingSettings,
  } = useSettings();

  const { localVersions, isLoading: isLoadingLocalVersions } =
    useLocalVersions();

  // --- State ---
  const [selectedVersion, setSelectedVersion] = useState<string>('');

  // --- Hook for Version Details ---
  const {
    versionDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useVersionDetails(selectedVersion);

  // --- Hook for Launch Logic ---
  const {
    launchStatus,
    launchMessage,
    downloadProgress,
    currentTaskLabel,
    totalFilesToDownload,
    processedFilesCount,
    handlePlay,
    handleKill,
  } = useLaunchManager();

  // Combine loading states specifically for the version options/selection logic
  const isLoadingOptions = isLoadingManifest || isLoadingLocalVersions;
  const isLoadingAnything =
    isLoadingOptions ||
    isLoadingDetails ||
    isLoadingSettings ||
    launchStatus === LaunchStatus.PREPARING ||
    launchStatus === LaunchStatus.DOWNLOADING ||
    launchStatus === LaunchStatus.LAUNCHING;

  // Combine error states
  const error =
    manifestError ||
    detailsError ||
    (launchStatus === LaunchStatus.ERROR ? launchMessage : null);

  // const clearError = () => {
  //   if (manifestError) clearManifestError();
  //   if (detailsError) clearDetailsError();
  //   if (launchStatus === LaunchStatus.ERROR) clearLaunchError();
  // };

  // --- Effects ---
  // Set default selected version from manifest
  useEffect(() => {
    if (!selectedVersion && !isLoadingOptions && !isLoadingSettings) {
      const initialVersion =
        settings.lastSelectedVersion || latestReleaseId || '';
      setSelectedVersion(initialVersion);
      console.log('PlayView: Default version set to', latestReleaseId);
    }
  }, [
    selectedVersion,
    settings.lastSelectedVersion,
    latestReleaseId,
    isLoadingOptions,
    isLoadingSettings,
  ]);

  // Save selected version to settings when it changes
  useEffect(() => {
    // Only run if a version is selected and nothing critical is loading
    if (selectedVersion && !isLoadingOptions && !isLoadingSettings) {
      // Check if the selected version is different from the saved one to avoid unnecessary saves
      if (selectedVersion !== settings.lastSelectedVersion) {
        console.log(
          'PlayView: Saving selected version to settings:',
          selectedVersion,
        );
        handleChange('lastSelectedVersion', selectedVersion);
      }
    }
    // Dependencies: Run when selection changes or loading finishes
  }, [
    selectedVersion,
    isLoadingOptions,
    isLoadingSettings,
    handleChange,
    settings.lastSelectedVersion,
  ]);

  // // Log details when they load
  // useEffect(() => {
  //   if (versionDetails) {
  //     console.log(
  //       'PlayView: Loaded details for',
  //       selectedVersion,
  //       versionDetails
  //     )
  //     // Next steps: Trigger downloads based on these details if needed
  //   }
  // }, [versionDetails, selectedVersion])

  // --- Version Options Grouped ---
  const versionOptionsGrouped = useMemo(() => {
    console.log('Recalculating grouped version options...');
    // Define structure for groups
    const groups: Array<{
      label: string;
      options: Array<{ value: string; label: string }>;
    }> = [];
    const processedIds = new Set<string>(); // Track IDs added to prevent duplicates

    // 1. Latest Group (if available)
    if (latestReleaseId) {
      groups.push({
        label: 'Latest Release',
        options: [{ value: latestReleaseId, label: latestReleaseId }], // Simple label for latest
      });
      processedIds.add(latestReleaseId);
    }

    // 2. Local (Installed) Group
    const localOptions = localVersions
      .filter((version) => !processedIds.has(version.id)) // Exclude if already added as 'Latest'
      .map((version) => ({
        value: version.id,
        label: version.name, // Use the name from localVersions
      }));

    if (localOptions.length > 0) {
      groups.push({ label: 'Other Installed Versions', options: localOptions });
      localOptions.forEach((opt) => processedIds.add(opt.value)); // Mark these as processed
    }

    // 3. Remote (Available Releases) Group
    // Fetch a decent number initially, then filter and slice
    const remoteOptionsRaw = getFilteredVersionOptions([
      VersionType.Release,
    ]).slice(0, 20);
    const availableRemoteOptions = remoteOptionsRaw.filter(
      (option) => !processedIds.has(option.value),
    ); // Exclude if already processed (latest or local)
    // .slice(0, 10) // Limit the number shown in 'Available'

    if (availableRemoteOptions.length > 0) {
      // Map to the simpler { value, label } structure for consistency
      groups.push({
        label: 'Available Releases',
        options: availableRemoteOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
        })),
      });
    }

    // Calculate total count across all groups
    const total = groups.reduce((sum, group) => sum + group.options.length, 0);

    return { groups, total };
  }, [localVersions, latestReleaseId, getFilteredVersionOptions]);

  // Calculate overall download progress based on files processed
  const overallProgress = useMemo(() => {
    if (totalFilesToDownload <= 0) return 0; // Prevent division by zero or negative totals
    const progress = Math.round(
      (processedFilesCount / totalFilesToDownload) * 100,
    );
    // Clamp the value between 0 and 100 to prevent overflow
    return Math.min(100, Math.max(0, progress));
  }, [processedFilesCount, totalFilesToDownload]);

  // Calculate total downloaded size (approximate)
  const totalDownloadedMB = useMemo(() => {
    const bytes = Object.values(downloadProgress).reduce(
      (sum, file) => sum + (file.downloadedBytes || 0),
      0,
    );
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [downloadProgress]);

  // Calculate total size (approximate, only counts files with known size)
  const totalSizeMB = useMemo(() => {
    const bytes = Object.values(downloadProgress).reduce(
      (sum, file) => sum + (file.totalBytes || 0),
      0,
    );
    // Estimate total based on known files if not all reported yet
    // This is tricky, maybe just show total of files *seen* so far
    return (bytes / (1024 * 1024)).toFixed(1);
  }, [downloadProgress]);

  return (
    <div className="relative grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
      <VersionImage selectedVersion={selectedVersion} />

      <Card
        className={clsx(
          'relative',
          (isLoadingOptions || isLoadingSettings) &&
            'pointer-events-none opacity-50',
        )}
      >
        {(isLoadingOptions || isLoadingSettings) && (
          <LoadingOverlay isLoading={isLoadingAnything} />
        )}
        <Fieldset className="mb-2 flex flex-col gap-3">
          <Legend className="text-xl font-semibold">
            Select Version & Play
          </Legend>
          <Field>
            <PlaySelectVersion
              versionOptionsGrouped={versionOptionsGrouped}
              selectedVersion={selectedVersion}
              setSelectedVersion={setSelectedVersion}
            />

            {/* Display Required Java Version - Reserve space */}
            <p className="mt-1 h-4 pl-1 text-xs text-white/60">
              {' '}
              {
                !isLoadingDetails && versionDetails?.javaVersion
                  ? `Requires Java ${versionDetails.javaVersion.majorVersion}`
                  : '\u00A0' /* Non-breaking space to maintain height */
              }
            </p>
          </Field>

          {/* Play/Kill Button Area */}
          <div className="mt-auto">
            {' '}
            {/* Push button to bottom */}
            <PlayButton
              launchStatus={launchStatus}
              onClickPlay={() => handlePlay(selectedVersion)}
              onClickStop={handleKill}
              disabled={
                !selectedVersion ||
                !!error ||
                !(
                  launchStatus === LaunchStatus.IDLE ||
                  launchStatus === LaunchStatus.CLOSED ||
                  launchStatus === LaunchStatus.RUNNING ||
                  launchStatus === LaunchStatus.LAUNCHING
                )
              } // More precise disable logic
              isLoading={
                launchStatus === LaunchStatus.PREPARING ||
                launchStatus === LaunchStatus.DOWNLOADING
              } // Show loading state
            />
          </div>
        </Fieldset>

        {/* Status/Progress Display Area - Enhanced */}
        <LaunchProgressDisplay
          launchStatus={launchStatus}
          launchMessage={launchMessage}
          overallProgress={overallProgress}
          processedFilesCount={processedFilesCount}
          totalFilesToDownload={totalFilesToDownload}
          currentTaskLabel={currentTaskLabel}
          totalDownloadedMB={totalDownloadedMB}
          totalSizeMB={totalSizeMB}
        />
      </Card>
    </div>
  );
}

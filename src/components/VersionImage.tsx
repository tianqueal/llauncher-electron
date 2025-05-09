import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePatchNotes } from '../hooks/usePatchNotes';
import Container from './Container';
import Spinner from './Spinner';

// --- Constants ---
// Moved outside the component function as it's a static value.
// Simple blurred placeholder background (SVG Gradient Data URI)
const placeholderSvgDataUri =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjpyZ2IoNTUsNjUsODEpO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6cmdiKDMxLDQxLDU1KTtzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNncmFkKSIgLz48L3N2Zz4=';

// --- Component ---
export default function VersionImage({
  selectedVersion,
}: {
  selectedVersion: string;
}) {
  // --- Hooks ---
  const { patchNotes, isLoading: isLoadingPatchNotes } = usePatchNotes();
  const { patchNotesBaseUrl } = window.electron.constants;

  // --- Memoized Values ---
  const selectedVersionImageUrl = useMemo(() => {
    if (!patchNotes || !selectedVersion) {
      return null;
    }
    const entry = patchNotes.entries.find((e) => e.version === selectedVersion);
    return entry?.image?.url ?? null;
  }, [patchNotes, selectedVersion]);

  // --- Calculated States ---
  // Determine visibility states based on props and hook data
  const showSpinner = isLoadingPatchNotes || !patchNotesBaseUrl;
  const showImage =
    !isLoadingPatchNotes &&
    patchNotesBaseUrl &&
    selectedVersionImageUrl &&
    selectedVersion;
  const showPlaceholderText =
    !isLoadingPatchNotes && selectedVersion && !selectedVersionImageUrl;
  const showNoSelectionText = !isLoadingPatchNotes && !selectedVersion;
  const showBlurredBackground = selectedVersion && !isLoadingPatchNotes;

  // --- Render ---
  return (
    // Card acts as the main container with aspect ratio and overflow hidden
    <Container className="relative flex aspect-square items-center justify-center overflow-hidden dark:bg-white/10">
      {/* Blurred Background Layer (z-0) */}
      {/* Renders behind everything else when a version is selected */}
      {showBlurredBackground && (
        <motion.img
          key="blurred-placeholder" // Static key for this layer
          src={placeholderSvgDataUri}
          alt="Blurred background placeholder"
          className="absolute inset-0 z-0 m-0 h-full w-full object-cover blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Foreground Content Layer (Managed by AnimatePresence) */}
      {/* Handles transitions between Spinner, Image, and Text states */}
      <AnimatePresence initial={false}>
        {/* Spinner State (z-30) */}
        {showSpinner && (
          <motion.div
            key="spinner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 m-0 flex items-center justify-center backdrop-blur-sm dark:bg-black/50"
          >
            <Spinner />
          </motion.div>
        )}

        {/* Image State (z-10) */}
        {/* Renders above blurred background, below spinner/text */}
        {showImage && (
          <motion.img
            key={selectedVersionImageUrl} // Dynamic key based on URL for transitions
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-10 m-0 h-full w-full object-cover"
            src={`${patchNotesBaseUrl}${selectedVersionImageUrl}`}
            alt={`Image for version ${selectedVersion}`}
          />
        )}

        {/* Placeholder Text State (z-20) */}
        {/* Renders above blurred background and image */}
        {showPlaceholderText && (
          <motion.div
            key="placeholder-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="z-20 p-4 text-center text-sm text-white/60"
          >
            No image available for {selectedVersion}.
          </motion.div>
        )}

        {/* No Selection Text State (z-20) */}
        {/* Renders when no version is selected */}
        {showNoSelectionText && (
          <motion.div
            key="no-selection-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="z-20 p-4 text-center text-sm text-white/60"
          >
            Select a version to see image.
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
}

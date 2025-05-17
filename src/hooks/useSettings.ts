import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { defaultLauncherProfiles } from '../config/launcherProfilesConfig';
import { getErrorMessage } from '../utils/errorUtils';
import { debounce, DebouncedFunc } from 'lodash';
import { SettingsErrors } from '../types/SettingsErrors';
import { toast } from 'react-toastify';
import { trimStringSettings } from '../utils/formatUtils';
import validateSettings from '../utils/validateSettings';
import { LauncherProfiles } from '../types/LauncherProfiles';
import { SettingsState } from '../types/SettingsState';

/**
 * Custom hook to manage launcher profiles and interactions with auto-save.
 */
export function useSettings() {
  const [launcherProfiles, setLauncherProfiles] = useState<LauncherProfiles>(
    defaultLauncherProfiles,
  );
  const [isLoading, setIsLoading] = useState(true);
  // States for EXPLICIT save feedback
  const [isSaving, setIsSaving] = useState(false);
  // const [showSuccess, setShowSuccess] = useState(false)
  const [showSavedSuccess, setShowSaveSuccess] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  // General error state (can be from load or save)
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<SettingsErrors>({});
  const isInitialLoadRef = useRef(true);

  // --- Debounced SILENT Auto-Save Function ---
  const debouncedAutoSaveRef = useRef<DebouncedFunc<
    (launcherProfilesToSave: LauncherProfiles) => Promise<void>
  > | null>(null);

  // --- Function for EXPLICIT Save with UI Feedback ---
  const performExplicitSave = useCallback(
    async (launcherProfilesToSave: LauncherProfiles) => {
      if (isSaving) return;
      setIsSaving(true); // Set saving state for UI feedback
      setShowSaveSuccess(false);
      setShowResetSuccess(false); // Clear reset success if save is clicked
      setError(null); // Clear previous errors on new save attempt

      // Trim string values before saving
      const trimmedSettingsToSave = trimStringSettings(
        launcherProfilesToSave.settings,
      );
      console.log(
        'useSettings: Performing EXPLICIT save with trimmed values...',
        trimmedSettingsToSave,
      );

      try {
        const result = await window.electron.saveLauncherProfiles({
          ...launcherProfilesToSave,
          ...trimmedSettingsToSave,
        });
        if (result.success) {
          console.log('useSettings: Explicit save successful!');
          setShowSaveSuccess(true); // Set save success
          setTimeout(() => setShowSaveSuccess(false), 1500);
        } else {
          const errorMessage =
            result.error || 'Unknown error during explicit save';
          console.error('useSettings: Explicit save failed:', errorMessage);
          setError(errorMessage);
          toast(errorMessage, {
            type: 'error',
          });
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error during explicit save');
        console.error(`useSettings: ${errorMessage}:`, err);
        setError(errorMessage);
        toast(errorMessage, {
          type: 'error',
        });
      } finally {
        setIsSaving(false); // Clear saving state
      }
    },
    [isSaving], // Depends only on isSaving to prevent concurrent explicit saves
  );

  // Effect to load settings on initial mount AND initialize auto-save
  useEffect(() => {
    console.log('useSettings: Initial load useEffect running.');
    setIsLoading(true);
    setError(null);
    setValidationErrors({});
    isInitialLoadRef.current = true;

    const fetchSettings = async () => {
      try {
        const loadedLauncherProfiles =
          await window.electron.loadLauncherProfiles();
        console.log('useSettings: Received settings', loadedLauncherProfiles);
        const initialLauncherProfiles = {
          ...defaultLauncherProfiles,
          ...loadedLauncherProfiles,
        };
        setLauncherProfiles(initialLauncherProfiles);
        const initialErrors = validateSettings(
          initialLauncherProfiles.settings,
        );
        setValidationErrors(initialErrors);

        if (Object.values(initialErrors).some((e) => e)) {
          console.warn('useSettings: Initial settings have validation errors.');
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error loading settings');
        console.error(`useSettings: ${errorMessage}:`, err);
        setError(errorMessage);
        toast(errorMessage, {
          type: 'error',
        });
      } finally {
        setIsLoading(false);
        console.log('useSettings: isLoading set to false.');
        setTimeout(() => {
          isInitialLoadRef.current = false;
          console.log('useSettings: Initial load flag set to false.');
        }, 0);
      }
    };

    fetchSettings();

    // Initialize the debounced SILENT auto-save function
    debouncedAutoSaveRef.current = debounce(
      async (launcherProfilesToSave: LauncherProfiles) => {
        // Trim string values before validation and saving
        const trimmedSettingsToSave = trimStringSettings(
          launcherProfilesToSave.settings,
        );

        // --- Validate before silent auto-save ---
        const currentErrors = validateSettings(trimmedSettingsToSave); // Validate trimmed values
        if (Object.values(currentErrors).some((e) => e)) {
          console.warn(
            'useSettings: Skipping SILENT auto-save due to validation errors.',
            currentErrors,
          );
          setValidationErrors(currentErrors);
          return; // Don't save if errors exist
        }
        // --- End Validation ---

        console.log(
          'useSettings: Performing SILENT auto-save...',
          trimmedSettingsToSave,
        );
        try {
          // Directly call saveLauncherProfiles, DO NOT update isSaving/showSuccess
          const result = await window.electron.saveLauncherProfiles(
            launcherProfilesToSave,
          );
          if (!result.success) {
            console.error(
              'useSettings: Silent auto-save failed:',
              result.error,
            );
            // Optionally set error state here too, if desired for background errors
            // setError(result.error || 'Unknown error during auto-save');
          } else {
            console.log('useSettings: Silent auto-save successful.');
          }
        } catch (err: unknown) {
          const errorMessage = getErrorMessage(
            err,
            'Error during silent auto-save',
          );
          console.error(`useSettings: ${errorMessage}:`, err);
          // Optionally set error state
          // setError(errorMessage);
        }
      },
      1000, // Debounce for 1 second
    );

    // Cleanup debounced function on unmount
    return () => {
      console.log('useSettings: Cleaning up initial load effect.');
      debouncedAutoSaveRef.current?.cancel();
    };
  }, []); // Runs only once on mount

  // Effect to trigger SILENT auto-save when settings change
  useEffect(() => {
    if (isInitialLoadRef.current || isLoading) {
      console.log(
        'useSettings: Skipping auto-save (initial load or still loading).',
      );
      return;
    }

    // --- Validate on every change ---
    const currentErrors = validateSettings(launcherProfiles.settings);
    setValidationErrors(currentErrors); // Update validation state immediately
    // --- End Validation ---

    if (debouncedAutoSaveRef.current) {
      console.log(
        'useSettings: Settings changed, triggering SILENT auto-save.',
      );
      debouncedAutoSaveRef.current(launcherProfiles);
    } else {
      console.warn(
        'useSettings: Debounced auto-save function not initialized yet.',
      );
    }
  }, [launcherProfiles, isLoading]); // Depend on settings and isLoading

  // Handler for input changes (updates local state, triggers auto-save effect)
  const handleSettingChange = useCallback(
    <K extends keyof SettingsState>(id: K, value: SettingsState[K]) => {
      // Update the state with the raw value from the input
      setLauncherProfiles((prevLauncherProfiles) => ({
        ...prevLauncherProfiles,
        settings: {
          ...prevLauncherProfiles.settings,
          [id]: value,
        },
      }));
      // Validation and auto-save (with trimming) are handled by the useEffect hook
    },
    [],
  );

  const handleLauncherProfilesChange = useCallback(
    <K extends keyof LauncherProfiles>(id: K, value: LauncherProfiles[K]) => {
      setLauncherProfiles((prevLauncherProfiles) => ({
        ...prevLauncherProfiles,
        [id]: value,
      }));
    },
    [],
  );

  // Handler for EXPLICIT saving (button click)
  const handleSave = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      // Cancel any pending auto-save and save immediately with feedback
      debouncedAutoSaveRef.current?.cancel();

      // Trim values before validation for explicit save
      const trimmedSettings = trimStringSettings(launcherProfiles.settings);

      // --- Validate before explicit save ---
      const currentErrors = validateSettings(trimmedSettings);
      setValidationErrors(currentErrors);
      if (Object.values(currentErrors).some((e) => e)) {
        console.error(
          'useSettings: Explicit save prevented due to validation errors.',
          currentErrors,
        );
        const errorMessage =
          'Please fix the errors highlighted below before saving.';
        setError(errorMessage); // Set general error
        toast(errorMessage, {
          type: 'error',
        });

        return; // Don't save
      }
      // --- End Validation ---

      setError(null);
      await performExplicitSave({
        ...launcherProfiles,
        settings: trimmedSettings,
      });
    },
    [performExplicitSave, launcherProfiles.settings],
  );

  // Handler for resetting settings
  const handleSettingsReset = useCallback(async () => {
    if (isSaving) return; // Prevent concurrent operations
    debouncedAutoSaveRef.current?.cancel(); // Cancel pending auto-saves

    setIsSaving(true); // Use isSaving to indicate activity
    setShowResetSuccess(false); // Clear previous reset success
    setShowSaveSuccess(false); // Clear save success if reset is clicked
    setError(null);
    setValidationErrors({}); // Clear validation errors
    console.log('useSettings: Resetting settings to default...');

    try {
      const settingsToReset = {
        ...launcherProfiles,
        settings: defaultLauncherProfiles.settings,
      };
      console.log(
        'useSettings: Default settings to be applied:',
        settingsToReset,
      );

      // Set local state first for immediate UI update
      setLauncherProfiles(settingsToReset);
      // Validate the default settings (should pass)
      const defaultErrors = validateSettings(defaultLauncherProfiles.settings);
      setValidationErrors(defaultErrors);

      // Then save the default settings
      const result =
        await window.electron.saveLauncherProfiles(settingsToReset);

      if (result.success) {
        console.log('useSettings: Reset successful!');
        setShowResetSuccess(true); // Set reset success
        setTimeout(() => setShowResetSuccess(false), 1500);
      } else {
        const errorMessage = result.error || 'Unknown error during reset save';
        console.error('useSettings: Reset failed during save:', errorMessage);
        setError(errorMessage);
        toast(errorMessage, {
          type: 'error',
        });
        // Consider reverting local state if save fails? Or show error and let user retry.
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error during reset');
      console.error(`useSettings: ${errorMessage}:`, err);
      setError(errorMessage);
      toast(errorMessage, {
        type: 'error',
      });
    } finally {
      setIsSaving(false); // Clear saving state
    }
  }, [isSaving, launcherProfiles, defaultLauncherProfiles.settings]);

  const hasValidationErrors = Object.values(validationErrors).some((e) => e);

  return {
    launcherProfiles,
    isLoading,
    isSaving,
    showSavedSuccess,
    showResetSuccess,
    error, // General error state
    validationErrors, // Field-specific validation errors
    hasValidationErrors,
    handleSettingChange,
    handleLauncherProfilesChange,
    handleSave, // Explicit save action
    handleSettingsReset,
  };
}

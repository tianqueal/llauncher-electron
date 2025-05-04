import { useState, useEffect, useCallback, FormEvent, useRef } from 'react'
import { defaultSettings, SettingsState } from '../config/settingsConfig'
import { getErrorMessage } from '../utils/errorUtils'
import { debounce, DebouncedFunc } from 'lodash'

/**
 * Custom hook to manage settings state and interactions with auto-save.
 */
export function useSettings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  // States for EXPLICIT save feedback
  const [isSaving, setIsSaving] = useState(false)
  // const [showSuccess, setShowSuccess] = useState(false)
  const [showSavedSuccess, setShowSaveSuccess] = useState(false)
  const [showResetSuccess, setShowResetSuccess] = useState(false)
  // General error state (can be from load or save)
  const [error, setError] = useState<string | null>(null)
  const isInitialLoadRef = useRef(true)

  // --- Debounced SILENT Auto-Save Function ---
  const debouncedAutoSaveRef = useRef<DebouncedFunc<
    (settingsToSave: SettingsState) => Promise<void>
  > | null>(null)

  // --- Function for EXPLICIT Save with UI Feedback ---
  const performExplicitSave = useCallback(
    async (settingsToSave: SettingsState) => {
      if (isSaving) return
      setIsSaving(true) // Set saving state for UI feedback
      setShowSaveSuccess(false)
      setShowResetSuccess(false) // Clear reset success if save is clicked
      setError(null) // Clear previous errors on new save attempt
      console.log('useSettings: Performing EXPLICIT save...', settingsToSave)

      try {
        const result = await window.electron.saveSettings(settingsToSave)
        if (result.success) {
          console.log('useSettings: Explicit save successful!')
          setShowSaveSuccess(true) // Set save success
          setTimeout(() => setShowSaveSuccess(false), 1500)
        } else {
          console.error('useSettings: Explicit save failed:', result.error)
          setError(result.error || 'Unknown error saving settings')
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error during explicit save')
        console.error(`useSettings: ${errorMessage}:`, err)
        setError(errorMessage)
      } finally {
        setIsSaving(false) // Clear saving state
      }
    },
    [isSaving] // Depends only on isSaving to prevent concurrent explicit saves
  )

  // Effect to load settings on initial mount AND initialize auto-save
  useEffect(() => {
    console.log('useSettings: Initial load useEffect running.')
    setIsLoading(true)
    setError(null)
    isInitialLoadRef.current = true

    const fetchSettings = async () => {
      try {
        const loadedSettings = await window.electron.loadSettings()
        console.log('useSettings: Received settings', loadedSettings)
        setSettings(() => ({ ...defaultSettings, ...loadedSettings }))
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(err, 'Error loading settings')
        console.error(`useSettings: ${errorMessage}:`, err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
        console.log('useSettings: isLoading set to false.')
        setTimeout(() => {
          isInitialLoadRef.current = false
          console.log('useSettings: Initial load flag set to false.')
        }, 0)
      }
    }

    fetchSettings()

    // Initialize the debounced SILENT auto-save function
    debouncedAutoSaveRef.current = debounce(
      async (settingsToSave: SettingsState) => {
        console.log(
          'useSettings: Performing SILENT auto-save...',
          settingsToSave
        )
        try {
          // Directly call saveSettings, DO NOT update isSaving/showSuccess
          const result = await window.electron.saveSettings(settingsToSave)
          if (!result.success) {
            console.error('useSettings: Silent auto-save failed:', result.error)
            // Optionally set error state here too, if desired for background errors
            // setError(result.error || 'Unknown error during auto-save');
          } else {
            console.log('useSettings: Silent auto-save successful.')
          }
        } catch (err: unknown) {
          const errorMessage = getErrorMessage(
            err,
            'Error during silent auto-save'
          )
          console.error(`useSettings: ${errorMessage}:`, err)
          // Optionally set error state
          // setError(errorMessage);
        }
      },
      1000 // Debounce for 1 second
    )

    // Cleanup debounced function on unmount
    return () => {
      console.log('useSettings: Cleaning up initial load effect.')
      debouncedAutoSaveRef.current?.cancel()
    }
  }, []) // Runs only once on mount

  // Effect to trigger SILENT auto-save when settings change
  useEffect(() => {
    if (isInitialLoadRef.current || isLoading) {
      console.log(
        'useSettings: Skipping auto-save (initial load or still loading).'
      )
      return
    }

    if (debouncedAutoSaveRef.current) {
      console.log('useSettings: Settings changed, triggering SILENT auto-save.')
      debouncedAutoSaveRef.current(settings)
    } else {
      console.warn(
        'useSettings: Debounced auto-save function not initialized yet.'
      )
    }
  }, [settings, isLoading]) // Depend on settings and isLoading

  // Handler for input changes (updates local state, triggers auto-save effect)
  const handleChange = useCallback(
    (id: keyof SettingsState, value: string | number | boolean) => {
      setSettings((prevSettings) => ({
        ...prevSettings,
        [id]: value,
      }))
    },
    []
  )

  // Handler for EXPLICIT saving (button click)
  const handleSave = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      // Cancel any pending auto-save and save immediately with feedback
      debouncedAutoSaveRef.current?.cancel()
      await performExplicitSave(settings)
    },
    [performExplicitSave, settings]
  )

  // Handler for resetting settings
  const handleReset = useCallback(async () => {
    if (isSaving) return // Prevent concurrent operations
    debouncedAutoSaveRef.current?.cancel() // Cancel pending auto-saves

    setIsSaving(true) // Use isSaving to indicate activity
    setShowResetSuccess(false) // Clear previous reset success
    setShowSaveSuccess(false) // Clear save success if reset is clicked
    setError(null)
    console.log('useSettings: Resetting settings to default...')

    try {
      // Set local state first for immediate UI update
      setSettings(defaultSettings)
      // Then save the default settings
      const result = await window.electron.saveSettings(defaultSettings)
      if (result.success) {
        console.log('useSettings: Reset successful!')
        setShowResetSuccess(true) // Set reset success
        setTimeout(() => setShowResetSuccess(false), 1500)
      } else {
        console.error('useSettings: Reset failed during save:', result.error)
        setError(result.error || 'Unknown error resetting settings')
        // Consider reverting local state if save fails? Or show error and let user retry.
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Error during reset')
      console.error(`useSettings: ${errorMessage}:`, err)
      setError(errorMessage)
    } finally {
      setIsSaving(false) // Clear saving state
    }
  }, [isSaving])

  return {
    settings,
    isLoading,
    // Return states related to explicit save for UI feedback
    isSaving,
    showSavedSuccess,
    showResetSuccess,
    error, // General error state
    handleChange,
    handleSave, // Explicit save action
    handleReset,
  }
}

import { Fieldset, Legend } from '@headlessui/react'
import clsx from 'clsx'
import SettingsField from '../components/SettingField'
import Spinner from '../components/Spinner'
import { CheckIcon } from '@heroicons/react/20/solid'
import { useSettings } from '../hooks/useSettings'
import { settingsFields } from '../config/settingsFields'
import FormButton from '../components/FormButton' // Import FormButtonProps
import LoadingOverlay from '../components/LoadingOverlay'
import { ReactNode } from 'react'
import { FormButtonProps } from '../types/FormButtonProps'
import Dialog from '../components/Dialog'

// --- Local Sub-component for Action Buttons ---
interface SettingsActionButtonProps extends FormButtonProps {
  children: ReactNode // Button text
}

function SettingsActionButton({
  children,
  isLoading,
  isSuccess,
  ...rest // Pass other FormButton props like type, variant, onClick, disabled
}: SettingsActionButtonProps) {
  return (
    <FormButton isLoading={isLoading} isSuccess={isSuccess} {...rest}>
      <div className="relative flex items-center justify-center h-5">
        {/* Spinner */}
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
            isLoading && !isSuccess ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Spinner />
        </span>
        {/* Check Icon */}
        <span
          className={clsx(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
            isSuccess ? 'opacity-100' : 'opacity-0'
          )}
        >
          <CheckIcon className="size-5" />
        </span>
        {/* Button Text */}
        <span
          className={clsx(
            'transition-opacity duration-200',
            isLoading || isSuccess ? 'opacity-0' : 'opacity-100'
          )}
        >
          {children}
        </span>
      </div>
    </FormButton>
  )
}

// --- Main SettingsView Component ---
export default function SettingsView() {
  const {
    settings,
    isLoading,
    isSaving,
    showSavedSuccess,
    showResetSuccess,
    error,
    validationErrors,
    hasValidationErrors,
    handleChange,
    handleSave,
    handleReset,
  } = useSettings()

  return (
    <div className="w-full flex justify-center relative max-w-4xl">
      <LoadingOverlay isLoading={isLoading} />

      {/* Display general save error if present */}
      {error && (
        <Dialog
          variant="error"
          title="Save Error"
          description={error}
          onClose={() => {
            /* Optionally clear the general error here if needed */
          }}
          className="fixed bottom-5 right-5 z-30" // Adjust position as needed
        />
      )}

      <form
        onSubmit={handleSave}
        className={clsx(
          'w-full transition-opacity duration-300',
          // Dim if initial loading OR if saving/resetting is in progress
          (isLoading || isSaving) && 'opacity-50 pointer-events-none'
        )}
        aria-busy={isLoading || isSaving}
      >
        <Fieldset
          disabled={isLoading || isSaving} // Disable fieldset during initial load or save/reset
          className="space-y-6 rounded-xl dark:bg-white/5 p-6 sm:p-10"
        >
          {/* ... Legend and Section ... */}
          <Legend className="text-xl font-semibold">Runner Settings</Legend>

          <section className="space-y-6 md:grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* ... settingsFields.map ... */}
            {settingsFields.map((fieldConfig) => (
              <SettingsField
                key={fieldConfig.id}
                config={fieldConfig}
                value={settings[fieldConfig.id] ?? ''}
                onChange={handleChange}
                error={validationErrors[fieldConfig.id]}
              />
            ))}
          </section>

          <div className="flex justify-end gap-4 mt-6">
            {/* Use SettingsActionButton for Reset */}
            <SettingsActionButton
              type="button"
              variant="secondary"
              onClick={handleReset}
              isLoading={isSaving}
              isSuccess={showResetSuccess}
              disabled={isLoading || isSaving}
            >
              Reset
            </SettingsActionButton>

            {/* Use SettingsActionButton for Save */}
            <SettingsActionButton
              type="submit"
              variant="primary"
              isLoading={isSaving}
              isSuccess={showSavedSuccess}
              disabled={isLoading || isSaving || hasValidationErrors}
              title={
                hasValidationErrors
                  ? 'Please fix errors before saving'
                  : undefined
              }
            >
              Save Settings
            </SettingsActionButton>
          </div>
        </Fieldset>
      </form>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { VersionDetails } from '../types/VersionDetails'
import { getErrorMessage } from '../utils/errorUtils'

/**
 * Hook to fetch detailed information for a specific Game version.
 * @param versionId The ID of the version to fetch details for.
 */
export function useVersionDetails(versionId: string | null) {
  const [versionDetails, setVersionDetails] = useState<VersionDetails | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false) // Start not loading
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch if a valid versionId is provided
    if (!versionId) {
      setVersionDetails(null) // Clear details if versionId is null/empty
      setIsLoading(false)
      setError(null)
      return
    }

    console.log(
      `useVersionDetails: Version ID changed to ${versionId}. Fetching details...`
    )
    setIsLoading(true)
    setError(null)
    setVersionDetails(null) // Clear previous details

    const fetchDetails = async () => {
      try {
        const data = await window.electron.getVersionDetails(versionId)
        if (data) {
          console.log(`useVersionDetails: Details received for ${versionId}.`)
          setVersionDetails(data)
        } else {
          console.error(
            `useVersionDetails: Received null details for ${versionId} from main process.`
          )
          setError(`Could not load details for version ${versionId}.`)
          setVersionDetails(null)
        }
      } catch (err: unknown) {
        const errorMessage = getErrorMessage(
          err,
          `Error fetching details for ${versionId}`
        )
        console.error(`useVersionDetails: ${errorMessage}:`, err)
        setError(errorMessage)
        setVersionDetails(null)
      } finally {
        setIsLoading(false)
        console.log(`useVersionDetails: Loading finished for ${versionId}.`)
      }
    }

    fetchDetails()

    // No cleanup needed for invoke/handle pattern
  }, [versionId]) // Re-run effect when versionId changes

  // Function to clear the error if needed externally
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    versionDetails,
    isLoading,
    error,
    clearError,
  }
}

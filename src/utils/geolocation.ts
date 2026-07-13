/**
 * Geolocation utility for capturing GPS coordinates.
 * Used by the attendance check-in/check-out feature for geo-fence verification.
 */

export interface Coordinates {
  latitude: number
  longitude: number
  accuracy: number
}

export interface GeolocationError {
  code: number
  message: string
}

/**
 * Request the user's current GPS position.
 * Returns coordinates on success, or throws a GeolocationError on failure.
 *
 * @param options - PositionOptions for accuracy and timeout control
 * @returns A promise that resolves with the user's coordinates
 */
export function getCurrentPosition(
  options?: PositionOptions,
): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser.',
      } satisfies GeolocationError)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        reject({
          code: error.code,
          message: getGeolocationErrorMessage(error.code),
        } satisfies GeolocationError)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options,
      },
    )
  })
}

/**
 * Map geolocation error codes to user-friendly messages.
 */
function getGeolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location permission denied. Please enable location access in your browser settings to check in.'
    case 2:
      return 'Unable to determine your location. Please check your device GPS settings and try again.'
    case 3:
      return 'Location request timed out. Please try again in an area with better GPS signal.'
    default:
      return 'An unknown error occurred while getting your location.'
  }
}

/**
 * Check if the Geolocation API is available in the current browser.
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator
}

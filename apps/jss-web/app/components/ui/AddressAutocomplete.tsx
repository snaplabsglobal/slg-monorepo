'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'

// Type for Google Maps Autocomplete (loaded dynamically)
type GoogleAutocomplete = google.maps.places.Autocomplete

/**
 * AddressAutocomplete - Google Places Autocomplete Component
 *
 * Returns standardized address data:
 * - place_id: Google's unique identifier
 * - formatted_address: Human-readable address
 * - lat/lng: Coordinates for geofencing
 *
 * Usage:
 *   <AddressAutocomplete
 *     value={address}
 *     onChange={(data) => {
 *       setAddress(data.formatted_address)
 *       setPlaceId(data.place_id)
 *       setLat(data.lat)
 *       setLng(data.lng)
 *     }}
 *   />
 */

export interface AddressData {
  place_id: string
  formatted_address: string
  lat: number
  lng: number
}

interface AddressAutocompleteProps {
  value?: string
  onChange: (data: AddressData | null) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

// Load Google Maps script
let googleMapsPromise: Promise<void> | null = null

function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      resolve()
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set')
      reject(new Error('Google Maps API key not configured'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export function AddressAutocomplete({
  value = '',
  onChange,
  placeholder = 'Enter job address',
  disabled = false,
  error,
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(value)
  const [isLoading, setIsLoading] = useState(true)
  const [isSelected, setIsSelected] = useState(!!value)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        await loadGoogleMaps()

        if (!mounted || !inputRef.current) return

        // Create autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: ['ca', 'us'] },
          fields: ['place_id', 'formatted_address', 'geometry'],
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()

          if (place.place_id && place.formatted_address && place.geometry?.location) {
            const data: AddressData = {
              place_id: place.place_id,
              formatted_address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            }

            setInputValue(place.formatted_address)
            setIsSelected(true)
            onChange(data)
          }
        })

        autocompleteRef.current = autocomplete
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to initialize Google Places:', err)
        setLoadError('Address lookup unavailable')
        setIsLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [onChange])

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue && value) {
      setInputValue(value)
      setIsSelected(true)
    }
  }, [value])

  // Handle input change (user typing)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // If user is typing, mark as not selected (they need to pick from list)
    if (isSelected) {
      setIsSelected(false)
      onChange(null) // Clear the data since they're typing new address
    }
  }, [isSelected, onChange])

  // Handle clear
  const handleClear = useCallback(() => {
    setInputValue('')
    setIsSelected(false)
    onChange(null)
    inputRef.current?.focus()
  }, [onChange])

  return (
    <div className={className}>
      <div className="relative">
        {/* Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <MapPin className="w-5 h-5" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`
            w-full pl-10 pr-10 py-3 rounded-lg border transition-colors
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2 focus:ring-opacity-50
          `}
        />

        {/* Clear button */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Helper text */}
      {loadError ? (
        <p className="mt-1.5 text-xs text-red-600">{loadError}</p>
      ) : error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : inputValue && !isSelected ? (
        <p className="mt-1.5 text-xs text-amber-600">
          Please select an address from the list.
        </p>
      ) : null}
    </div>
  )
}

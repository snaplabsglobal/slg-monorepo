import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import type { JobPhoto, PhotoListResponse } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

const PAGE_SIZE = 20

/**
 * SWR Infinite hook for fetching photos with pagination
 *
 * Features:
 * - Infinite scroll support
 * - Automatic caching per page
 * - Optimistic updates
 */
export function usePhotos(jobId: string) {
  const getKey = (pageIndex: number, previousPageData: PhotoListResponse | null) => {
    // Reached the end
    if (previousPageData && !previousPageData.hasMore) return null

    // First page
    if (pageIndex === 0) return `/api/jobs/${jobId}/photos?limit=${PAGE_SIZE}&offset=0`

    // Next page
    const offset = pageIndex * PAGE_SIZE
    return `/api/jobs/${jobId}/photos?limit=${PAGE_SIZE}&offset=${offset}`
  }

  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<PhotoListResponse>(getKey, fetcher, {
    revalidateOnFocus: false, // Don't refetch all pages on focus
    revalidateFirstPage: true,
    dedupingInterval: 2000,
  })

  // Flatten all pages into single array
  const photos: JobPhoto[] = data ? data.flatMap(page => page.photos) : []
  const hasMore = data ? data[data.length - 1]?.hasMore ?? false : false
  const isEmpty = data?.[0]?.photos.length === 0

  const loadMore = () => {
    if (hasMore && !isValidating) {
      setSize(size + 1)
    }
  }

  const refresh = () => {
    mutate()
  }

  // Add a photo optimistically
  const addPhoto = (photo: JobPhoto) => {
    mutate(
      current => {
        if (!current || current.length === 0) {
          return [{ photos: [photo], total: 1, hasMore: false }]
        }
        // Add to first page
        const newData = [...current]
        newData[0] = {
          ...newData[0],
          photos: [photo, ...newData[0].photos],
          total: newData[0].total + 1,
        }
        return newData
      },
      { revalidate: false }
    )
  }

  // Remove a photo optimistically
  const removePhoto = (photoId: string) => {
    mutate(
      current => {
        if (!current) return current
        return current.map(page => ({
          ...page,
          photos: page.photos.filter(p => p.id !== photoId),
          total: Math.max(0, page.total - 1),
        }))
      },
      { revalidate: false }
    )
  }

  return {
    photos,
    isLoading,
    isValidating,
    isError: !!error,
    error,
    hasMore,
    isEmpty,
    loadMore,
    refresh,
    addPhoto,
    removePhoto,
    mutate,
  }
}

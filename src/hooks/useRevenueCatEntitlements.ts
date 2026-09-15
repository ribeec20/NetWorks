import { useEffect, useState } from 'react'
import type { UserTier } from '../types'
import { useAuthStore } from '../stores/auth-store'
import {
  getRevenueCatStatus,
  getRevenueCatTier,
  isRevenueCatConfigured,
} from '../billing/revenuecat'

interface RevenueCatEntitlementState {
  configured: boolean
  loading: boolean
  error: string | null
  userTier: UserTier
  activeEntitlements: string[]
  matchedEntitlements: string[]
  lastSyncedAt: number | null
}

const initialState: RevenueCatEntitlementState = {
  configured: isRevenueCatConfigured(),
  loading: false,
  error: null,
  userTier: 'free',
  activeEntitlements: [],
  matchedEntitlements: [],
  lastSyncedAt: null,
}

export function useRevenueCatEntitlements(): RevenueCatEntitlementState {
  const user = useAuthStore((state) => state.user)
  const [state, setState] = useState<RevenueCatEntitlementState>(initialState)

  useEffect(() => {
    let cancelled = false
    const configured = isRevenueCatConfigured()

    if (!user) {
      setState({
        configured,
        loading: false,
        error: null,
        userTier: 'free',
        activeEntitlements: [],
        matchedEntitlements: [],
        lastSyncedAt: null,
      })
      return () => {
        cancelled = true
      }
    }

    if (!configured) {
      setState({
        configured: false,
        loading: false,
        error: null,
        userTier: 'free',
        activeEntitlements: [],
        matchedEntitlements: [],
        lastSyncedAt: null,
      })
      return () => {
        cancelled = true
      }
    }

    setState((current) => ({
      ...current,
      configured: true,
      loading: true,
      error: null,
    }))

    void getRevenueCatStatus(user.uid)
      .then((status) => {
        if (cancelled) return

        setState({
          configured: true,
          loading: false,
          error: null,
          userTier: getRevenueCatTier(status),
          activeEntitlements: status?.activeEntitlements ?? [],
          matchedEntitlements: status?.matchedEntitlements ?? [],
          lastSyncedAt: Date.now(),
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return

        setState({
          configured: true,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load RevenueCat entitlements.',
          userTier: 'free',
          activeEntitlements: [],
          matchedEntitlements: [],
          lastSyncedAt: null,
        })
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return state
}
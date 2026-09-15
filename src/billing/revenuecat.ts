import { Purchases, type CustomerInfo } from '@revenuecat/purchases-js'
import type { UserTier } from '../types'

const DEFAULT_ENTITLEMENT_KEYS = ['premium', 'owned']

let purchasesInstance: Purchases | null = null
let configuredUserId: string | null = null

function getPublicApiKey(): string | null {
  const apiKey = import.meta.env.VITE_REVENUECAT_WEB_BILLING_PUBLIC_API_KEY?.trim()
  return apiKey ? apiKey : null
}

export function isRevenueCatConfigured(): boolean {
  return getPublicApiKey() !== null
}

export function getRevenueCatEntitlementKeys(): string[] {
  const raw = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_KEYS?.trim()
  if (!raw) return DEFAULT_ENTITLEMENT_KEYS

  const parsed = raw
    .split(',')
    .map((value: string) => value.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : DEFAULT_ENTITLEMENT_KEYS
}

async function getPurchasesForUser(appUserId: string): Promise<Purchases | null> {
  const apiKey = getPublicApiKey()
  if (!apiKey) return null

  if (!Purchases.isConfigured()) {
    purchasesInstance = Purchases.configure({ apiKey, appUserId })
    configuredUserId = appUserId
    return purchasesInstance
  }

  purchasesInstance ??= Purchases.getSharedInstance()

  if (configuredUserId !== appUserId) {
    await purchasesInstance.changeUser(appUserId)
    configuredUserId = appUserId
  }

  return purchasesInstance
}

export interface RevenueCatStatus {
  customerInfo: CustomerInfo
  activeEntitlements: string[]
  matchedEntitlements: string[]
}

export async function getRevenueCatStatus(appUserId: string): Promise<RevenueCatStatus | null> {
  const purchases = await getPurchasesForUser(appUserId)
  if (!purchases) return null

  const customerInfo = await purchases.getCustomerInfo()
  const activeEntitlements = Object.keys(customerInfo.entitlements.active)
  const matchedEntitlements = activeEntitlements.filter((entitlementId) =>
    getRevenueCatEntitlementKeys().includes(entitlementId),
  )

  return {
    customerInfo,
    activeEntitlements,
    matchedEntitlements,
  }
}

export function getRevenueCatTier(status: RevenueCatStatus | null): UserTier {
  if (!status) return 'free'
  return status.matchedEntitlements.length > 0 ? 'paid' : 'free'
}
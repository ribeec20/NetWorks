import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore'
import { firestore } from '../data/firebase-config'
import type { TagDefinition, TagClass } from '../types'
import { DEFAULT_TAGS, TAG_CLASS_ORDER } from '../data/default-tags'

const TAGS_COLLECTION = 'tags'

export function useTags() {
  const [firestoreTags, setFirestoreTags] = useState<TagDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [seeded, setSeeded] = useState(false)

  // Seed defaults into Firestore once we have a snapshot (confirms auth/access works)
  useEffect(() => {
    if (seeded || firestoreTags.length === 0 && loading) return
    const existing = new Set(firestoreTags.map((t) => t.name))
    const missing = DEFAULT_TAGS.filter((t) => !existing.has(t.name))
    if (missing.length === 0) {
      setSeeded(true)
      return
    }
    let cancelled = false
    Promise.all(
      missing.map((t) =>
        setDoc(doc(firestore, TAGS_COLLECTION, t.name), {
          class: t.class,
          builtIn: true,
          createdAt: Date.now(),
        }),
      ),
    )
      .catch(() => {/* best-effort */})
      .finally(() => { if (!cancelled) setSeeded(true) })
    return () => { cancelled = true }
  }, [seeded, firestoreTags, loading])

  // Listen for real-time tag updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, TAGS_COLLECTION),
      (snapshot) => {
        const tags: TagDefinition[] = snapshot.docs.map((d) => {
          const data = d.data()
          return {
            name: d.id,
            class: (data.class as TagClass) ?? null,
            builtIn: data.builtIn ?? false,
            createdAt: data.createdAt ?? 0,
          }
        })
        setFirestoreTags(tags)
        setLoading(false)
      },
      () => {
        setLoading(false)
      },
    )
    return unsubscribe
  }, [])

  // Merge: Firestore tags are the source of truth, but ensure defaults always present
  const allTags = useMemo(() => {
    const byName = new Map(firestoreTags.map((t) => [t.name, t]))
    // Add any defaults not yet in Firestore (in case seeding hasn't completed)
    for (const d of DEFAULT_TAGS) {
      if (!byName.has(d.name)) {
        byName.set(d.name, {
          name: d.name,
          class: d.class,
          builtIn: true,
          createdAt: 0,
        })
      }
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [firestoreTags])

  // Flat string list for backward compat
  const availableTags = useMemo(() => allTags.map((t) => t.name), [allTags])

  // Tags grouped by class
  const tagsByClass = useMemo(() => {
    const groups: Record<string, TagDefinition[]> = {}
    for (const tag of allTags) {
      const key = tag.class ?? 'custom'
      if (!groups[key]) groups[key] = []
      groups[key].push(tag)
    }
    return groups
  }, [allTags])

  // Ordered class keys (known classes first, then custom)
  const classOrder = useMemo(() => {
    const keys = Object.keys(tagsByClass)
    return [
      ...TAG_CLASS_ORDER.filter((c) => keys.includes(c)),
      ...keys.filter((k) => !TAG_CLASS_ORDER.includes(k)),
    ]
  }, [tagsByClass])

  const addTag = useCallback(async (tag: string, tagClass?: TagClass | null) => {
    const normalized = tag.trim().toLowerCase()
    if (!normalized) return
    await setDoc(doc(firestore, TAGS_COLLECTION, normalized), {
      class: tagClass ?? null,
      builtIn: false,
      createdAt: Date.now(),
    })
  }, [])

  const removeTag = useCallback(async (tag: string) => {
    // Only allow deleting user-created tags, never built-ins
    const builtInNames = new Set(DEFAULT_TAGS.map((t) => t.name))
    if (builtInNames.has(tag)) return
    await deleteDoc(doc(firestore, TAGS_COLLECTION, tag))
  }, [])

  const getTagDef = useCallback(
    (name: string): TagDefinition | undefined => allTags.find((t) => t.name === name),
    [allTags],
  )

  return {
    allTags,
    availableTags,
    tagsByClass,
    classOrder,
    loading,
    addTag,
    removeTag,
    getTagDef,
  }
}

import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import { afterEach, describe, expect, it } from 'vitest'
import type { CalendarEvent, EventDraft } from '../domain/event'
import {
  EVENT_STORAGE_KEY,
  createEventStateCreator,
  createEventStore,
  eventPersistOptions,
  partializeEventState,
  useEventStore,
  type EventState,
} from './event-store'

function createEvent(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'id'>,
): CalendarEvent {
  return {
    type: 'meeting',
    name: 'Weekly safety briefing',
    startDate: '2026-06-22T09:00:00',
    endDate: '2026-06-22T09:30:00',
    ...overrides,
  }
}

function createDraft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    type: 'inspection',
    name: 'Night inspection',
    startDate: '2026-06-24T22:00:00',
    endDate: '2026-06-25T02:00:00',
    ...overrides,
  }
}

function createTestStore(
  initialEvents: CalendarEvent[],
  createId: () => string = () => 'generated-id',
) {
  return createEventStore({ initialEvents, createId })
}

function persistedStateKeys(value: unknown): string[] | undefined {
  if (typeof value !== 'object' || value === null || !('state' in value)) {
    return undefined
  }

  const state = value.state
  if (typeof state !== 'object' || state === null) {
    return undefined
  }

  return Object.keys(state)
}

describe('event store', () => {
  it('initializes with supplied initial events', () => {
    const initialEvents = [
      createEvent({ id: 'evt-001' }),
      createEvent({
        id: 'evt-002',
        name: 'Site A weekly walkthrough',
        startDate: '2026-06-23T14:30:00',
        endDate: '2026-06-23T15:30:00',
      }),
    ]

    const store = createTestStore(initialEvents)

    expect(store.getState().events).toEqual(initialEvents)
    expect(store.getState().events).not.toBe(initialEvents)
    expect(store.getState().events[0]).not.toBe(initialEvents[0])
  })

  it('addEvent uses the injected deterministic ID factory', () => {
    const store = createTestStore([], () => 'generated-id')
    const created = store.getState().addEvent(createDraft())

    expect(created.id).toBe('generated-id')
    expect(store.getState().events[0]?.id).toBe('generated-id')
  })

  it('addEvent returns the created event', () => {
    const draft = createDraft()
    const store = createTestStore([])
    const created = store.getState().addEvent(draft)

    expect(created).toEqual({
      id: 'generated-id',
      ...draft,
    })
    expect(store.getState().events).toEqual([created])
  })

  it('addEvent does not mutate its input', () => {
    const draft = createDraft()
    const originalDraft = { ...draft }
    const store = createTestStore([])

    store.getState().addEvent(draft)

    expect(draft).toEqual(originalDraft)
  })

  it('adding preserves existing events', () => {
    const existing = createEvent({ id: 'evt-001' })
    const store = createTestStore([existing])
    const created = store.getState().addEvent(createDraft({ name: 'New event' }))

    expect(store.getState().events).toEqual([existing, created])
  })

  it('updateEvent updates the expected fields', () => {
    const existing = createEvent({ id: 'evt-001' })
    const store = createTestStore([existing])
    const draft = createDraft({
      type: 'training',
      name: 'Updated training',
      startDate: '2026-06-26T13:00:00',
      endDate: '2026-06-26T15:00:00',
    })

    expect(store.getState().updateEvent('evt-001', draft)).toBe(true)
    expect(store.getState().events).toEqual([
      {
        id: 'evt-001',
        ...draft,
      },
    ])
  })

  it('updateEvent preserves the ID', () => {
    const store = createTestStore([createEvent({ id: 'evt-001' })])
    const draft = createDraft({ name: 'Renamed event' })

    store.getState().updateEvent('evt-001', draft)

    expect(store.getState().events[0]?.id).toBe('evt-001')
  })

  it('updateEvent returns false for a missing ID', () => {
    const store = createTestStore([createEvent({ id: 'evt-001' })])

    expect(store.getState().updateEvent('missing-id', createDraft())).toBe(false)
  })

  it('a missing update leaves the same logical state', () => {
    const store = createTestStore([createEvent({ id: 'evt-001' })])
    const eventsBefore = store.getState().events
    const snapshot = eventsBefore.map((event) => ({ ...event }))

    store.getState().updateEvent('missing-id', createDraft())

    expect(store.getState().events).toBe(eventsBefore)
    expect(store.getState().events).toEqual(snapshot)
  })

  it('deleteEvent removes the matching event', () => {
    const keep = createEvent({ id: 'evt-001' })
    const remove = createEvent({
      id: 'evt-002',
      name: 'Site A weekly walkthrough',
    })
    const store = createTestStore([keep, remove])

    expect(store.getState().deleteEvent('evt-002')).toBe(true)
    expect(store.getState().events).toEqual([keep])
  })

  it('deleteEvent returns false for a missing ID', () => {
    const store = createTestStore([createEvent({ id: 'evt-001' })])

    expect(store.getState().deleteEvent('missing-id')).toBe(false)
  })

  it('a missing delete leaves the same logical state', () => {
    const store = createTestStore([createEvent({ id: 'evt-001' })])
    const eventsBefore = store.getState().events
    const snapshot = eventsBefore.map((event) => ({ ...event }))

    store.getState().deleteEvent('missing-id')

    expect(store.getState().events).toBe(eventsBefore)
    expect(store.getState().events).toEqual(snapshot)
  })

  it('resetEvents restores the initial event values', () => {
    const initialEvents = [createEvent({ id: 'evt-001', name: 'Original' })]
    const store = createTestStore(initialEvents)

    initialEvents[0].name = 'Mutated input'
    store.getState().events[0].name = 'Mutated state'
    store.getState().addEvent(createDraft())
    store.getState().resetEvents()

    expect(store.getState().events).toEqual([
      createEvent({ id: 'evt-001', name: 'Original' }),
    ])
    expect(store.getState().events[0]).not.toBe(initialEvents[0])
  })

  it('store actions produce new event-array references when state changes', () => {
    const store = createTestStore([createEvent({ id: 'evt-001' })])

    const afterInit = store.getState().events
    store.getState().addEvent(createDraft())
    const afterAdd = store.getState().events
    store.getState().updateEvent('evt-001', createDraft({ name: 'Updated' }))
    const afterUpdate = store.getState().events
    store.getState().deleteEvent('generated-id')
    const afterDelete = store.getState().events
    store.getState().resetEvents()
    const afterReset = store.getState().events

    expect(afterAdd).not.toBe(afterInit)
    expect(afterUpdate).not.toBe(afterAdd)
    expect(afterDelete).not.toBe(afterUpdate)
    expect(afterReset).not.toBe(afterDelete)
  })

  it('two isolated test stores do not share state', () => {
    const first = createTestStore([createEvent({ id: 'evt-001' })], () => 'first-id')
    const second = createTestStore(
      [createEvent({ id: 'evt-002', name: 'Other event' })],
      () => 'second-id',
    )

    first.getState().addEvent(createDraft({ name: 'Only in first store' }))

    expect(first.getState().events).toHaveLength(2)
    expect(second.getState().events).toEqual([
      createEvent({ id: 'evt-002', name: 'Other event' }),
    ])
  })
})

describe('production persistence configuration', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('stores only event data', () => {
    localStorage.clear()

    const initialEvents = [createEvent({ id: 'evt-001' })]
    const store = createStore<EventState>()(
      persist(
        createEventStateCreator({
          initialEvents,
          createId: () => 'generated-id',
        }),
        {
          name: EVENT_STORAGE_KEY,
          storage: createJSONStorage(() => localStorage),
          partialize: partializeEventState,
        },
      ),
    )

    const created = store.getState().addEvent(createDraft())
    const raw = localStorage.getItem(EVENT_STORAGE_KEY)
    expect(raw).not.toBeNull()

    const parsed: unknown = JSON.parse(raw ?? 'null')
    expect(persistedStateKeys(parsed)).toEqual(['events'])
    expect(eventPersistOptions.name).toBe('ecoportal-calendar-events')
    expect(eventPersistOptions.partialize).toBe(partializeEventState)
    expect(
      partializeEventState({
        events: [created],
        addEvent() {
          throw new Error('partialize must not call actions')
        },
        updateEvent() {
          throw new Error('partialize must not call actions')
        },
        deleteEvent() {
          throw new Error('partialize must not call actions')
        },
        resetEvents() {
          throw new Error('partialize must not call actions')
        },
      }),
    ).toEqual({ events: [created] })
    expect(useEventStore.persist.getOptions().name).toBe(EVENT_STORAGE_KEY)
  })
})

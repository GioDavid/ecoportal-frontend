import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import seedEventsJson from '../data/events.json'
import type { CalendarEvent, EventDraft, EventType } from '../domain/event'

export const EVENT_STORAGE_KEY = 'ecoportal-calendar-events'

export interface EventState {
  events: CalendarEvent[]
  addEvent(draft: EventDraft): CalendarEvent
  updateEvent(id: string, draft: EventDraft): boolean
  deleteEvent(id: string): boolean
  resetEvents(): void
}

export interface CreateEventStoreOptions {
  initialEvents: CalendarEvent[]
  createId?: () => string
}

export type PersistedEventState = Pick<EventState, 'events'>

type EventSetState = (
  partial: Partial<EventState> | ((state: EventState) => Partial<EventState>),
) => void

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseEventType(value: string): EventType | undefined {
  switch (value) {
    case 'meeting':
    case 'inspection':
    case 'training':
    case 'other':
      return value
    default:
      return undefined
  }
}

function parseCalendarEvent(value: unknown): CalendarEvent | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const { id, type, name, startDate, endDate } = value
  if (
    typeof id !== 'string' ||
    typeof type !== 'string' ||
    typeof name !== 'string' ||
    typeof startDate !== 'string' ||
    typeof endDate !== 'string'
  ) {
    return undefined
  }

  const eventType = parseEventType(type)
  if (eventType === undefined) {
    return undefined
  }

  return {
    id,
    type: eventType,
    name,
    startDate,
    endDate,
  }
}

export function toCalendarEvents(value: unknown): CalendarEvent[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    const event = parseCalendarEvent(item)
    return event === undefined ? [] : [event]
  })
}

function cloneEvents(events: readonly CalendarEvent[]): CalendarEvent[] {
  return events.map((event) => ({ ...event }))
}

function createEventFromDraft(id: string, draft: EventDraft): CalendarEvent {
  return {
    id,
    type: draft.type,
    name: draft.name,
    startDate: draft.startDate,
    endDate: draft.endDate,
  }
}

export function partializeEventState(state: EventState): PersistedEventState {
  return { events: state.events }
}

export const eventPersistOptions = {
  name: EVENT_STORAGE_KEY,
  storage: createJSONStorage(() => localStorage),
  partialize: partializeEventState,
}

function createDefaultId(): string {
  return crypto.randomUUID()
}

export function createEventStateCreator(options: CreateEventStoreOptions) {
  const initialEvents = cloneEvents(options.initialEvents)
  const createId = options.createId ?? createDefaultId

  return (set: EventSetState, get: () => EventState): EventState => ({
    events: cloneEvents(initialEvents),
    addEvent(draft) {
      const created = createEventFromDraft(createId(), draft)
      set((state) => ({ events: [...state.events, created] }))
      return created
    },
    updateEvent(id, draft) {
      const { events } = get()
      if (!events.some((event) => event.id === id)) {
        return false
      }

      set({
        events: events.map((event) =>
          event.id === id ? createEventFromDraft(event.id, draft) : event,
        ),
      })
      return true
    },
    deleteEvent(id) {
      const { events } = get()
      if (!events.some((event) => event.id === id)) {
        return false
      }

      set({ events: events.filter((event) => event.id !== id) })
      return true
    },
    resetEvents() {
      set({ events: cloneEvents(initialEvents) })
    },
  })
}

export function createEventStore(options: CreateEventStoreOptions) {
  return createStore<EventState>()(createEventStateCreator(options))
}

const seedEvents = toCalendarEvents(seedEventsJson)

export const useEventStore = create<EventState>()(
  persist(createEventStateCreator({ initialEvents: seedEvents }), eventPersistOptions),
)

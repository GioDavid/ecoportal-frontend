export type EventType = 'meeting' | 'inspection' | 'training' | 'other'

export interface CalendarEvent {
  id: string
  type: EventType
  name: string
  startDate: string
  endDate: string
}

export type EventDraft = Omit<CalendarEvent, 'id'>

export type EventFormValues = Pick<
  CalendarEvent,
  'name' | 'type' | 'startDate' | 'endDate'
>

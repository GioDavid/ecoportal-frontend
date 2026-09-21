import { isAfter, isValid, parseISO } from 'date-fns'
import type { EventFormValues } from './event'

const EVENT_NAME_MAX_LENGTH = 80

export interface EventValidationErrors {
  name?: string
  type?: string
  startDate?: string
  endDate?: string
}

function parseEventDate(value: string): Date | undefined {
  const trimmed = value.trim()
  if (trimmed === '') {
    return undefined
  }

  const parsed = parseISO(trimmed)
  return isValid(parsed) ? parsed : undefined
}

export function validateEvent(values: EventFormValues): EventValidationErrors {
  const errors: EventValidationErrors = {}

  const trimmedName = values.name.trim()
  if (trimmedName === '') {
    errors.name = 'Name is required.'
  } else if (trimmedName.length > EVENT_NAME_MAX_LENGTH) {
    errors.name = `Name cannot exceed ${EVENT_NAME_MAX_LENGTH} characters.`
  }

  const trimmedStartDate = values.startDate.trim()
  const startDate = parseEventDate(values.startDate)
  if (trimmedStartDate === '') {
    errors.startDate = 'Start date is required.'
  } else if (startDate === undefined) {
    errors.startDate = 'Start date is invalid.'
  }

  const trimmedEndDate = values.endDate.trim()
  const endDate = parseEventDate(values.endDate)
  if (trimmedEndDate === '') {
    errors.endDate = 'End date is required.'
  } else if (endDate === undefined) {
    errors.endDate = 'End date is invalid.'
  } else if (startDate !== undefined && !isAfter(endDate, startDate)) {
    errors.endDate = 'End date must be later than start date.'
  }

  return errors
}

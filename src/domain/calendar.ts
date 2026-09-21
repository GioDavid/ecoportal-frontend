import {
  addDays,
  areIntervalsOverlapping,
  compareAsc,
  eachDayOfInterval,
  endOfISOWeek,
  endOfMonth,
  isAfter,
  isValid,
  parseISO,
  startOfDay,
  startOfISOWeek,
  startOfMonth,
} from 'date-fns'
import type { CalendarEvent } from './event'

function parseEventDate(value: string): Date | undefined {
  const trimmed = value.trim()
  if (trimmed === '') {
    return undefined
  }

  const parsed = parseISO(trimmed)
  return isValid(parsed) ? parsed : undefined
}

function getLocalDayInterval(day: Date): { start: Date; end: Date } {
  const start = startOfDay(day)
  return { start, end: addDays(start, 1) }
}

function getEventInterval(
  event: CalendarEvent,
): { start: Date; end: Date } | undefined {
  const start = parseEventDate(event.startDate)
  const end = parseEventDate(event.endDate)
  if (start === undefined || end === undefined || !isAfter(end, start)) {
    return undefined
  }

  return { start, end }
}

export function getMonthDays(anchorDate: Date): Date[] {
  return eachDayOfInterval({
    start: startOfISOWeek(startOfMonth(anchorDate)),
    end: endOfISOWeek(endOfMonth(anchorDate)),
  })
}

export function getWeekDays(anchorDate: Date): Date[] {
  return eachDayOfInterval({
    start: startOfISOWeek(anchorDate),
    end: endOfISOWeek(anchorDate),
  })
}

export function getEventsForDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  const dayInterval = getLocalDayInterval(day)

  return events
    .flatMap((event) => {
      const eventInterval = getEventInterval(event)
      if (
        eventInterval === undefined ||
        !areIntervalsOverlapping(eventInterval, dayInterval)
      ) {
        return []
      }

      return [{ event, start: eventInterval.start }]
    })
    .sort((left, right) => compareAsc(left.start, right.start))
    .map((item) => item.event)
}

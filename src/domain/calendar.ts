import {
  addDays,
  addHours,
  areIntervalsOverlapping,
  compareAsc,
  differenceInMinutes,
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

export interface VisibleEventInterval {
  startMinutes: number
  durationMinutes: number
  continuesBefore: boolean
  continuesAfter: boolean
}

const DEFAULT_VISIBLE_START_HOUR = 7
const DEFAULT_VISIBLE_END_HOUR = 20

function maxDate(left: Date, right: Date): Date {
  return left.getTime() >= right.getTime() ? left : right
}

function minDate(left: Date, right: Date): Date {
  return left.getTime() <= right.getTime() ? left : right
}

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

export function getVisibleEventInterval(
  event: CalendarEvent,
  day: Date,
  visibleStartHour: number = DEFAULT_VISIBLE_START_HOUR,
  visibleEndHour: number = DEFAULT_VISIBLE_END_HOUR,
): VisibleEventInterval | null {
  const eventInterval = getEventInterval(event)
  if (eventInterval === undefined) {
    return null
  }

  const dayStart = startOfDay(day)
  const dayEnd = addDays(dayStart, 1)
  const visibleStart = addHours(dayStart, visibleStartHour)
  const visibleEnd = addHours(dayStart, visibleEndHour)

  const clipStart = maxDate(
    maxDate(eventInterval.start, dayStart),
    visibleStart,
  )
  const clipEnd = minDate(
    minDate(eventInterval.end, dayEnd),
    visibleEnd,
  )

  if (clipStart.getTime() >= clipEnd.getTime()) {
    return null
  }

  const startMinutes = differenceInMinutes(clipStart, visibleStart)
  const durationMinutes = differenceInMinutes(clipEnd, clipStart)

  return {
    startMinutes,
    durationMinutes,
    continuesBefore: eventInterval.start.getTime() < clipStart.getTime(),
    continuesAfter: eventInterval.end.getTime() > clipEnd.getTime(),
  }
}

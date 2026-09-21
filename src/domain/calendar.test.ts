import { isEqual, isMonday, isSunday } from 'date-fns'
import { describe, expect, it } from 'vitest'
import {
  getEventsForDay,
  getMonthDays,
  getWeekDays,
} from './calendar'
import type { CalendarEvent } from './event'

function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(year, monthIndex, day, hours, minutes)
}

function expectSameDays(actual: Date[], expected: Date[]): void {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((day, index) => {
    expect(isEqual(day, expected[index])).toBe(true)
  })
}

function createEvent(
  overrides: Partial<CalendarEvent> &
    Pick<CalendarEvent, 'id' | 'startDate' | 'endDate'>,
): CalendarEvent {
  return {
    type: 'meeting',
    name: 'Scheduled event',
    ...overrides,
  }
}

describe('getMonthDays', () => {
  it('returns complete Monday-start weeks for June 2026', () => {
    const days = getMonthDays(localDate(2026, 5, 15, 9, 30))

    expect(days).toHaveLength(35)
    expect(isEqual(days[0], localDate(2026, 5, 1))).toBe(true)
    expect(isMonday(days[0])).toBe(true)
    expect(isEqual(days[days.length - 1], localDate(2026, 6, 5))).toBe(true)
    expect(isSunday(days[days.length - 1])).toBe(true)

    for (let index = 0; index < days.length; index += 7) {
      expect(isMonday(days[index])).toBe(true)
      expect(isSunday(days[index + 6])).toBe(true)
    }
  })

  it('returns 42 dates for a month that needs six calendar rows', () => {
    const days = getMonthDays(localDate(2026, 2, 1))

    expect(days).toHaveLength(42)
    expect(isMonday(days[0])).toBe(true)
    expect(isSunday(days[days.length - 1])).toBe(true)
    expect(isEqual(days[0], localDate(2026, 1, 23))).toBe(true)
    expect(isEqual(days[days.length - 1], localDate(2026, 3, 5))).toBe(true)
  })

  it('starts on Monday and ends on Sunday', () => {
    const days = getMonthDays(localDate(2026, 8, 10))

    expect(isMonday(days[0])).toBe(true)
    expect(isSunday(days[days.length - 1])).toBe(true)
  })

  it('does not mutate the anchor date', () => {
    const anchorDate = localDate(2026, 5, 15, 12, 30)
    const originalTime = anchorDate.getTime()

    getMonthDays(anchorDate)

    expect(anchorDate.getTime()).toBe(originalTime)
  })
})

describe('getWeekDays', () => {
  it('returns Monday June 22 through Sunday June 28 for Wednesday June 24, 2026', () => {
    const days = getWeekDays(localDate(2026, 5, 24, 15, 45))

    expect(days).toHaveLength(7)
    expectSameDays(
      days,
      [22, 23, 24, 25, 26, 27, 28].map((day) => localDate(2026, 5, day)),
    )
  })

  it('returns the preceding Monday through a Sunday anchor', () => {
    const days = getWeekDays(localDate(2026, 5, 28, 23, 15))

    expect(days).toHaveLength(7)
    expectSameDays(
      days,
      [22, 23, 24, 25, 26, 27, 28].map((day) => localDate(2026, 5, day)),
    )
  })

  it('returns a week that crosses a month and year boundary', () => {
    const days = getWeekDays(localDate(2026, 0, 1, 8, 0))

    expect(days).toHaveLength(7)
    expectSameDays(days, [
      localDate(2025, 11, 29),
      localDate(2025, 11, 30),
      localDate(2025, 11, 31),
      localDate(2026, 0, 1),
      localDate(2026, 0, 2),
      localDate(2026, 0, 3),
      localDate(2026, 0, 4),
    ])
  })

  it('does not mutate the anchor date', () => {
    const anchorDate = localDate(2026, 5, 24, 16, 5)
    const originalTime = anchorDate.getTime()

    getWeekDays(anchorDate)

    expect(anchorDate.getTime()).toBe(originalTime)
  })
})

describe('getEventsForDay', () => {
  const selectedDay = localDate(2026, 5, 24, 12, 0)

  it('includes an event occurring during the selected day', () => {
    const event = createEvent({
      id: 'same-day',
      startDate: '2026-06-24T09:00',
      endDate: '2026-06-24T10:00',
    })

    expect(getEventsForDay([event], selectedDay)).toEqual([event])
  })

  it('excludes an event from a different day', () => {
    const event = createEvent({
      id: 'other-day',
      startDate: '2026-06-23T09:00',
      endDate: '2026-06-23T10:00',
    })

    expect(getEventsForDay([event], selectedDay)).toEqual([])
  })

  it('returns multiple events in chronological order', () => {
    const later = createEvent({
      id: 'later',
      name: 'Afternoon review',
      startDate: '2026-06-24T14:00',
      endDate: '2026-06-24T15:00',
    })
    const earlier = createEvent({
      id: 'earlier',
      name: 'Morning standup',
      startDate: '2026-06-24T09:00',
      endDate: '2026-06-24T09:30',
    })

    expect(getEventsForDay([later, earlier], selectedDay)).toEqual([
      earlier,
      later,
    ])
  })

  it('includes an overnight event on both affected days', () => {
    const overnight = createEvent({
      id: 'overnight',
      type: 'inspection',
      name: 'Night inspection',
      startDate: '2026-06-24T22:00',
      endDate: '2026-06-25T02:00',
    })

    expect(getEventsForDay([overnight], localDate(2026, 5, 24))).toEqual([
      overnight,
    ])
    expect(getEventsForDay([overnight], localDate(2026, 5, 25))).toEqual([
      overnight,
    ])
    expect(getEventsForDay([overnight], localDate(2026, 5, 26))).toEqual([])
  })

  it('excludes an overnight event from the day after its exact midnight end', () => {
    const endingAtMidnight = createEvent({
      id: 'midnight-end',
      startDate: '2026-06-24T22:00',
      endDate: '2026-06-25T00:00',
    })

    expect(getEventsForDay([endingAtMidnight], localDate(2026, 5, 24))).toEqual(
      [endingAtMidnight],
    )
    expect(getEventsForDay([endingAtMidnight], localDate(2026, 5, 25))).toEqual(
      [],
    )
  })

  it('includes an event spanning an entire selected day', () => {
    const spanning = createEvent({
      id: 'spanning',
      type: 'training',
      name: 'Multi-day training',
      startDate: '2026-06-23T08:00',
      endDate: '2026-06-25T18:00',
    })

    expect(getEventsForDay([spanning], selectedDay)).toEqual([spanning])
  })

  it('ignores invalid dates without throwing', () => {
    const valid = createEvent({
      id: 'valid',
      startDate: '2026-06-24T11:00',
      endDate: '2026-06-24T12:00',
    })
    const invalid = createEvent({
      id: 'invalid',
      startDate: 'not-a-date',
      endDate: 'also-not-a-date',
    })
    const inverted = createEvent({
      id: 'inverted',
      startDate: '2026-06-24T12:00',
      endDate: '2026-06-24T11:00',
    })

    expect(() =>
      getEventsForDay([invalid, inverted, valid], selectedDay),
    ).not.toThrow()
    expect(getEventsForDay([invalid, inverted, valid], selectedDay)).toEqual([
      valid,
    ])
  })

  it('does not mutate the source array', () => {
    const first = createEvent({
      id: 'first',
      startDate: '2026-06-24T16:00',
      endDate: '2026-06-24T17:00',
    })
    const second = createEvent({
      id: 'second',
      startDate: '2026-06-24T08:00',
      endDate: '2026-06-24T09:00',
    })
    const events = [first, second]
    const originalEvents = [...events]
    const originalFirst = { ...first }
    const originalSecond = { ...second }

    getEventsForDay(events, selectedDay)

    expect(events).toEqual(originalEvents)
    expect(events[0]).toBe(first)
    expect(events[1]).toBe(second)
    expect(first).toEqual(originalFirst)
    expect(second).toEqual(originalSecond)
  })
})

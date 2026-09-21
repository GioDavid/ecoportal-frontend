import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, isEqual, parseISO } from 'date-fns'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '../../domain/event'
import {
  WEEK_VIEW_HOUR_HEIGHT_PX,
  WeekView,
  type WeekViewProps,
} from './WeekView'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
  },
})

function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(year, monthIndex, day, hours, minutes)
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

function eventButtonName(event: CalendarEvent): string {
  const startTime = format(parseISO(event.startDate), 'h:mm a')
  const endTime = format(parseISO(event.endDate), 'h:mm a')
  return `${event.name}, ${startTime} to ${endTime}`
}

function renderWeekView(ui: ReactElement): ReturnType<typeof render> {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

function renderJuneWeek(overrides: Partial<WeekViewProps> = {}): {
  onSlotSelect: ReturnType<typeof vi.fn<WeekViewProps['onSlotSelect']>>
  onEventSelect: ReturnType<typeof vi.fn<WeekViewProps['onEventSelect']>>
  anchorDate: Date
  events: CalendarEvent[]
} {
  const onSlotSelect = vi.fn<WeekViewProps['onSlotSelect']>()
  const onEventSelect = vi.fn<WeekViewProps['onEventSelect']>()
  const anchorDate = overrides.anchorDate ?? localDate(2026, 5, 24)
  const events = overrides.events ?? []

  renderWeekView(
    <WeekView
      anchorDate={anchorDate}
      events={events}
      onSlotSelect={overrides.onSlotSelect ?? onSlotSelect}
      onEventSelect={overrides.onEventSelect ?? onEventSelect}
    />,
  )

  return { onSlotSelect, onEventSelect, anchorDate, events }
}

describe('WeekView', () => {
  it('describes the expected week in the region name', () => {
    renderJuneWeek()

    expect(
      screen.getByRole('region', { name: 'Week of June 22, 2026' }),
    ).toBeInTheDocument()
  })

  it('renders Monday through Sunday headers', () => {
    renderJuneWeek()

    const weekdayLabels = screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/)
    expect(weekdayLabels.map((label) => label.textContent)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
  })

  it('renders exactly 91 slot buttons', () => {
    renderJuneWeek()

    expect(
      screen.getAllByRole('button', { name: /Create event on .+ at / }),
    ).toHaveLength(91)
  })

  it('uses correct accessible names for the first and last slots', () => {
    renderJuneWeek()

    expect(
      screen.getByRole('button', {
        name: 'Create event on June 22, 2026 at 7:00 AM',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Create event on June 28, 2026 at 7:00 PM',
      }),
    ).toBeInTheDocument()
  })

  it('returns the exact expected local date when a slot is clicked', async () => {
    const user = userEvent.setup()
    const { onSlotSelect } = renderJuneWeek()

    await user.click(
      screen.getByRole('button', {
        name: 'Create event on June 24, 2026 at 10:00 AM',
      }),
    )

    expect(onSlotSelect).toHaveBeenCalledTimes(1)
    const selected = onSlotSelect.mock.calls[0]?.[0]
    expect(selected).toBeInstanceOf(Date)
    if (!(selected instanceof Date)) {
      throw new Error('Expected onSlotSelect to be called with a Date')
    }
    expect(selected.getFullYear()).toBe(2026)
    expect(selected.getMonth()).toBe(5)
    expect(selected.getDate()).toBe(24)
    expect(selected.getHours()).toBe(10)
    expect(selected.getMinutes()).toBe(0)
    expect(selected.getSeconds()).toBe(0)
  })

  it('renders events in the corresponding day column', () => {
    const mondayEvent = createEvent({
      id: 'monday',
      name: 'Monday briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T10:00:00',
    })
    const wednesdayEvent = createEvent({
      id: 'wednesday',
      name: 'Wednesday walkthrough',
      startDate: '2026-06-24T14:00:00',
      endDate: '2026-06-24T15:00:00',
    })

    renderJuneWeek({ events: [mondayEvent, wednesdayEvent] })

    const week = screen.getByRole('region', { name: 'Week of June 22, 2026' })
    const mondayColumn = screen.getByText('Mon').parentElement?.parentElement
    const wednesdayColumn = screen.getByText('Wed').parentElement?.parentElement

    expect(mondayColumn).not.toBeNull()
    expect(wednesdayColumn).not.toBeNull()

    expect(
      within(mondayColumn as HTMLElement).getByRole('button', {
        name: eventButtonName(mondayEvent),
      }),
    ).toBeInTheDocument()
    expect(
      within(wednesdayColumn as HTMLElement).getByRole('button', {
        name: eventButtonName(wednesdayEvent),
      }),
    ).toBeInTheDocument()
    expect(week).toContainElement(
      screen.getByRole('button', { name: eventButtonName(mondayEvent) }),
    )
  })

  it('does not render an event outside the visible hours', () => {
    const earlyEvent = createEvent({
      id: 'early',
      name: 'Early shift',
      startDate: '2026-06-24T05:00:00',
      endDate: '2026-06-24T06:30:00',
    })

    renderJuneWeek({ events: [earlyEvent] })

    expect(
      screen.queryByRole('button', { name: eventButtonName(earlyEvent) }),
    ).not.toBeInTheDocument()
  })

  it('renders a partially visible event', () => {
    const partialEvent = createEvent({
      id: 'partial',
      name: 'Late wrap-up',
      startDate: '2026-06-24T19:30:00',
      endDate: '2026-06-24T20:30:00',
    })

    renderJuneWeek({ events: [partialEvent] })

    const eventButton = screen.getByRole('button', {
      name: eventButtonName(partialEvent),
    })

    expect(eventButton).toHaveStyle({
      top: `${(750 / 60) * WEEK_VIEW_HOUR_HEIGHT_PX}px`,
      height: `${(30 / 60) * WEEK_VIEW_HOUR_HEIGHT_PX}px`,
    })
  })

  it('calls onEventSelect when an event is clicked', async () => {
    const user = userEvent.setup()
    const event = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })
    const { onEventSelect } = renderJuneWeek({ events: [event] })

    await user.click(
      screen.getByRole('button', { name: eventButtonName(event) }),
    )

    expect(onEventSelect).toHaveBeenCalledTimes(1)
    expect(onEventSelect).toHaveBeenCalledWith(event)
  })

  it('does not call onSlotSelect when an event is clicked', async () => {
    const user = userEvent.setup()
    const event = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })
    const { onSlotSelect } = renderJuneWeek({ events: [event] })

    await user.click(
      screen.getByRole('button', { name: eventButtonName(event) }),
    )

    expect(onSlotSelect).not.toHaveBeenCalled()
  })

  it('includes original event times in the accessible name', () => {
    const event = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })

    renderJuneWeek({ events: [event] })

    const eventButton = screen.getByRole('button', {
      name: eventButtonName(event),
    })

    expect(eventButton).toHaveAccessibleName(/Weekly safety briefing/)
    expect(eventButton).toHaveAccessibleName(/9:00 AM/)
    expect(eventButton).toHaveAccessibleName(/9:30 AM/)
  })

  it('marks today with aria-current="date" in the day header', () => {
    vi.useFakeTimers({ now: localDate(2026, 5, 24) })

    try {
      renderJuneWeek({ anchorDate: localDate(2026, 5, 24) })

      const wednesdayHeader = screen.getByText('Wed')
      expect(wednesdayHeader).toHaveAttribute('aria-current', 'date')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not mutate events or the anchor date', () => {
    const events = [
      createEvent({
        id: 'evt-001',
        name: 'Weekly safety briefing',
        startDate: '2026-06-22T09:00:00',
        endDate: '2026-06-22T09:30:00',
      }),
    ]
    const originalEvents = events.map((event) => ({ ...event }))
    const anchorDate = localDate(2026, 5, 24)
    const originalAnchorTime = anchorDate.getTime()

    renderJuneWeek({ events, anchorDate })

    expect(events).toEqual(originalEvents)
    expect(isEqual(anchorDate, new Date(originalAnchorTime))).toBe(true)
  })
})

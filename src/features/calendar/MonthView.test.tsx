import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, isEqual, isSameDay, parseISO } from 'date-fns'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '../../domain/event'
import { MonthView, type MonthViewProps } from './MonthView'

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
  },
})

function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day)
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

function renderMonthView(ui: ReactElement): ReturnType<typeof render> {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

function renderJuneView(overrides: Partial<MonthViewProps> = {}): {
  onDaySelect: ReturnType<typeof vi.fn<MonthViewProps['onDaySelect']>>
  onEventSelect: ReturnType<typeof vi.fn<MonthViewProps['onEventSelect']>>
  anchorDate: Date
  events: CalendarEvent[]
} {
  const onDaySelect = vi.fn<MonthViewProps['onDaySelect']>()
  const onEventSelect = vi.fn<MonthViewProps['onEventSelect']>()
  const anchorDate = overrides.anchorDate ?? localDate(2026, 5, 15)
  const events = overrides.events ?? []

  renderMonthView(
    <MonthView
      anchorDate={anchorDate}
      events={events}
      onDaySelect={overrides.onDaySelect ?? onDaySelect}
      onEventSelect={overrides.onEventSelect ?? onEventSelect}
    />,
  )

  return { onDaySelect, onEventSelect, anchorDate, events }
}

describe('MonthView', () => {
  it('renders Monday through Sunday in order', () => {
    renderJuneView()

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

  it('renders the expected number of day buttons for June 2026', () => {
    renderJuneView()

    expect(
      screen.getAllByRole('button', { name: /Create event on / }),
    ).toHaveLength(35)
  })

  it('has the correct accessible month name', () => {
    renderJuneView()

    expect(
      screen.getByRole('region', { name: 'Month of June 2026' }),
    ).toBeInTheDocument()
  })

  it('renders events on their corresponding dates', () => {
    const briefing = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })
    const walkthrough = createEvent({
      id: 'evt-002',
      name: 'Site A weekly walkthrough',
      startDate: '2026-06-23T14:30:00',
      endDate: '2026-06-23T15:30:00',
    })

    renderJuneView({ events: [briefing, walkthrough] })

    expect(
      screen.getByRole('button', { name: 'Create event on June 22, 2026' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create event on June 23, 2026' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: eventButtonName(briefing) }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: eventButtonName(walkthrough) }),
    ).toBeInTheDocument()
  })

  it('displays events chronologically', () => {
    const later = createEvent({
      id: 'later',
      name: 'Afternoon review',
      startDate: '2026-06-24T14:00:00',
      endDate: '2026-06-24T15:00:00',
    })
    const earlier = createEvent({
      id: 'earlier',
      name: 'Morning standup',
      startDate: '2026-06-24T09:00:00',
      endDate: '2026-06-24T09:30:00',
    })

    renderJuneView({ events: [later, earlier] })

    const eventButtons = screen.getAllByRole('button', {
      name: /Morning standup|Afternoon review/,
    })

    expect(eventButtons.map((button) => button.getAttribute('aria-label'))).toEqual(
      [eventButtonName(earlier), eventButtonName(later)],
    )
  })

  it('invokes onDaySelect with the expected date when a day is clicked', async () => {
    const user = userEvent.setup()
    const { onDaySelect } = renderJuneView()

    await user.click(
      screen.getByRole('button', { name: 'Create event on June 22, 2026' }),
    )

    expect(onDaySelect).toHaveBeenCalledTimes(1)
    const selectedDate = onDaySelect.mock.calls[0]?.[0]
    expect(selectedDate).toBeInstanceOf(Date)
    if (!(selectedDate instanceof Date)) {
      throw new Error('Expected onDaySelect to be called with a Date')
    }
    expect(isSameDay(selectedDate, localDate(2026, 5, 22))).toBe(true)
  })

  it('invokes onEventSelect when an event is clicked', async () => {
    const user = userEvent.setup()
    const event = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })
    const { onEventSelect } = renderJuneView({ events: [event] })

    await user.click(
      screen.getByRole('button', { name: eventButtonName(event) }),
    )

    expect(onEventSelect).toHaveBeenCalledTimes(1)
    expect(onEventSelect).toHaveBeenCalledWith(event)
  })

  it('does not invoke onDaySelect when an event is clicked', async () => {
    const user = userEvent.setup()
    const event = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })
    const { onDaySelect } = renderJuneView({ events: [event] })

    await user.click(
      screen.getByRole('button', { name: eventButtonName(event) }),
    )

    expect(onDaySelect).not.toHaveBeenCalled()
  })

  it('shows only three events and "+2 more" when a day has five events', () => {
    const events = [
      createEvent({
        id: 'one',
        name: 'First event',
        startDate: '2026-06-22T08:00:00',
        endDate: '2026-06-22T08:30:00',
      }),
      createEvent({
        id: 'two',
        name: 'Second event',
        startDate: '2026-06-22T09:00:00',
        endDate: '2026-06-22T09:30:00',
      }),
      createEvent({
        id: 'three',
        name: 'Third event',
        startDate: '2026-06-22T10:00:00',
        endDate: '2026-06-22T10:30:00',
      }),
      createEvent({
        id: 'four',
        name: 'Fourth event',
        startDate: '2026-06-22T11:00:00',
        endDate: '2026-06-22T11:30:00',
      }),
      createEvent({
        id: 'five',
        name: 'Fifth event',
        startDate: '2026-06-22T12:00:00',
        endDate: '2026-06-22T12:30:00',
      }),
    ]

    renderJuneView({ events })

    expect(
      screen.getByRole('button', { name: /First event/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Second event/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Third event/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Fourth event/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Fifth event/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('includes an identifiable day outside the anchor month', () => {
    renderJuneView()

    const outsideDay = screen.getByRole('button', {
      name: 'Create event on July 5, 2026',
    })
    const month = screen.getByRole('region', { name: 'Month of June 2026' })

    expect(outsideDay).toBeInTheDocument()
    expect(month).toContainElement(outsideDay)
  })

  it('gives event buttons descriptive accessible names', () => {
    const event = createEvent({
      id: 'evt-001',
      name: 'Weekly safety briefing',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T09:30:00',
    })

    renderJuneView({ events: [event] })

    const eventButton = screen.getByRole('button', {
      name: eventButtonName(event),
    })

    expect(eventButton).toHaveAccessibleName(/Weekly safety briefing/)
    expect(eventButton).toHaveAccessibleName(/9:00 AM/)
    expect(eventButton).toHaveAccessibleName(/9:30 AM/)
  })

  it('does not mutate source events or the anchor date', () => {
    const events = [
      createEvent({
        id: 'evt-001',
        name: 'Weekly safety briefing',
        startDate: '2026-06-22T09:00:00',
        endDate: '2026-06-22T09:30:00',
      }),
    ]
    const originalEvents = events.map((event) => ({ ...event }))
    const anchorDate = localDate(2026, 5, 15)
    const originalAnchorTime = anchorDate.getTime()

    renderJuneView({ events, anchorDate })

    expect(events).toEqual(originalEvents)
    expect(isEqual(anchorDate, new Date(originalAnchorTime))).toBe(true)
  })

  it('marks the current local day', () => {
    vi.useFakeTimers({ now: localDate(2026, 5, 15) })

    try {
      renderJuneView({ anchorDate: localDate(2026, 5, 15) })

      expect(
        screen.getByRole('button', { name: 'Create event on June 15, 2026' }),
      ).toHaveAttribute('aria-current', 'date')
    } finally {
      vi.useRealTimers()
    }
  })
})

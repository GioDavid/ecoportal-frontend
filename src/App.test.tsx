import { CssBaseline, ThemeProvider } from '@mui/material'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format, parseISO } from 'date-fns'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import seedEventsJson from './data/events.json'
import type { CalendarEvent } from './domain/event'
import App from './App'
import { appTheme } from './app/theme'
import {
  EVENT_STORAGE_KEY,
  toCalendarEvents,
  useEventStore,
} from './store/event-store'

function localDate(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0,
): Date {
  return new Date(year, monthIndex, day, hours, minutes)
}

function eventButtonName(event: CalendarEvent): string {
  const startTime = format(parseISO(event.startDate), 'h:mm a')
  const endTime = format(parseISO(event.endDate), 'h:mm a')
  return `${event.name}, ${startTime} to ${endTime}`
}

function seedEvents(): CalendarEvent[] {
  return toCalendarEvents(seedEventsJson)
}

function resetEventStore(): void {
  localStorage.clear()
  useEventStore.persist.clearStorage()
  useEventStore.setState({ events: seedEvents() })
}

function renderApp(): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>,
  )
}

function user(): ReturnType<typeof userEvent.setup> {
  return userEvent.setup({ pointerEventsCheck: 0 })
}

function createDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Create event' })
}

function editDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Edit event' })
}

function deleteDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'Delete event?' })
}

describe('App integration', () => {
  beforeEach(() => {
    resetEventStore()
  })

  afterEach(() => {
    localStorage.clear()
    useEventStore.persist.clearStorage()
    vi.useRealTimers()
  })

  describe('initial rendering', () => {
    it('starts in month view', () => {
      renderApp()

      expect(screen.getByRole('region', { name: 'Month of June 2026' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Month view' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('displays June 2026 from the initial anchor date', () => {
      renderApp()

      expect(screen.getByRole('heading', { level: 2, name: 'June 2026' })).toBeInTheDocument()
    })

    it('shows supplied events', () => {
      renderApp()

      expect(
        screen.getByRole('button', {
          name: eventButtonName(seedEvents()[0]),
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', {
          name: eventButtonName(seedEvents()[1]),
        }),
      ).toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('moves to May 2026 with previous in month view', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'Previous month' }))

      expect(screen.getByRole('heading', { level: 2, name: 'May 2026' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Month of May 2026' })).toBeInTheDocument()
    })

    it('moves to July 2026 with next in month view', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'Next month' }))

      expect(screen.getByRole('heading', { level: 2, name: 'July 2026' })).toBeInTheDocument()
    })

    it('preserves the anchor date when switching to week view', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'Week view' }))

      expect(screen.getByRole('heading', { level: 2, name: 'Jun 22–28, 2026' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Week of June 22, 2026' })).toBeInTheDocument()
    })

    it('moves exactly one week with previous and next in week view', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'Week view' }))
      await interaction.click(screen.getByRole('button', { name: 'Previous week' }))

      expect(screen.getByRole('heading', { level: 2, name: 'Jun 15–21, 2026' })).toBeInTheDocument()

      await interaction.click(screen.getByRole('button', { name: 'Next week' }))

      expect(screen.getByRole('heading', { level: 2, name: 'Jun 22–28, 2026' })).toBeInTheDocument()
    })

    it('moves to the current local period with Today', () => {
      vi.useFakeTimers({ now: localDate(2026, 5, 15, 10, 30) })

      try {
        renderApp()
        fireEvent.click(screen.getByRole('button', { name: 'Today' }))

        expect(screen.getByRole('heading', { level: 2, name: 'June 2026' })).toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('exposes the selected view state accessibly', async () => {
      const interaction = user()
      renderApp()

      const monthView = screen.getByRole('button', { name: 'Month view' })
      const weekView = screen.getByRole('button', { name: 'Week view' })

      expect(monthView).toHaveAttribute('aria-pressed', 'true')
      expect(weekView).toHaveAttribute('aria-pressed', 'false')

      await interaction.click(weekView)

      expect(monthView).toHaveAttribute('aria-pressed', 'false')
      expect(weekView).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('create', () => {
    it('opens create mode at 09:00 when a month day is selected', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(
        screen.getByRole('button', { name: 'Create event on June 23, 2026' }),
      )

      expect(screen.getByRole('heading', { name: 'Create event' })).toBeInTheDocument()
      expect(screen.getByLabelText('Start date and time')).toHaveValue(
        '2026-06-23T09:00',
      )
    })

    it('opens create mode with the selected week slot hour', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'Week view' }))
      await interaction.click(
        screen.getByRole('button', {
          name: 'Create event on June 24, 2026 at 10:00 AM',
        }),
      )

      expect(screen.getByLabelText('Start date and time')).toHaveValue(
        '2026-06-24T10:00',
      )
      expect(screen.getByLabelText('End date and time')).toHaveValue(
        '2026-06-24T11:00',
      )
    })

    it('opens create mode from New event using the anchor date', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'New event' }))

      expect(screen.getByLabelText('Start date and time')).toHaveValue(
        '2026-06-22T09:00',
      )
    })

    it('displays a newly created event after a valid save', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'New event' }))
      await interaction.type(screen.getByLabelText('Event name'), 'Added integration event')
      fireEvent.click(
        within(createDialog()).getByRole('button', { name: 'Create event' }),
      )

      await waitFor(() => {
        expect(useEventStore.getState().events).toHaveLength(5)
      })
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Added integration event/ }),
        ).toBeInTheDocument()
      })
    })

    it('does not mutate the store on invalid create', async () => {
      const interaction = user()
      renderApp()
      const beforeCount = useEventStore.getState().events.length

      await interaction.click(screen.getByRole('button', { name: 'New event' }))
      await interaction.click(
        within(createDialog()).getByRole('button', { name: 'Create event' }),
      )

      expect(screen.getByText('Name is required.')).toBeInTheDocument()
      expect(useEventStore.getState().events).toHaveLength(beforeCount)
    })
  })

  describe('edit', () => {
    it('opens edit mode when an existing event is selected', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))

      expect(screen.getByRole('heading', { name: 'Edit event' })).toBeInTheDocument()
      expect(screen.getByLabelText('Event name')).toHaveValue(event.name)
    })

    it('updates the visible event after saving an edited name', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))
      const nameField = screen.getByLabelText('Event name')
      await interaction.clear(nameField)
      await interaction.type(nameField, 'Updated briefing name')
      fireEvent.click(
        within(editDialog()).getByRole('button', { name: 'Save changes' }),
      )

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Updated briefing name/ }),
        ).toBeInTheDocument()
      })
      expect(
        screen.queryByRole('button', { name: eventButtonName(event) }),
      ).not.toBeInTheDocument()
    })

    it('preserves the event ID when saving edits', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))
      const nameField = screen.getByLabelText('Event name')
      await interaction.clear(nameField)
      await interaction.type(nameField, 'ID preserved event')
      await interaction.click(
        within(editDialog()).getByRole('button', { name: 'Save changes' }),
      )

      const updated = useEventStore
        .getState()
        .events.find((storedEvent) => storedEvent.id === event.id)

      expect(updated?.name).toBe('ID preserved event')
    })
  })

  describe('delete', () => {
    it('opens only the delete confirmation after a delete request', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))
      await interaction.click(within(editDialog()).getByRole('button', { name: 'Delete' }))

      expect(
        screen.getByRole('heading', { name: 'Delete event?' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Edit event' })).not.toBeInTheDocument()
    })

    it('restores the edit dialog and keeps the event when deletion is cancelled', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))
      await interaction.click(within(editDialog()).getByRole('button', { name: 'Delete' }))
      fireEvent.click(within(deleteDialog()).getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit event' })).toBeInTheDocument()
      })
      expect(
        useEventStore.getState().events.some((storedEvent) => storedEvent.id === event.id),
      ).toBe(true)
    })

    it('removes the event when deletion is confirmed', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))
      await interaction.click(within(editDialog()).getByRole('button', { name: 'Delete' }))
      await interaction.click(within(deleteDialog()).getByRole('button', { name: 'Delete' }))

      expect(
        useEventStore.getState().events.some((storedEvent) => storedEvent.id === event.id),
      ).toBe(false)
      expect(screen.queryByRole('heading', { name: 'Edit event' })).not.toBeInTheDocument()
    })

    it('does not delete before explicit confirmation', async () => {
      const interaction = user()
      const event = seedEvents()[0]
      renderApp()

      await interaction.click(screen.getByRole('button', { name: eventButtonName(event) }))
      await interaction.click(within(editDialog()).getByRole('button', { name: 'Delete' }))

      expect(
        useEventStore.getState().events.some((storedEvent) => storedEvent.id === event.id),
      ).toBe(true)
    })
  })

  describe('persistence', () => {
    it('writes production store mutations to localStorage', async () => {
      const interaction = user()
      renderApp()

      await interaction.click(screen.getByRole('button', { name: 'New event' }))
      await interaction.type(screen.getByLabelText('Event name'), 'Persisted from App')
      fireEvent.click(
        within(createDialog()).getByRole('button', { name: 'Create event' }),
      )

      await waitFor(() => {
        const raw = localStorage.getItem(EVENT_STORAGE_KEY)
        expect(raw).not.toBeNull()
        expect(raw).toContain('Persisted from App')
      })
    })
  })
})

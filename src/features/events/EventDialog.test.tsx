import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '../../domain/event'
import { EventDialog, type EventDialogProps } from './EventDialog'

const theme = createTheme()

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

function renderEventDialog(
  props: Partial<EventDialogProps> & Pick<EventDialogProps, 'open'>,
): {
  onClose: ReturnType<typeof vi.fn<EventDialogProps['onClose']>>
  onSave: ReturnType<typeof vi.fn<EventDialogProps['onSave']>>
  onDeleteRequest: ReturnType<typeof vi.fn<NonNullable<EventDialogProps['onDeleteRequest']>>>
  rerender: (nextProps: Partial<EventDialogProps> & Pick<EventDialogProps, 'open'>) => void
} {
  const onClose = vi.fn<EventDialogProps['onClose']>()
  const onSave = vi.fn<EventDialogProps['onSave']>()
  const onDeleteRequest = vi.fn<NonNullable<EventDialogProps['onDeleteRequest']>>()

  function renderWith(nextProps: Partial<EventDialogProps> & Pick<EventDialogProps, 'open'>) {
    return render(
      <ThemeProvider theme={theme}>
        <EventDialog
          open={nextProps.open}
          event={nextProps.event}
          initialDate={nextProps.initialDate}
          onClose={nextProps.onClose ?? onClose}
          onSave={nextProps.onSave ?? onSave}
          onDeleteRequest={nextProps.onDeleteRequest ?? onDeleteRequest}
        />
      </ThemeProvider>,
    )
  }

  const view = renderWith(props)

  return {
    onClose,
    onSave,
    onDeleteRequest,
    rerender: (nextProps) => {
      view.rerender(
        <ThemeProvider theme={theme}>
          <EventDialog
            open={nextProps.open}
            event={nextProps.event}
            initialDate={nextProps.initialDate}
            onClose={nextProps.onClose ?? onClose}
            onSave={nextProps.onSave ?? onSave}
            onDeleteRequest={nextProps.onDeleteRequest ?? onDeleteRequest}
          />
        </ThemeProvider>,
      )
    },
  }
}

describe('EventDialog', () => {
  it('shows create mode title and primary action', () => {
    renderEventDialog({ open: true })

    expect(
      screen.getByRole('heading', { name: 'Create event' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create event' }),
    ).toBeInTheDocument()
  })

  it('shows edit mode title and populated fields', () => {
    const event = createEvent({
      id: 'evt-001',
      type: 'inspection',
      name: 'Site inspection',
      startDate: '2026-06-24T14:30:00',
      endDate: '2026-06-24T15:30:00',
    })

    renderEventDialog({ open: true, event })

    expect(screen.getByRole('heading', { name: 'Edit event' })).toBeInTheDocument()
    expect(screen.getByLabelText('Event name')).toHaveValue('Site inspection')
    expect(screen.getByRole('combobox', { name: 'Event type' })).toHaveTextContent(
      'Inspection',
    )
    expect(screen.getByLabelText('Start date and time')).toHaveValue(
      '2026-06-24T14:30',
    )
    expect(screen.getByLabelText('End date and time')).toHaveValue(
      '2026-06-24T15:30',
    )
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeInTheDocument()
  })

  it('defaults midnight selection to 09:00–10:00 in create mode', () => {
    renderEventDialog({
      open: true,
      initialDate: localDate(2026, 5, 22),
    })

    expect(screen.getByLabelText('Start date and time')).toHaveValue(
      '2026-06-22T09:00',
    )
    expect(screen.getByLabelText('End date and time')).toHaveValue(
      '2026-06-22T10:00',
    )
  })

  it('preserves an hourly slot selection in create mode', () => {
    renderEventDialog({
      open: true,
      initialDate: localDate(2026, 5, 22, 14, 0),
    })

    expect(screen.getByLabelText('Start date and time')).toHaveValue(
      '2026-06-22T14:00',
    )
    expect(screen.getByLabelText('End date and time')).toHaveValue(
      '2026-06-22T15:00',
    )
  })

  it('uses the current local date at 09:00 when initialDate is missing', () => {
    vi.useFakeTimers({ now: localDate(2026, 5, 18, 16, 45) })

    try {
      renderEventDialog({ open: true })

      expect(screen.getByLabelText('Start date and time')).toHaveValue(
        '2026-06-18T09:00',
      )
      expect(screen.getByLabelText('End date and time')).toHaveValue(
        '2026-06-18T10:00',
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('calls onSave with a trimmed draft on valid create', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEventDialog({
      open: true,
      initialDate: localDate(2026, 5, 22, 9, 0),
    })

    await user.type(screen.getByLabelText('Event name'), '  New briefing  ')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      name: 'New briefing',
      type: 'meeting',
      startDate: '2026-06-22T09:00',
      endDate: '2026-06-22T10:00',
    })
  })

  it('calls onSave without an id on valid edit', async () => {
    const user = userEvent.setup()
    const event = createEvent({ id: 'evt-001', name: 'Weekly safety briefing' })
    const { onSave } = renderEventDialog({ open: true, event })

    await user.clear(screen.getByLabelText('Event name'))
    await user.type(screen.getByLabelText('Event name'), 'Updated briefing')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const draft = onSave.mock.calls[0]?.[0]
    expect(draft).toEqual({
      name: 'Updated briefing',
      type: 'meeting',
      startDate: '2026-06-22T09:00',
      endDate: '2026-06-22T09:30',
    })
    expect(draft).not.toHaveProperty('id')
  })

  it('blocks save and shows an error for an empty name', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEventDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(screen.getByText('Name is required.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('blocks save for a name longer than 80 characters', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEventDialog({ open: true })

    await user.type(screen.getByLabelText('Event name'), 'a'.repeat(81))
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(
      screen.getByText('Name cannot exceed 80 characters.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('blocks save and shows an error for a reversed date range', async () => {
    const user = userEvent.setup()
    const { onSave } = renderEventDialog({
      open: true,
      initialDate: localDate(2026, 5, 22, 9, 0),
    })

    await user.type(screen.getByLabelText('Event name'), 'Invalid range')
    await user.clear(screen.getByLabelText('End date and time'))
    await user.type(screen.getByLabelText('End date and time'), '2026-06-22T08:00')
    await user.click(screen.getByRole('button', { name: 'Create event' }))

    expect(
      screen.getByText('End date must be later than start date.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('clears a field error when that field changes', async () => {
    const user = userEvent.setup()
    renderEventDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'Create event' }))
    expect(screen.getByText('Name is required.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Event name'), 'Briefing')

    expect(screen.queryByText('Name is required.')).not.toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderEventDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onDeleteRequest in edit mode when delete is clicked', async () => {
    const user = userEvent.setup()
    const { onDeleteRequest } = renderEventDialog({
      open: true,
      event: createEvent({ id: 'evt-001' }),
    })

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDeleteRequest).toHaveBeenCalledTimes(1)
  })

  it('does not render delete in create mode', () => {
    renderEventDialog({ open: true })

    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('resets stale edited values when reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = renderEventDialog({
      open: true,
      initialDate: localDate(2026, 5, 22, 9, 0),
    })

    await user.type(screen.getByLabelText('Event name'), 'Stale value')
    rerender({ open: false })
    rerender({ open: true, initialDate: localDate(2026, 5, 22, 9, 0) })

    expect(screen.getByLabelText('Event name')).toHaveValue('')
  })

  it('resets when a different event is supplied while open', () => {
    const first = createEvent({
      id: 'evt-001',
      name: 'First event',
      startDate: '2026-06-22T09:00:00',
      endDate: '2026-06-22T10:00:00',
    })
    const second = createEvent({
      id: 'evt-002',
      name: 'Second event',
      startDate: '2026-06-23T11:00:00',
      endDate: '2026-06-23T12:00:00',
    })

    const { rerender } = renderEventDialog({ open: true, event: first })
    rerender({ open: true, event: second })

    expect(screen.getByLabelText('Event name')).toHaveValue('Second event')
    expect(screen.getByLabelText('Start date and time')).toHaveValue(
      '2026-06-23T11:00',
    )
  })

  it('does not mutate event or initialDate props', async () => {
    const user = userEvent.setup()
    const event = createEvent({ id: 'evt-001' })
    const originalEvent = { ...event }
    const initialDate = localDate(2026, 5, 22, 14, 0)
    const originalInitialTime = initialDate.getTime()

    const { onSave } = renderEventDialog({
      open: true,
      event,
      initialDate,
    })

    await user.clear(screen.getByLabelText('Event name'))
    await user.type(screen.getByLabelText('Event name'), 'Changed')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(event).toEqual(originalEvent)
    expect(initialDate.getTime()).toBe(originalInitialTime)
    expect(onSave).toHaveBeenCalled()
  })
})

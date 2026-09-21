import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Stack,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  addMonths,
  addWeeks,
  format,
  isValid,
  parseISO,
  startOfDay,
  subMonths,
  subWeeks,
} from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent, EventDraft } from './domain/event'
import { getWeekDays } from './domain/calendar'
import { MonthView } from './features/calendar/MonthView'
import { WeekView } from './features/calendar/WeekView'
import { DeleteEventDialog } from './features/events/DeleteEventDialog'
import { EventDialog } from './features/events/EventDialog'
import { useEventStore } from './store/event-store'

type CalendarView = 'month' | 'week'

type EditorState =
  | { mode: 'closed' }
  | { mode: 'create'; initialDate: Date }
  | { mode: 'edit'; eventId: string }

function resolveInitialAnchorDate(events: readonly CalendarEvent[]): Date {
  const firstEvent = events[0]
  if (firstEvent === undefined) {
    return startOfDay(new Date())
  }

  const parsedStart = parseISO(firstEvent.startDate)
  return isValid(parsedStart) ? startOfDay(parsedStart) : startOfDay(new Date())
}

function formatMonthPeriod(anchorDate: Date): string {
  return format(anchorDate, 'MMMM yyyy')
}

function formatWeekPeriod(anchorDate: Date): string {
  const weekDays = getWeekDays(anchorDate)
  const weekStart = weekDays[0]
  const weekEnd = weekDays[weekDays.length - 1]
  return `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`
}

function App() {
  const events = useEventStore((state) => state.events)
  const addEvent = useEventStore((state) => state.addEvent)
  const updateEvent = useEventStore((state) => state.updateEvent)
  const deleteEvent = useEventStore((state) => state.deleteEvent)

  const [view, setView] = useState<CalendarView>('month')
  const [anchorDate, setAnchorDate] = useState<Date>(() =>
    resolveInitialAnchorDate(useEventStore.getState().events),
  )
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' })
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)

  const selectedEventId =
    editor.mode === 'edit' ? editor.eventId : undefined

  const selectedEvent = useMemo(() => {
    if (selectedEventId === undefined) {
      return undefined
    }

    return events.find((event) => event.id === selectedEventId)
  }, [events, selectedEventId])

  const deleteEventName = useMemo(() => {
    if (deleteEventId === null) {
      return ''
    }

    return events.find((event) => event.id === deleteEventId)?.name ?? ''
  }, [deleteEventId, events])

  const periodLabel =
    view === 'month'
      ? formatMonthPeriod(anchorDate)
      : formatWeekPeriod(anchorDate)

  useEffect(() => {
    if (editor.mode === 'edit' && selectedEvent === undefined) {
      setEditor({ mode: 'closed' })
      setDeleteEventId(null)
    }
  }, [editor.mode, selectedEvent])

  function openCreate(initialDate: Date): void {
    setDeleteEventId(null)
    setEditor({ mode: 'create', initialDate })
  }

  function openEdit(eventId: string): void {
    setDeleteEventId(null)
    setEditor({ mode: 'edit', eventId })
  }

  function closeEditor(): void {
    setEditor({ mode: 'closed' })
    setDeleteEventId(null)
  }

  function handlePreviousPeriod(): void {
    setAnchorDate((current) =>
      view === 'month' ? subMonths(current, 1) : subWeeks(current, 1),
    )
  }

  function handleNextPeriod(): void {
    setAnchorDate((current) =>
      view === 'month' ? addMonths(current, 1) : addWeeks(current, 1),
    )
  }

  function handleToday(): void {
    setAnchorDate(startOfDay(new Date()))
  }

  function handleSave(draft: EventDraft): void {
    if (editor.mode === 'create') {
      addEvent(draft)
      closeEditor()
      return
    }

    if (editor.mode === 'edit') {
      updateEvent(editor.eventId, draft)
      closeEditor()
    }
  }

  function handleDeleteRequest(): void {
    if (editor.mode !== 'edit') {
      return
    }

    setDeleteEventId(editor.eventId)
  }

  function handleDeleteCancel(): void {
    setDeleteEventId(null)
  }

  function handleDeleteConfirm(): void {
    if (deleteEventId === null) {
      return
    }

    deleteEvent(deleteEventId)
    setDeleteEventId(null)
    setEditor({ mode: 'closed' })
  }

  const isEventDialogOpen =
    deleteEventId === null &&
    (editor.mode === 'create' ||
      (editor.mode === 'edit' && selectedEvent !== undefined))

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar
          sx={{
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            py: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0, flex: '1 1 12rem' }}>
            <Typography component="p" variant="h1" color="primary.main">
              ecoPortal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Calendar
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              flex: '1 1 auto',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconButton
              aria-label={
                view === 'month' ? 'Previous month' : 'Previous week'
              }
              onClick={handlePreviousPeriod}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography
              component="h2"
              variant="h2"
              sx={{ minWidth: '10rem', textAlign: 'center' }}
            >
              {periodLabel}
            </Typography>
            <IconButton
              aria-label={view === 'month' ? 'Next month' : 'Next week'}
              onClick={handleNextPeriod}
            >
              <ChevronRightIcon />
            </IconButton>
            <Button variant="outlined" onClick={handleToday}>
              Today
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <ToggleButtonGroup
              exclusive
              value={view}
              aria-label="Calendar view"
              onChange={(_event, nextView: CalendarView | null) => {
                if (nextView !== null) {
                  setView(nextView)
                }
              }}
            >
              <ToggleButton value="month" aria-label="Month view">
                Month
              </ToggleButton>
              <ToggleButton value="week" aria-label="Week view">
                Week
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              onClick={() => {
                openCreate(anchorDate)
              }}
            >
              New event
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, p: { xs: 1, sm: 2 }, minWidth: 0 }}>
        {view === 'month' ? (
          <MonthView
            anchorDate={anchorDate}
            events={events}
            onDaySelect={(date) => {
              openCreate(date)
            }}
            onEventSelect={(event) => {
              openEdit(event.id)
            }}
          />
        ) : (
          <WeekView
            anchorDate={anchorDate}
            events={events}
            onSlotSelect={(date) => {
              openCreate(date)
            }}
            onEventSelect={(event) => {
              openEdit(event.id)
            }}
          />
        )}
      </Box>

      <EventDialog
        open={isEventDialogOpen}
        event={editor.mode === 'edit' ? selectedEvent : undefined}
        initialDate={
          editor.mode === 'create' ? editor.initialDate : undefined
        }
        onClose={closeEditor}
        onSave={handleSave}
        onDeleteRequest={
          editor.mode === 'edit' ? handleDeleteRequest : undefined
        }
      />

      <DeleteEventDialog
        open={deleteEventId !== null}
        eventName={deleteEventName}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  )
}

export default App

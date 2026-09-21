import { Box, Button, Typography } from '@mui/material'
import { green, grey } from '@mui/material/colors'
import { format, isSameMonth, isToday } from 'date-fns'
import { getEventsForDay, getMonthDays } from '../../domain/calendar'
import type { CalendarEvent } from '../../domain/event'
import { EventItem } from './EventItem'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MAX_VISIBLE_EVENTS = 3
const COLUMN_MIN_WIDTH = '5.5rem'

export interface MonthViewProps {
  anchorDate: Date
  events: CalendarEvent[]
  onDaySelect(date: Date): void
  onEventSelect(event: CalendarEvent): void
}

interface MonthDayCellProps {
  day: Date
  anchorDate: Date
  events: CalendarEvent[]
  onDaySelect(date: Date): void
  onEventSelect(event: CalendarEvent): void
}

function MonthDayCell({
  day,
  anchorDate,
  events,
  onDaySelect,
  onEventSelect,
}: MonthDayCellProps) {
  const isCurrentMonth = isSameMonth(day, anchorDate)
  const isCurrentDay = isToday(day)
  const dayEvents = getEventsForDay(events, day)
  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS)
  const overflowCount = dayEvents.length - visibleEvents.length
  const dayLabel = format(day, 'MMMM d, yyyy')

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        minHeight: 120,
        minWidth: 0,
        p: 0.75,
        borderRight: 1,
        borderBottom: 1,
        borderColor: isCurrentDay ? green[700] : 'divider',
        bgcolor: isCurrentDay
          ? green[50]
          : isCurrentMonth
            ? 'background.paper'
            : grey[100],
      }}
    >
      <Button
        type="button"
        variant="text"
        size="small"
        onClick={() => {
          onDaySelect(day)
        }}
        aria-label={`Create event on ${dayLabel}`}
        aria-current={isCurrentDay ? 'date' : undefined}
        sx={{
          alignSelf: 'flex-start',
          minWidth: 32,
          px: 0.5,
          py: 0.25,
          textTransform: 'none',
          fontWeight: isCurrentDay ? 700 : 500,
          color: isCurrentMonth ? 'text.primary' : 'text.disabled',
        }}
      >
        {format(day, 'd')}
      </Button>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
          minWidth: 0,
        }}
      >
        {visibleEvents.map((event) => (
          <EventItem key={event.id} event={event} onSelect={onEventSelect} />
        ))}
        {overflowCount > 0 ? (
          <Typography variant="caption" color="text.secondary">
            +{overflowCount} more
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

export function MonthView({
  anchorDate,
  events,
  onDaySelect,
  onEventSelect,
}: MonthViewProps) {
  const days = getMonthDays(anchorDate)
  const monthLabel = `Month of ${format(anchorDate, 'MMMM yyyy')}`

  return (
    <Box
      component="section"
      aria-label={monthLabel}
      sx={{ overflowX: 'auto' }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, minmax(${COLUMN_MIN_WIDTH}, 1fr))`,
          minWidth: `calc(7 * ${COLUMN_MIN_WIDTH})`,
          borderTop: 1,
          borderLeft: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {WEEKDAY_LABELS.map((label) => (
          <Typography
            key={label}
            component="div"
            variant="body2"
            sx={{
              px: 0.75,
              py: 1,
              textAlign: 'center',
              fontWeight: 600,
              color: 'text.secondary',
              borderRight: 1,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: grey[50],
            }}
          >
            {label}
          </Typography>
        ))}
        {days.map((day) => (
          <MonthDayCell
            key={day.getTime()}
            day={day}
            anchorDate={anchorDate}
            events={events}
            onDaySelect={onDaySelect}
            onEventSelect={onEventSelect}
          />
        ))}
      </Box>
    </Box>
  )
}

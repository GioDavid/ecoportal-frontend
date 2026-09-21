import { Box, Button, Typography } from '@mui/material'
import { green, grey } from '@mui/material/colors'
import {
  format,
  isToday,
  isValid,
  parseISO,
  setHours,
  setMinutes,
  setSeconds,
} from 'date-fns'
import type { MouseEvent } from 'react'
import {
  getEventsForDay,
  getVisibleEventInterval,
  getWeekDays,
} from '../../domain/calendar'
import type { CalendarEvent } from '../../domain/event'

export const WEEK_VIEW_VISIBLE_START_HOUR = 7
export const WEEK_VIEW_VISIBLE_END_HOUR = 20
export const WEEK_VIEW_SLOT_COUNT = 13
export const WEEK_VIEW_HOUR_HEIGHT_PX = 48
export const WEEK_VIEW_MIN_EVENT_HEIGHT_PX = 20

const COLUMN_MIN_WIDTH = '6.5rem'
const SLOT_HOURS = Array.from(
  { length: WEEK_VIEW_SLOT_COUNT },
  (_, index) => WEEK_VIEW_VISIBLE_START_HOUR + index,
)

export interface WeekViewProps {
  anchorDate: Date
  events: CalendarEvent[]
  onSlotSelect(date: Date): void
  onEventSelect(event: CalendarEvent): void
}

interface WeekDayColumnProps {
  day: Date
  events: CalendarEvent[]
  onSlotSelect(date: Date): void
  onEventSelect(event: CalendarEvent): void
}

function formatEventTime(value: string): string {
  const parsed = parseISO(value)
  if (!isValid(parsed)) {
    return value
  }

  return format(parsed, 'h:mm a')
}

function weekEventAccessibleName(event: CalendarEvent): string {
  const startTime = formatEventTime(event.startDate)
  const endTime = formatEventTime(event.endDate)
  return `${event.name}, ${startTime} to ${endTime}`
}

function slotDate(day: Date, hour: number): Date {
  return setSeconds(setMinutes(setHours(day, hour), 0), 0)
}

function eventPositionStyle(
  startMinutes: number,
  durationMinutes: number,
): { top: string; height: string } {
  const topPx = (startMinutes / 60) * WEEK_VIEW_HOUR_HEIGHT_PX
  const heightPx = Math.max(
    (durationMinutes / 60) * WEEK_VIEW_HOUR_HEIGHT_PX,
    WEEK_VIEW_MIN_EVENT_HEIGHT_PX,
  )

  return {
    top: `${topPx}px`,
    height: `${heightPx}px`,
  }
}

function WeekEventButton({
  event,
  day,
  onEventSelect,
}: {
  event: CalendarEvent
  day: Date
  onEventSelect(event: CalendarEvent): void
}) {
  const interval = getVisibleEventInterval(event, day)
  if (interval === null) {
    return null
  }

  const position = eventPositionStyle(
    interval.startMinutes,
    interval.durationMinutes,
  )
  const accessibleName = weekEventAccessibleName(event)

  function handleClick(mouseEvent: MouseEvent<HTMLButtonElement>): void {
    mouseEvent.stopPropagation()
    onEventSelect(event)
  }

  return (
    <Button
      type="button"
      variant="text"
      onClick={handleClick}
      aria-label={accessibleName}
      sx={{
        position: 'absolute',
        left: 4,
        right: 4,
        top: position.top,
        height: position.height,
        minHeight: WEEK_VIEW_MIN_EVENT_HEIGHT_PX,
        px: 0.5,
        py: 0.25,
        justifyContent: 'flex-start',
        textTransform: 'none',
        fontSize: '0.75rem',
        lineHeight: 1.2,
        color: green[800],
        bgcolor: green[100],
        border: 1,
        borderColor: green[300],
        borderRadius: 0.5,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        zIndex: 1,
      }}
    >
      {event.name}
    </Button>
  )
}

function WeekDayColumn({
  day,
  events,
  onSlotSelect,
  onEventSelect,
}: WeekDayColumnProps) {
  const isCurrentDay = isToday(day)
  const dayEvents = getEventsForDay(events, day).filter(
    (event) => getVisibleEventInterval(event, day) !== null,
  )
  const dayLabel = format(day, 'MMMM d, yyyy')
  const columnHeight = WEEK_VIEW_SLOT_COUNT * WEEK_VIEW_HOUR_HEIGHT_PX

  return (
    <Box
      sx={{
        minWidth: 0,
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          px: 0.75,
          py: 1,
          textAlign: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isCurrentDay ? green[50] : grey[50],
        }}
      >
        <Typography
          component="div"
          variant="body2"
          aria-current={isCurrentDay ? 'date' : undefined}
          sx={{
            fontWeight: isCurrentDay ? 700 : 600,
            color: 'text.secondary',
          }}
        >
          {format(day, 'EEE')}
        </Typography>
        <Typography component="div" variant="subtitle2">
          {format(day, 'd')}
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'relative',
          height: columnHeight,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SLOT_HOURS.map((hour) => {
          const slotStart = slotDate(day, hour)
          const slotTimeLabel = format(slotStart, 'h:mm a')

          return (
            <Button
              key={hour}
              type="button"
              variant="text"
              onClick={() => {
                onSlotSelect(slotStart)
              }}
              aria-label={`Create event on ${dayLabel} at ${slotTimeLabel}`}
              sx={{
                position: 'absolute',
                top: (hour - WEEK_VIEW_VISIBLE_START_HOUR) * WEEK_VIEW_HOUR_HEIGHT_PX,
                left: 0,
                right: 0,
                height: WEEK_VIEW_HOUR_HEIGHT_PX,
                borderRadius: 0,
                borderBottom: 1,
                borderColor: 'divider',
                color: 'transparent',
                '&:hover': {
                  bgcolor: green[50],
                  color: 'transparent',
                },
                '&:focus-visible': {
                  bgcolor: green[100],
                  outline: '2px solid',
                  outlineColor: green[700],
                  outlineOffset: -2,
                },
              }}
            >
              {slotTimeLabel}
            </Button>
          )
        })}
        {dayEvents.map((event) => (
          <WeekEventButton
            key={event.id}
            event={event}
            day={day}
            onEventSelect={onEventSelect}
          />
        ))}
      </Box>
    </Box>
  )
}

export function WeekView({
  anchorDate,
  events,
  onSlotSelect,
  onEventSelect,
}: WeekViewProps) {
  const weekDays = getWeekDays(anchorDate)
  const weekLabel = `Week of ${format(weekDays[0], 'MMMM d, yyyy')}`

  return (
    <Box component="section" aria-label={weekLabel} sx={{ overflowX: 'auto' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, minmax(${COLUMN_MIN_WIDTH}, 1fr))`,
          minWidth: `calc(7 * ${COLUMN_MIN_WIDTH})`,
          borderTop: 1,
          borderLeft: 1,
          borderColor: 'divider',
        }}
      >
        {weekDays.map((day) => (
          <WeekDayColumn
            key={day.getTime()}
            day={day}
            events={events}
            onSlotSelect={onSlotSelect}
            onEventSelect={onEventSelect}
          />
        ))}
      </Box>
    </Box>
  )
}

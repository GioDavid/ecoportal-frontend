import { Button } from '@mui/material'
import { green } from '@mui/material/colors'
import { format, isValid, parseISO } from 'date-fns'
import type { MouseEvent } from 'react'
import type { CalendarEvent } from '../../domain/event'

export interface EventItemProps {
  event: CalendarEvent
  onSelect(event: CalendarEvent): void
}

function formatEventTime(value: string): string {
  const parsed = parseISO(value)
  if (!isValid(parsed)) {
    return value
  }

  return format(parsed, 'h:mm a')
}

function eventAccessibleName(event: CalendarEvent): string {
  const startTime = formatEventTime(event.startDate)
  const endTime = formatEventTime(event.endDate)
  return `${event.name}, ${startTime} to ${endTime}`
}

export function EventItem({ event, onSelect }: EventItemProps) {
  const accessibleName = eventAccessibleName(event)

  function handleClick(mouseEvent: MouseEvent<HTMLButtonElement>): void {
    mouseEvent.stopPropagation()
    onSelect(event)
  }

  return (
    <Button
      type="button"
      variant="text"
      size="small"
      fullWidth
      onClick={handleClick}
      aria-label={accessibleName}
      sx={{
        minWidth: 0,
        px: 0.5,
        py: 0.25,
        justifyContent: 'flex-start',
        textTransform: 'none',
        fontSize: '0.75rem',
        lineHeight: 1.2,
        color: green[800],
        bgcolor: green[50],
        border: 1,
        borderColor: green[200],
        borderRadius: 0.5,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        display: 'block',
      }}
    >
      {event.name}
    </Button>
  )
}

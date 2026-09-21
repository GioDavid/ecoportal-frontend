import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import {
  addHours,
  format,
  isValid,
  parseISO,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from 'date-fns'
import { useEffect, useState } from 'react'
import type { CalendarEvent, EventDraft, EventType } from '../../domain/event'
import {
  validateEvent,
  type EventValidationErrors,
} from '../../domain/event-validation'

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm"

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
]

export interface EventDialogProps {
  open: boolean
  event?: CalendarEvent
  initialDate?: Date
  onClose(): void
  onSave(draft: EventDraft): void
  onDeleteRequest?(): void
}

interface FormState {
  name: string
  type: EventType
  startDate: string
  endDate: string
}

function isMidnight(date: Date): boolean {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  )
}

function toDateTimeLocalString(date: Date): string {
  return format(date, DATETIME_LOCAL_FORMAT)
}

function normalizeLocalDateTime(date: Date): Date {
  return setMilliseconds(setSeconds(date, 0), 0)
}

export function buildCreateFormState(initialDate?: Date): FormState {
  let start: Date
  if (initialDate === undefined) {
    const today = normalizeLocalDateTime(new Date())
    start = setHours(setMinutes(setSeconds(today, 0), 0), 9)
  } else {
    const base = normalizeLocalDateTime(initialDate)
    start = isMidnight(base)
      ? setHours(setMinutes(setSeconds(base, 0), 0), 9)
      : base
  }
  const end = addHours(start, 1)

  return {
    name: '',
    type: 'meeting',
    startDate: toDateTimeLocalString(start),
    endDate: toDateTimeLocalString(end),
  }
}

function buildEditFormState(event: CalendarEvent): FormState {
  const start = parseISO(event.startDate)
  const end = parseISO(event.endDate)

  return {
    name: event.name,
    type: event.type,
    startDate: isValid(start)
      ? toDateTimeLocalString(start)
      : event.startDate,
    endDate: isValid(end) ? toDateTimeLocalString(end) : event.endDate,
  }
}

function buildFormState(
  event: CalendarEvent | undefined,
  initialDate?: Date,
): FormState {
  if (event === undefined) {
    return buildCreateFormState(initialDate)
  }

  return buildEditFormState(event)
}

export function EventDialog({
  open,
  event,
  initialDate,
  onClose,
  onSave,
  onDeleteRequest,
}: EventDialogProps) {
  const isEditMode = event !== undefined
  const [formState, setFormState] = useState<FormState>(() =>
    buildFormState(event, initialDate),
  )
  const [errors, setErrors] = useState<EventValidationErrors>({})

  useEffect(() => {
    if (!open) {
      return
    }

    setFormState(buildFormState(event, initialDate))
    setErrors({})
  }, [open, event, initialDate])

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ): void {
    setFormState((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (current[field] === undefined) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function handleSubmit(): void {
    const validationErrors = validateEvent(formState)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    onSave({
      name: formState.name.trim(),
      type: formState.type,
      startDate: formState.startDate,
      endDate: formState.endDate,
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="event-dialog-title"
    >
      <DialogTitle id="event-dialog-title">
        {isEditMode ? 'Edit event' : 'Create event'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Event name"
          value={formState.name}
          onChange={(changeEvent) => {
            updateField('name', changeEvent.target.value)
          }}
          error={errors.name !== undefined}
          helperText={errors.name}
          autoFocus
          fullWidth
        />
        <TextField
          select
          label="Event type"
          value={formState.type}
          onChange={(changeEvent) => {
            updateField('type', changeEvent.target.value as EventType)
          }}
          error={errors.type !== undefined}
          helperText={errors.type}
          fullWidth
        >
          {EVENT_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Start date and time"
          type="datetime-local"
          value={formState.startDate}
          onChange={(changeEvent) => {
            updateField('startDate', changeEvent.target.value)
          }}
          error={errors.startDate !== undefined}
          helperText={errors.startDate}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="End date and time"
          type="datetime-local"
          value={formState.endDate}
          onChange={(changeEvent) => {
            updateField('endDate', changeEvent.target.value)
          }}
          error={errors.endDate !== undefined}
          helperText={errors.endDate}
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {isEditMode && onDeleteRequest !== undefined ? (
          <Button color="error" onClick={onDeleteRequest}>
            Delete
          </Button>
        ) : null}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {isEditMode ? 'Save changes' : 'Create event'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

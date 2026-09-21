import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

export interface DeleteEventDialogProps {
  open: boolean
  eventName: string
  onCancel(): void
  onConfirm(): void
}

export function DeleteEventDialog({
  open,
  eventName,
  onCancel,
  onConfirm,
}: DeleteEventDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="delete-event-dialog-title"
      aria-describedby="delete-event-dialog-description"
    >
      <DialogTitle id="delete-event-dialog-title">Delete event?</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-event-dialog-description">
          {`Delete "${eventName}"? This action is permanent in this browser and cannot be undone.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}

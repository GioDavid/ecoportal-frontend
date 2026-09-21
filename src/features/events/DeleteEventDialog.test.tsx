import { ThemeProvider, createTheme } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  DeleteEventDialog,
  type DeleteEventDialogProps,
} from './DeleteEventDialog'

const theme = createTheme()

function renderDeleteDialog(
  props: Partial<DeleteEventDialogProps> & Pick<DeleteEventDialogProps, 'open'>,
): {
  onCancel: ReturnType<typeof vi.fn<DeleteEventDialogProps['onCancel']>>
  onConfirm: ReturnType<typeof vi.fn<DeleteEventDialogProps['onConfirm']>>
} {
  const onCancel = vi.fn<DeleteEventDialogProps['onCancel']>()
  const onConfirm = vi.fn<DeleteEventDialogProps['onConfirm']>()

  render(
    <ThemeProvider theme={theme}>
      <DeleteEventDialog
        open={props.open}
        eventName={props.eventName ?? 'Weekly safety briefing'}
        onCancel={props.onCancel ?? onCancel}
        onConfirm={props.onConfirm ?? onConfirm}
      />
    </ThemeProvider>,
  )

  return { onCancel, onConfirm }
}

describe('DeleteEventDialog', () => {
  it('has an accessible delete title', () => {
    renderDeleteDialog({ open: true })

    expect(
      screen.getByRole('heading', { name: 'Delete event?' }),
    ).toBeInTheDocument()
  })

  it('includes the event name in the message', () => {
    renderDeleteDialog({
      open: true,
      eventName: 'Quarterly site audit',
    })

    expect(
      screen.getByText(/Delete "Quarterly site audit"\?/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/permanent in this browser/i),
    ).toBeInTheDocument()
  })

  it('invokes onCancel when cancel is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = renderDeleteDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('invokes onConfirm when delete is clicked', async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = renderDeleteDialog({ open: true })

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('invokes onCancel when closed with Escape', async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = renderDeleteDialog({ open: true })

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

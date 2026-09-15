import * as Dialog from '@radix-ui/react-dialog'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  loading?: boolean
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="28"
        strokeDashoffset="10"
      />
    </svg>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />

        {/* Centering container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Dialog card — Dialog.Content handles focus trap and a11y */}
          <Dialog.Content
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl"
            aria-describedby="confirm-dialog-description"
            // Prevent the content click from propagating to the overlay
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title className="text-foreground font-semibold text-lg">
              {title}
            </Dialog.Title>

            <Dialog.Description
              id="confirm-dialog-description"
              className="text-muted-foreground text-sm mt-2"
            >
              {description}
            </Dialog.Description>

            <div className="flex gap-3 mt-6 justify-end">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>

              <Button
                variant={variant === 'danger' ? 'danger' : 'primary'}
                disabled={loading}
                onClick={onConfirm}
              >
                {loading && <span className="mr-2"><Spinner /></span>}
                {confirmLabel}
              </Button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

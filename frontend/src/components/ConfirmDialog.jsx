import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, confirmLabel = "Excluir" }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title || "Tem certeza?"}</AlertDialogTitle>
          <AlertDialogDescription>{description || "Esta ação não poderá ser desfeita."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="confirm-cancel">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            data-testid="confirm-ok"
            className="bg-rose-500 hover:bg-rose-600 text-white"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

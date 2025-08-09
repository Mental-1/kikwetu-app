
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteConversationModal({
  showModal,
  setShowModal,
  onDelete,
  isDeleting,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onDelete: () => Promise<void> | void;
  isDeleting: boolean;
}) {
  return (
    <Dialog
      open={showModal}
      onOpenChange={(open) => {
        if (isDeleting) return;
        setShowModal(open);
      }}
    >
      <DialogContent className="w-[75%] mx-auto rounded-xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">Delete Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 text-center">
          <Trash2 className="h-16 w-16 text-destructive mx-auto" />
          <DialogDescription className="text-muted-foreground">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogDescription>
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setShowModal(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Toast } from "@base-ui/react/toast";
import { X } from "lucide-react";

import style from "./Toasts.module.css";

export function GlobalToasts() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      swipeDirection="up"
      className={`${style.Toast} p-2 rounded-xs`}
    >
      <Toast.Content className={style.Content}>
        <Toast.Title className={style.Title} />
        <Toast.Description className={style.Description} />
        <Toast.Close className={style.Close} aria-label="Close">
          <X className="h-4 w-4" />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

import { Outlet } from "react-router";
import { Toast } from "@base-ui/react/toast";

import { plugins } from "./plugins";
import { RegistryProvider } from "./registry";
import { ThemeProvider } from "./theme";
import { toastManager } from "./utils/toastManager";
import { GlobalToasts } from "./components/Toasts";
import { PwaRoutePersist } from "./PwaRouteRestore";

function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed top-hdr left-1/2 -translate-x-1/2 z-100 flex flex-col gap-2 p-2 w-75 max-w-[90vw]">
        <GlobalToasts />
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export function AppLayout() {
  return (
    <RegistryProvider plugins={plugins}>
      <Toast.Provider toastManager={toastManager}>
        <ThemeProvider>
          <PwaRoutePersist />
          <Outlet />
          <Toaster />
        </ThemeProvider>
      </Toast.Provider>
    </RegistryProvider>
  );
}

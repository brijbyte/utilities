import { Route, Routes } from "react-router";
import { Toast } from "@base-ui/react/toast";

import { plugins } from "./plugins";
import { RegistryProvider } from "./registry";
import { AppPage } from "./shell/AppPage";
import { HomePage } from "./shell/HomePage";
import { ThemeProvider } from "./theme";
import { toastManager } from "./utils/toastManager";
import { GlobalToasts } from "./components/Toasts";

function Toaster() {
  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed top-hdr left-1/2 -translate-x-1/2 z-100 flex flex-col gap-sm p-sm w-75 max-w-[90vw]">
        <GlobalToasts />
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export default function App() {
  return (
    <RegistryProvider plugins={plugins}>
      <Toast.Provider toastManager={toastManager}>
        <ThemeProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/a/:id" element={<AppPage />} />
          </Routes>
          <Toaster />
        </ThemeProvider>
      </Toast.Provider>
    </RegistryProvider>
  );
}

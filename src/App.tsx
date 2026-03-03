import { Route, Routes } from "react-router";

import { plugins } from "./plugins";
import { RegistryProvider } from "./registry";
import { AppPage } from "./shell/AppPage";
import { HomePage } from "./shell/HomePage";
import { ThemeProvider } from "./theme";

export default function App() {
  return (
    <RegistryProvider plugins={plugins}>
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/a/:id" element={<AppPage />} />
        </Routes>
      </ThemeProvider>
    </RegistryProvider>
  );
}

import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./theme";
import { RegistryProvider } from "./registry";
import { plugins } from "./plugins";
import { HomePage } from "./shell/HomePage";
import { AppPage } from "./shell/AppPage";

export default function App() {
  return (
    <RegistryProvider value={plugins}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/a/:id" element={<AppPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </RegistryProvider>
  );
}

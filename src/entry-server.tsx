import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { RegistryProvider } from "./registry";
import { ThemeProvider } from "./theme";
import { plugins } from "./plugins";
import { HomePage } from "./shell/HomePage";

export function render(url: string) {
  return renderToString(
    <RegistryProvider value={plugins}>
      <ThemeProvider>
        <StaticRouter location={url}>
          <HomePage />
        </StaticRouter>
      </ThemeProvider>
    </RegistryProvider>,
  );
}

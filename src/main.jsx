import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import { DsCssBaseline } from "@am92/react-design-system";
// Required for rds icon components (e.g. DsSelect's dropdown arrow) to render.
import "remixicon/fonts/remixicon.css";
import theme from "./theme.js";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="light">
      <DsCssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);

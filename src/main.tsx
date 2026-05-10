import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { ThemeProvider } from "@mui/material/styles";
import App from "./App.tsx";
import "./index.css";
import { CLERK_PUBLISHABLE_KEY } from "./config/clerk";
import { muiTheme } from "./lib/mui-theme";
import { loadStoredFavicon } from "./lib/favicon";

loadStoredFavicon();

const Root = () => {
  const tree = (
    <ThemeProvider theme={muiTheme}>
      <App />
    </ThemeProvider>
  );
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider afterSignOutUrl="/" publishableKey={CLERK_PUBLISHABLE_KEY}>
        {tree}
      </ClerkProvider>
    );
  }
  return tree;
};

createRoot(document.getElementById("root")!).render(<Root />);

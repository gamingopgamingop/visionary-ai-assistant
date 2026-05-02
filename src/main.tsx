import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { CLERK_PUBLISHABLE_KEY } from "./config/clerk";
import { ThemeProvider } from "./components/ThemeProvider";

const Root = () => {
  const tree = (
    <ThemeProvider>
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


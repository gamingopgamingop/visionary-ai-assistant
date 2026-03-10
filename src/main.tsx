import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { CLERK_PUBLISHABLE_KEY } from "./config/clerk";

createRoot(document.getElementById("root")!).render(
  <ClerkProvider afterSignOutUrl="/" publishableKey={CLERK_PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);

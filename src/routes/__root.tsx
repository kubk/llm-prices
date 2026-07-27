import type { ReactNode } from "react";
import {
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import "@fontsource-variable/jetbrains-mono";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "LLM Prices",
      },
      {
        name: "description",
        content:
          "Compare pricing for AI models across OpenAI, Anthropic, Google, and more.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

"use client";
import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StepProcessDialogProvider } from "@/components/step-process-dialog";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <StepProcessDialogProvider>{children}</StepProcessDialogProvider>
    </QueryClientProvider>
  );
}

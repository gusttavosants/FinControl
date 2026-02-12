import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StatusBar } from "react-native";
import { queryClient, asyncStoragePersister } from "@/lib/queryClient";
import { useSyncQueue } from "@/hooks/useSyncQueue";

function SyncManager({ children }: { children: React.ReactNode }) {
  useSyncQueue();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24,
      }}
    >
      <AuthProvider>
        <SyncManager>
          <StatusBar barStyle="light-content" backgroundColor="#0b0d14" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#0b0d14" },
              animation: "fade",
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </SyncManager>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

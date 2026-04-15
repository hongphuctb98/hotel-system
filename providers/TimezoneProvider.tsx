"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { settingsService } from "@/common/services/settingsService";

const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_HOTEL_TIMEZONE ?? "Asia/Ho_Chi_Minh";

const TimezoneContext = createContext<string | null>(null);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);

  useEffect(() => {
    settingsService
      .getSettings()
      .then((res) => {
        if (res.data?.timezone) setTimezone(res.data.timezone);
      })
      .catch(() => {
        // Keep the default on error
      });
  }, []);

  return (
    <TimezoneContext.Provider value={timezone}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): string {
  const ctx = useContext(TimezoneContext);
  if (ctx === null) {
    throw new Error("useTimezone must be used within TimezoneProvider");
  }
  return ctx;
}

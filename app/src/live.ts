import "react-native-url-polyfill/auto";
import { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/**
 * Calls `refetch` immediately, whenever Supabase Realtime reports a change on `rides`,
 * and every 3 s as a safety net (so the demo still works if realtime is not set up).
 */
export function useLive(refetch: () => void) {
  useEffect(() => {
    refetch();
    const timer = setInterval(refetch, 3000);
    const channel = supabase
      ?.channel("rides-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => refetch())
      .subscribe();
    return () => {
      clearInterval(timer);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [refetch]);
}

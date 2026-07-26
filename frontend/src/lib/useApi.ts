import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/** Re-fetches whenever `deps` changes; a stale response for a superseded call is dropped. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: "loading" });
  const callId = useRef(0);

  useEffect(() => {
    const id = ++callId.current;
    setState({ status: "loading" });
    fetcher()
      .then((data) => {
        if (callId.current === id) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (callId.current !== id) return;
        const message = err instanceof ApiError ? err.message : "No se pudo conectar con el servidor.";
        setState({ status: "error", message });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

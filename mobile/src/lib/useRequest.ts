import { useEffect, useState } from "react";

export function useRequest<T>(fn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    fn()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => {
        console.warn(e);
        if (alive) setError(true);
      });
    return () => { alive = false; };
  }, [attempt]);

  return { data, error, retry: () => setAttempt((n) => n + 1) };
}

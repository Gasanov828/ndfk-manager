function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  if (
    message.includes("econnreset") ||
    message.includes("terminated") ||
    message.includes("fetch failed") ||
    message.includes("network")
  ) {
    return true;
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const causeMessage = cause.message.toLowerCase();
    return (
      causeMessage.includes("econnreset") ||
      causeMessage.includes("terminated") ||
      causeMessage.includes("network")
    );
  }

  return false;
}

/** Устойчивый fetch для Supabase: без кэша Next.js + повтор при обрыве связи. */
export async function supabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(input, {
        ...init,
        cache: "no-store",
      });
    } catch (error) {
      if (!isRetryableFetchError(error) || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw new Error("supabaseFetch: unreachable");
}

export const supabaseGlobalOptions = {
  global: {
    fetch: supabaseFetch,
  },
} as const;

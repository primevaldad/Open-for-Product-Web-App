
/**
 * Ensures route params are always typed as plain objects
 * instead of Promises, avoiding a transient type inference bug in Next.js.
 */
export type RoutePageProps<TParams extends Record<string, string> = object> = {
    params: TParams;
  };

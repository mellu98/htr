/**
 * Tiny zod-free runtime validator used by API routes.
 *
 * Why not zod? To keep the dependency surface minimal. This file exposes
 * `z` which mimics a tiny subset of zod's surface — object(), string(),
 * number(), boolean(), enum(), record(), and parse().
 *
 * If we later decide to bring zod in, swapping is a single import change.
 */

type Parser<T> = {
  parse: (input: unknown) => T;
  optional: () => Parser<T | undefined>;
  min: (n: number) => Parser<T>;
  max: (n: number) => Parser<T>;
  int: () => Parser<T>;
};

export type { Parser };

/** Narrower parser shape for `enum` — preserves literal-union typing. */
type EnumParser<T extends string> = Parser<T> & {
  /** Marker so consumers can detect an enum-typed parser if needed. */
  readonly _enum: true;
  values: readonly T[];
};

function makeParser<T>(name: string, check: (input: unknown) => T): Parser<T> {
  const parser: Parser<T> = {
    parse(input: unknown) {
      try {
        return check(input);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`${name}: ${msg}`);
      }
    },
    optional() {
      return makeParser<T | undefined>(`${name}.optional`, (input) =>
        input === undefined || input === null ? undefined : check(input),
      );
    },
    min(n) {
      return makeParser<T>(`${name}.min`, (input) => {
        const value = check(input);
        if (typeof value === 'string' && value.length < n)
          throw new Error(`must be at least ${n} chars`);
        if (typeof value === 'number' && value < n)
          throw new Error(`must be >= ${n}`);
        return value;
      });
    },
    max(n) {
      return makeParser<T>(`${name}.max`, (input) => {
        const value = check(input);
        if (typeof value === 'string' && value.length > n)
          throw new Error(`must be at most ${n} chars`);
        if (typeof value === 'number' && value > n)
          throw new Error(`must be <= ${n}`);
        return value;
      });
    },
    int() {
      return makeParser<T>(`${name}.int`, (input) => {
        const value = check(input);
        if (typeof value !== 'number' || !Number.isInteger(value))
          throw new Error('must be integer');
        return value;
      });
    },
  };
  return parser;
}

export const z = {
  string: () =>
    makeParser<string>('string', (i) => {
      if (typeof i !== 'string') throw new Error('expected string');
      return i;
    }),
  number: () =>
    makeParser<number>('number', (i) => {
      if (typeof i !== 'number' || !Number.isFinite(i))
        throw new Error('expected number');
      return i;
    }),
  boolean: () =>
    makeParser<boolean>('boolean', (i) => {
      if (typeof i !== 'boolean') throw new Error('expected boolean');
      return i;
    }),
  enum: <T extends string>(values: readonly T[]): EnumParser<T> => {
    const base = makeParser<T>(`enum(${values.join('|')})`, (i) => {
      if (typeof i !== 'string' || !(values as readonly string[]).includes(i))
        throw new Error(`expected one of ${values.join('|')}`);
      return i as T;
    });
    return Object.assign(base, { _enum: true as const, values });
  },
  record: <K extends string, V>(_k: Parser<K>, v: Parser<V>) =>
    makeParser<Record<K, V>>('record', (i) => {
      if (typeof i !== 'object' || i === null)
        throw new Error('expected object');
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(i as Record<string, unknown>)) {
        out[key] = v.parse(value);
      }
      return out as Record<K, V>;
    }),
  object: <S extends Record<string, Parser<any>>>(shape: S): Parser<{ [K in keyof S]: ReturnType<S[K]['parse']> }> => {
    type Out = { [K in keyof S]: ReturnType<S[K]['parse']> };
    const base = makeParser<Out>('object', (i) => {
      if (typeof i !== 'object' || i === null)
        throw new Error('expected object');
      const out: Record<string, unknown> = {};
      for (const [key, parser] of Object.entries(shape)) {
        out[key] = parser.parse((i as Record<string, unknown>)[key]);
      }
      return out as Out;
    });
    return base;
  },
  /**
   * Typed-object builder. Use when `z.object()` widens literal unions to `string`.
   *
   *   const s = z.shape<{ status: 'a' | 'b' }>({ status: z.enum(['a', 'b']) });
   */
  shape: <Out extends Record<string, any>>(shape: { [K in keyof Out]: Parser<Out[K]> }): Parser<Out> => {
    return makeParser<Out>('object', (i) => {
      if (typeof i !== 'object' || i === null)
        throw new Error('expected object');
      const out: Record<string, unknown> = {};
      for (const [key, parser] of Object.entries(shape)) {
        out[key] = parser.parse((i as Record<string, unknown>)[key]);
      }
      return out as Out;
    });
  },
};

export type ZodLike = typeof z;

/**
 * Helper to extract the inferred type from a parser returned by `z.*`.
 * Use as: `type Body = Infer<typeof bodySchema>` — drop-in for `z.infer`.
 */
export type Infer<T> = T extends Parser<infer U> ? U : never;

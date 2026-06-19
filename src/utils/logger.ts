/**
 * Structured, leveled logging for the exporter.
 *
 * Replaces ad-hoc `console.*` calls so every diagnostic on the request path
 * carries a consistent prefix, a severity level, and an optional structured
 * context object. Keeping logging in one place also lets us silence noisy
 * levels (e.g. `debug`) in production builds and reason about what we emit.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Structured context attached to a log entry. Values should be serializable. */
export type LogContext = Record<string, unknown>

const LOG_PREFIX = '[chatgpt-exporter]'

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
}

const LEVEL_METHOD: Record<LogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
    debug: 'debug',
    info: 'info',
    warn: 'warn',
    error: 'error',
}

// In a production userscript build we don't want to emit `debug` noise, but we
// always want warnings and errors. `import.meta.env.DEV` is provided by Vite;
// fall back to verbose logging when it's unavailable (e.g. under test).
function defaultMinLevel(): LogLevel {
    try {
        const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env
        if (env && env.DEV === false) return 'info'
    }
    catch {
        // import.meta may be unavailable in some environments; ignore.
    }
    return 'debug'
}

let minLevel: LogLevel = defaultMinLevel()

/** Override the minimum level that will be emitted. Useful for tests/debugging. */
export function setLogLevel(level: LogLevel): void {
    minLevel = level
}

function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]
}

/**
 * Strip values that should never reach the console (e.g. bearer tokens) and
 * normalize `Error` instances so they serialize usefully.
 */
function sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined

    const sanitized: LogContext = {}
    for (const [key, value] of Object.entries(context)) {
        if (/(token|authorization|api[_-]?key|secret|password)/i.test(key)) {
            sanitized[key] = '[redacted]'
            continue
        }
        if (value instanceof Error) {
            sanitized[key] = { name: value.name, message: value.message }
            continue
        }
        sanitized[key] = value
    }
    return sanitized
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) return

    const tag = `${LOG_PREFIX} ${level.toUpperCase()}`
    const sanitized = sanitizeContext(context)

    // eslint-disable-next-line no-console
    const sink = console[LEVEL_METHOD[level]] ?? console.log
    if (sanitized && Object.keys(sanitized).length > 0) {
        sink(`${tag} ${message}`, sanitized)
    }
    else {
        sink(`${tag} ${message}`)
    }
}

export const logger = {
    debug: (message: string, context?: LogContext) => emit('debug', message, context),
    info: (message: string, context?: LogContext) => emit('info', message, context),
    warn: (message: string, context?: LogContext) => emit('warn', message, context),
    error: (message: string, context?: LogContext) => emit('error', message, context),
}

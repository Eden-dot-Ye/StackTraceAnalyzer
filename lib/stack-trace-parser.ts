import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface StackTraceEntry {
  namespace: string
  methodName: string
  parameters?: string
}

/**
 * Parse stack trace and extract method information
 * Filters out System.* entries
 */
export function parseStackTrace(stackTrace: string): StackTraceEntry[] {
  const entries: StackTraceEntry[] = []
  const lines = stackTrace.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("at ")) {
      continue
    }

    // Skip System.* entries
    if (trimmed.includes("System.")) {
      continue
    }

    // Match: at Namespace.Class.Method(parameters)
    const match = trimmed.match(/at\s+([\w.]+)$$(.*?)$$\s*$/)
    if (!match) {
      continue
    }

    const fullMethod = match[1]
    const parameters = match[2]

    // Split namespace and method
    const lastDot = fullMethod.lastIndexOf(".")
    if (lastDot > 0) {
      const namespace = fullMethod.substring(0, lastDot)
      const methodName = fullMethod.substring(lastDot + 1)

      entries.push({
        namespace,
        methodName,
        parameters,
      })
    }
  }

  return entries
}

/**
 * Remove duplicate entries
 */
export function deduplicateEntries(entries: StackTraceEntry[]): StackTraceEntry[] {
  const seen = new Set<string>()
  const result: StackTraceEntry[] = []

  for (const entry of entries) {
    const key = `${entry.namespace}.${entry.methodName}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push(entry)
    }
  }

  return result
}

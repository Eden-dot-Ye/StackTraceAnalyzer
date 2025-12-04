/**
 * Parse stack trace to extract namespace and method information
 * Handles various stack trace formats including async/generic methods
 */

export interface StackTraceEntry {
  namespace: string
  methodName: string
  originalLine: string
  lineIndex: number
}

export function parseStackTrace(stackTrace: string): StackTraceEntry[] {
  const entries: StackTraceEntry[] = []
  const lines = stackTrace.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match patterns like: at Namespace.ClassName.MethodName(...) or
    // at Namespace.ClassName.MethodName(...) at line X
    const match = line.match(/at\s+([A-Za-z0-9._]+)\.([A-Za-z0-9_`<>$+[\]]+)\(/)

    if (match) {
      const [, namespace, methodName] = match

      // Skip System.* entries
      if (namespace.startsWith("System")) {
        continue
      }

      // Clean up method name (remove generic type parameters for searching)
      const cleanMethodName = methodName
        .replace(/`\d+/g, "") // Remove `N notation for generics
        .replace(/\[.*?\]/g, "") // Remove bracket types
        .replace(/\$</g, "<") // Normalize async state machine names
        .split(">")[0] // Take only the base name

      entries.push({
        namespace,
        methodName: cleanMethodName,
        originalLine: line,
        lineIndex: i,
      })
    }
  }

  return entries
}

/**
 * Deduplicate entries (same namespace.method)
 */
export function deduplicateEntries(entries: StackTraceEntry[]): StackTraceEntry[] {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    const key = `${entry.namespace}.${entry.methodName}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

const execAsync = promisify(exec)

interface FileMatch {
  path: string
  score: number
}

/**
 * Calculate namespace matching score for a file
 * Splits namespace by dots and counts matches in file path
 * Higher score means better match
 */
function calculateNamespaceScore(filePath: string, namespace: string, projectRoot: string): number {
  const normalizedPath = filePath.replace(/\\/g, "/").toLowerCase()
  const projectRootNorm = projectRoot.replace(/\\/g, "/").toLowerCase()
  const relativePath = normalizedPath.replace(projectRootNorm, "").replace(/^\//, "")

  // Extract namespace parts (excluding class name)
  const namespaceParts = namespace.split(".").slice(0, -1).map((p) => p.toLowerCase())

  // Count consecutive matches from the start of path
  const pathParts = relativePath.split("/")
  let consecutiveMatches = 0
  for (let i = 0; i < namespaceParts.length && i < pathParts.length; i++) {
    if (pathParts[i].toLowerCase() === namespaceParts[i]) {
      consecutiveMatches++
    }
  }

  // Count total occurrences of namespace parts in path
  let totalMatches = 0
  for (const part of namespaceParts) {
    if (relativePath.includes(part)) {
      totalMatches++
    }
  }

  // Score: consecutive matches weighted heavily, plus total matches
  const score = consecutiveMatches * 100 + totalMatches * 10

  return score
}

/**
 * Find source file for a given namespace with intelligent matching
 * When multiple files found, returns the one with highest namespace matching score
 */
export async function findSourceFile(namespace: string, projectRoot: string): Promise<string | null> {
  try {
    const parts = namespace.split(".")
    const className = parts[parts.length - 1]
    const fileName = `${className}.cs`

    const { stdout } = await execAsync(`dir /s /b "${fileName}"`, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024,
    })

    const filePaths = stdout
      .trim()
      .split("\n")
      .filter((p) => p.trim())
      .map((p) => p.trim())

    if (filePaths.length === 0) {
      return null
    }

    if (filePaths.length === 1) {
      return filePaths[0]
    }

    // Multiple matches: score each and return best match
    const scored: FileMatch[] = filePaths.map((filePath) => ({
      path: filePath,
      score: calculateNamespaceScore(filePath, namespace, projectRoot),
    }))

    scored.sort((a, b) => b.score - a.score)

    console.log(
      `Found multiple ${className}.cs files. Using best match with score ${scored[0].score}: ${scored[0].path}`
    )

    return scored[0].path
  } catch (error) {
    console.error(`Error finding source file for ${namespace}:`, error)
    return null
  }
}

/**
 * Extract method from file and find its line range
 * Handles public, private, async methods, properties, etc.
 */
export async function findMethodLineRange(
  filePath: string,
  methodName: string,
): Promise<{ start: number; end: number } | null> {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }

    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n")

    // Flexible method pattern matching for various C# method signatures
    let methodStartLine = -1
    const methodPattern = new RegExp(
      `(public|private|protected|internal)?\\s*(async\\s*)?(static\\s*)?.*?\\s+${methodName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\(`,
      "i",
    )

    for (let i = 0; i < lines.length; i++) {
      if (methodPattern.test(lines[i])) {
        methodStartLine = i
        break
      }
    }

    if (methodStartLine === -1) {
      console.warn(`Method ${methodName} not found in ${filePath}`)
      return null
    }

    // Find method end by tracking braces
    let braceCount = 0
    let methodEndLine = methodStartLine
    let foundOpeningBrace = false

    for (let i = methodStartLine; i < lines.length; i++) {
      const line = lines[i]
      braceCount += (line.match(/{/g) || []).length
      braceCount -= (line.match(/}/g) || []).length

      if (braceCount > 0) {
        foundOpeningBrace = true
      }

      if (foundOpeningBrace && braceCount === 0) {
        methodEndLine = i
        break
      }
    }

    return {
      start: methodStartLine + 1,
      end: Math.min(methodEndLine + 1, lines.length),
    }
  } catch (error) {
    console.error(`Error finding method line range in ${filePath}:`, error)
    return null
  }
}

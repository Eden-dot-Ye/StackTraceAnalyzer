import { exec } from "child_process"
import { promisify } from "util"
import { extractPRNumber, getPRUrl } from "./git-advanced"

const execAsync = promisify(exec)

export interface BlameLineResult {
  lineNumber: number
  commitHash: string
  originalLine: number
  author: string
  date: string
  commitMessage: string
}

export interface GitBlameAnalysis {
  commitHash: string
  author: string
  commitDate: string
  commitMessage: string
  prNumber?: string
  prUrl?: string
  prSource?: "github" | "azure"
  inDateRange: boolean
  withinOneYear: boolean
}

/**
 * Perform git blame on specific line range and analyze commits
 * Extended to support 1 year history
 */
export async function analyzeBlameResults(
  filePath: string,
  lineStart: number | null,
  lineEnd: number | null,
  startDate: string,
  projectRoot: string,
): Promise<GitBlameAnalysis[]> {
  try {
    let blameCmd = "git blame -l --incremental"

    if (lineStart !== null && lineEnd !== null) {
      blameCmd += ` -L ${lineStart},${lineEnd}`
    }

    blameCmd += ` "${filePath}"`

    const { stdout } = await execAsync(blameCmd, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024,
    })

    // Parse blame output
    const commitMap = new Map<string, GitBlameAnalysis>()
    const startDateObj = new Date(startDate)
    startDateObj.setHours(0, 0, 0, 0)

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const lines = stdout.split("\n")
    let currentCommit: any = null

    for (const line of lines) {
      if (!line.trim()) continue

      // New commit line format from incremental output
      const commitMatch = line.match(/^([a-f0-9]+)\s+/)
      if (commitMatch && !line.includes("\t")) {
        const hash = commitMatch[1]

        if (!commitMap.has(hash)) {
          currentCommit = {
            commitHash: hash,
            author: "Unknown",
            commitDate: "",
            commitMessage: "",
            inDateRange: false,
            withinOneYear: false,
          }
          commitMap.set(hash, currentCommit)
        }
      }

      // Parse metadata lines
      if (line.startsWith("author ") && currentCommit) {
        currentCommit.author = line.replace("author ", "")
      } else if (line.startsWith("author-time ") && currentCommit) {
        const timestamp = Number.parseInt(line.replace("author-time ", ""))
        currentCommit.commitDate = new Date(timestamp * 1000).toISOString().split("T")[0]
      } else if (line.startsWith("summary ") && currentCommit) {
        const message = line.replace("summary ", "")
        currentCommit.commitMessage = message

        // <CHANGE> Updated PR extraction to use new function that returns prSource
        const { prNumber, prSource } = extractPRNumber(message)
        if (prNumber) {
          currentCommit.prNumber = prNumber
          currentCommit.prSource = prSource
          currentCommit.prUrl = getPRUrl(prNumber, prSource)
        }

        // Check if in user-specified date range
        const commitDateObj = new Date(currentCommit.commitDate)
        commitDateObj.setHours(0, 0, 0, 0)
        currentCommit.inDateRange = commitDateObj >= startDateObj

        currentCommit.withinOneYear = commitDateObj >= oneYearAgo
      }
    }

    const filtered = Array.from(commitMap.values())
      .filter((c) => c.withinOneYear)
      .sort((a, b) => new Date(b.commitDate).getTime() - new Date(a.commitDate).getTime())

    return filtered
  } catch (error) {
    console.error(`Error analyzing blame results:`, error)
    return []
  }
}

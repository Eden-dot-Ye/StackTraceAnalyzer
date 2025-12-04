import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface GitBlameResult {
  commitHash: string
  author: string
  commitDate: string
  commitMessage: string
  prNumber?: string
  prUrl?: string
  inDateRange: boolean
}

const GITHUB_REPO = "https://github.com/WiseTechGlobal/CargoWise"

/**
 * Query git blame for a file and extract commits within date range
 * Uses porcelain format for reliable parsing
 */
export async function queryGitBlame(
  filePath: string,
  lineStart: number | null,
  lineEnd: number | null,
  startDate: string,
  projectRoot: string,
): Promise<GitBlameResult[]> {
  try {
    let blameCmd = "git blame --date=short --line-porcelain"

    if (lineStart !== null && lineEnd !== null) {
      blameCmd += ` -L ${lineStart},${lineEnd}`
    }

    blameCmd += ` "${filePath}"`

    const { stdout } = await execAsync(blameCmd, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024,
    })

    const results: Map<string, GitBlameResult> = new Map()
    const startDateObj = new Date(startDate)
    startDateObj.setHours(0, 0, 0, 0)

    const lines = stdout.split("\n")
    let currentCommit: Partial<GitBlameResult> = {}

    for (const line of lines) {
      if (!line.trim()) continue

      // Commit hash line
      if (line.match(/^[a-f0-9]{40}/)) {
        const parts = line.split("\t")
        const commitHash = parts[0].split(" ")[0]
        currentCommit = { commitHash }
      } else if (line.startsWith("author ")) {
        currentCommit.author = line.replace("author ", "")
      } else if (line.startsWith("author-date ")) {
        const dateStr = line.replace("author-date ", "").split(" ")[0]
        currentCommit.commitDate = dateStr
      } else if (line.startsWith("summary ")) {
        currentCommit.commitMessage = line.replace("summary ", "")

        if (currentCommit.commitHash && !results.has(currentCommit.commitHash)) {
          const commitDateObj = new Date(currentCommit.commitDate || "")
          commitDateObj.setHours(0, 0, 0, 0)
          const inDateRange = commitDateObj >= startDateObj

          const prNumber = extractPRNumber(currentCommit.commitMessage || "")

          results.set(currentCommit.commitHash, {
            commitHash: currentCommit.commitHash,
            author: currentCommit.author || "Unknown",
            commitDate: currentCommit.commitDate || "",
            commitMessage: currentCommit.commitMessage || "",
            prNumber,
            prUrl: prNumber ? `${GITHUB_REPO}/pull/${prNumber}` : undefined,
            inDateRange,
          })
        }
      }
    }

    return Array.from(results.values()).sort(
      (a, b) => new Date(b.commitDate).getTime() - new Date(a.commitDate).getTime(),
    )
  } catch (error) {
    console.error(`Error querying git blame:`, error)
    return []
  }
}

/**
 * Extract PR number from commit message
 * Looks for patterns like "#1234" or "pr-1234"
 */
export function extractPRNumber(commitMessage: string): string | undefined {
  const prMatch = commitMessage.match(/#(\d+)/) || commitMessage.match(/pr[_-](\d+)/i)
  return prMatch ? prMatch[1] : undefined
}

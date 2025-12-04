// <CHANGE> Updated extractPRNumber and PR URL generation to support Azure DevOps (PR 1234) format correctly
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface CommitInfo {
  hash: string
  author: string
  authorEmail: string
  date: string
  timestamp: number
  message: string
  prNumber?: string
  prSource?: "github" | "azure"
}

/**
 * Get detailed commit information using git log
 */
export async function getCommitInfo(commitHash: string, projectRoot: string): Promise<CommitInfo | null> {
  try {
    const format = "%H%n%an%n%ae%n%ai%n%s"
    const { stdout } = await execAsync(`git log -1 --format="${format}" ${commitHash}`, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024,
    })

    const lines = stdout.trim().split("\n")
    if (lines.length < 5) return null

    const date = lines[3]
    const timestamp = new Date(date).getTime()
    const message = lines[4]

    const { prNumber, prSource } = extractPRNumber(message)

    return {
      hash: lines[0],
      author: lines[1],
      authorEmail: lines[2],
      date,
      timestamp,
      message,
      prNumber,
      prSource,
    }
  } catch (error) {
    console.error(`Error getting commit info for ${commitHash}:`, error)
    return null
  }
}

/**
 * Get all commits that changed specific lines in a file
 * More efficient than line-by-line blame
 */
export async function getFileCommitsInDateRange(
  filePath: string,
  startDate: string,
  endDate: string = new Date().toISOString().split("T")[0],
  projectRoot: string,
): Promise<CommitInfo[]> {
  try {
    const format = "%H%n%an%n%ae%n%ai%n%s%n---END---"
    const { stdout } = await execAsync(
      `git log --since="${startDate}" --until="${endDate}" --pretty=format:"${format}" -- "${filePath}"`,
      { cwd: projectRoot, maxBuffer: 10 * 1024 * 1024 },
    )

    const commits: CommitInfo[] = []
    const records = stdout.split("---END---").filter((r) => r.trim())

    for (const record of records) {
      const lines = record.trim().split("\n")
      if (lines.length < 5) continue

      const date = lines[3]
      const message = lines[4]
      const { prNumber, prSource } = extractPRNumber(message)

      commits.push({
        hash: lines[0],
        author: lines[1],
        authorEmail: lines[2],
        date,
        timestamp: new Date(date).getTime(),
        message,
        prNumber,
        prSource,
      })
    }

    return commits.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error(`Error getting file commits:`, error)
    return []
  }
}

/**
 * <CHANGE> Extract PR number with source detection (GitHub or Azure DevOps)
 * Supports: GitHub (#123), Azure DevOps (PR 1234)
 */
export function extractPRNumber(message: string): { prNumber?: string; prSource?: "github" | "azure" } {
  // Try "Merge pull request #123" - GitHub
  let match = message.match(/Merge pull request #(\d+)/)
  if (match) return { prNumber: match[1], prSource: "github" }

  // Try "(#123)" - GitHub format
  match = message.match(/\(#(\d+)\)/)
  if (match) return { prNumber: match[1], prSource: "github" }

  // Try "(PR 1234)" - Azure DevOps format (high priority as it's most common in your logs)
  match = message.match(/\(PR\s+(\d+)\)/)
  if (match) return { prNumber: match[1], prSource: "azure" }

  // Try just "#123" - GitHub format
  match = message.match(/#(\d+)/)
  if (match) return { prNumber: match[1], prSource: "github" }

  // Try just "PR 1234" - Azure DevOps format
  match = message.match(/PR\s+(\d+)/)
  if (match) return { prNumber: match[1], prSource: "azure" }

  return {}
}

/**
 * Generate PR URL based on source
 */
export function getPRUrl(prNumber: string, source?: "github" | "azure"): string {
  if (source === "azure") {
    return `https://devops.wisetechglobal.com/wtg/CargoWise/_git/Dev/pullrequest/${prNumber}`
  }
  // Default to GitHub
  return `https://github.com/WiseTechGlobal/CargoWise/pull/${prNumber}`
}

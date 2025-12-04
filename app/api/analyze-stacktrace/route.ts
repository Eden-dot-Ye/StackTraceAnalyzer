import { type NextRequest, NextResponse } from "next/server"
import { parseStackTrace, deduplicateEntries } from "@/lib/stack-trace-parser"
import { findSourceFile, findMethodLineRange } from "@/lib/file-finder"
import { analyzeBlameResults, type GitBlameAnalysis } from "@/lib/git-blame-refined"

interface AnalysisResult {
  namespace: string
  methodName: string
  filePath: string
  fileFound: boolean
  lineRange: { start: number; end: number } | null
  methodFound: boolean
  gitBlameResults: GitBlameAnalysis[]
  error?: string
}

interface ProgressStep {
  stepNumber: number
  totalSteps: number
  title: string
  description: string
  status: "running" | "complete" | "error"
  percentage: number
  timestamp: string
}

const PROJECT_ROOT = "C:\\git\\GitHub\\WiseTechGlobal\\CargoWise"

const progressSteps: ProgressStep[] = []

function logProgress(
  stepNumber: number,
  totalSteps: number,
  title: string,
  description: string,
  status: "running" | "complete" | "error" = "running",
) {
  const step: ProgressStep = {
    stepNumber,
    totalSteps,
    title,
    description,
    status,
    percentage: Math.round((stepNumber / totalSteps) * 100),
    timestamp: new Date().toISOString(),
  }

  progressSteps.push(step)

  const percentage = Math.round((stepNumber / totalSteps) * 100)
  console.log(`[${stepNumber}/${totalSteps}] ${percentage}% - ${title}: ${description} [${status.toUpperCase()}]`)
}

export async function POST(request: NextRequest) {
  try {
    const { stackTrace, startDate } = await request.json()

    if (!stackTrace || !startDate) {
      return NextResponse.json({ error: "Missing stackTrace or startDate" }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 })
    }

    progressSteps.length = 0
    let stepCounter = 0

    // Step 1: Parse stack trace
    stepCounter++
    logProgress(stepCounter, 1, "Parse Stack Trace", "Extracting stack trace entries", "running")

    let entries = parseStackTrace(stackTrace)
    entries = deduplicateEntries(entries)

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: "No valid custom code entries found in stack trace (filtered out System.* entries)",
        },
        { status: 400 },
      )
    }

    logProgress(stepCounter, entries.length + 1, "Parse Stack Trace", `Found ${entries.length} entries`, "complete")

    // Calculate total steps: 1 parse + 3 per entry
    const totalSteps = 1 + entries.length * 3

    console.log(`Analysis started with ${entries.length} stack trace entries (${totalSteps} total steps)`)

    const results: AnalysisResult[] = []

    // Process each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const baseStep = 1 + i * 3

      try {
        // Step: Find source file
        stepCounter = baseStep + 1
        const fileName = entry.namespace.split(".").pop()
        logProgress(
          stepCounter,
          totalSteps,
          "Find Source File",
          `Locating ${fileName}.cs for ${entry.namespace}`,
          "running",
        )

        const filePath = await findSourceFile(entry.namespace, PROJECT_ROOT)

        if (!filePath) {
          logProgress(
            stepCounter,
            totalSteps,
            "Find Source File",
            `Source file not found for ${entry.namespace}. Manual review needed.`,
            "error",
          )

          results.push({
            namespace: entry.namespace,
            methodName: entry.methodName,
            filePath: "",
            fileFound: false,
            lineRange: null,
            methodFound: false,
            gitBlameResults: [],
            error: "Source file not found. Please manually verify in codebase.",
          })
          continue
        }

        logProgress(stepCounter, totalSteps, "Find Source File", `Found: ${filePath}`, "complete")

        // Step: Find method location
        stepCounter = baseStep + 2
        logProgress(
          stepCounter,
          totalSteps,
          "Find Method Location",
          `Searching for method ${entry.methodName}`,
          "running",
        )

        const lineRange = await findMethodLineRange(filePath, entry.methodName)

        if (!lineRange) {
          logProgress(
            stepCounter,
            totalSteps,
            "Find Method Location",
            `Method ${entry.methodName} not found. May be interface/base class. Manual review needed.`,
            "error",
          )

          results.push({
            namespace: entry.namespace,
            methodName: entry.methodName,
            filePath,
            fileFound: true,
            lineRange: null,
            methodFound: false,
            gitBlameResults: [],
            error: "Method not found in file. May be defined in interface or base class.",
          })
          continue
        }

        logProgress(
          stepCounter,
          totalSteps,
          "Find Method Location",
          `Found at lines ${lineRange.start}-${lineRange.end}`,
          "complete",
        )

        // Step: Query git blame
        stepCounter = baseStep + 3
        logProgress(
          stepCounter,
          totalSteps,
          "Query Git History",
          `Analyzing git blame for lines ${lineRange.start}-${lineRange.end}`,
          "running",
        )

        const gitBlameResults = await analyzeBlameResults(
          filePath,
          lineRange.start,
          lineRange.end,
          startDate,
          PROJECT_ROOT,
        )

        const changesInRange = gitBlameResults.filter((g) => g.inDateRange).length

        logProgress(
          stepCounter,
          totalSteps,
          "Query Git History",
          `Found ${gitBlameResults.length} commits (${changesInRange} in date range)`,
          "complete",
        )

        results.push({
          namespace: entry.namespace,
          methodName: entry.methodName,
          filePath,
          fileFound: true,
          lineRange,
          methodFound: true,
          gitBlameResults,
        })
      } catch (error) {
        stepCounter = baseStep + 3
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`Error processing ${entry.namespace}.${entry.methodName}: ${errorMsg}`)

        logProgress(stepCounter, totalSteps, "Error", `${entry.namespace}.${entry.methodName}: ${errorMsg}`, "error")

        results.push({
          namespace: entry.namespace,
          methodName: entry.methodName,
          filePath: "",
          fileFound: false,
          lineRange: null,
          methodFound: false,
          gitBlameResults: [],
          error: errorMsg,
        })
      }
    }

    console.log(`ANALYSIS COMPLETE`)
    const filesFound = results.filter((r) => r.fileFound).length
    const methodsFound = results.filter((r) => r.methodFound).length
    const withChanges = results.filter((r) => r.gitBlameResults.some((g) => g.inDateRange)).length

    console.log(`Total entries analyzed: ${results.length}`)
    console.log(`Files found: ${filesFound}/${results.length}`)
    console.log(`Methods found: ${methodsFound}/${results.length}`)
    console.log(`Methods with changes in date range: ${withChanges}`)

    return NextResponse.json({
      results,
      summary: {
        totalEntries: results.length,
        filesFound,
        methodsFound,
        withChanges,
        dateRange: {
          startDate,
          endDate: new Date().toISOString().split("T")[0],
        },
      },
      progress: progressSteps,
    })
  } catch (error) {
    console.error(`API Error: ${error instanceof Error ? error.message : String(error)}`)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}

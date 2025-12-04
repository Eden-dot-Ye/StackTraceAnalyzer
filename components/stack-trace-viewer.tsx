"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"

interface GitBlameAnalysis {
  commitHash: string
  author: string
  commitDate: string
  commitMessage: string
  prNumber?: string
  prUrl?: string
  inDateRange: boolean
  lineCount: number
}

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

interface Props {
  stackTrace: string
  results: AnalysisResult[]
}

/**
 * Extract Azure DevOps PR URL if pattern found in commit message
 */
function extractAzureDevOpsPRUrl(prNumber: string | undefined, commitMessage: string): string | undefined {
  if (!prNumber) {
    const match = commitMessage.match(/$$PR\s+(\d+)$$/)
    if (match) {
      return `https://devops.wisetechglobal.com/wtg/CargoWise/_git/Dev/pullrequest/${match[1]}`
    }
  }
  return undefined
}

export function StackTraceViewer({ stackTrace, results }: Props) {
  const [expandedLine, setExpandedLine] = useState<number | null>(null)

  // Parse stack trace lines
  const lines = stackTrace.split("\n").filter((line) => line.trim().startsWith("at"))

  // Create a map for quick result lookup
  const resultMap = new Map<string, AnalysisResult>()
  results.forEach((r) => {
    resultMap.set(`${r.namespace}.${r.methodName}`, r)
  })

  return (
    <Card className="border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="p-4 space-y-1">
        {lines.map((line, idx) => {
          // Extract namespace and method from line
          const match = line.match(/at\s+([\w.]+)\.(\w+)\(/)
          const namespace = match ? match[1] : ""
          const methodName = match ? match[2] : ""
          const key = `${namespace}.${methodName}`
          const result = resultMap.get(key)
          const isExpanded = expandedLine === idx
          const hasChanges = result?.gitBlameResults.some((g) => g.inDateRange) ?? false

          return (
            <div key={idx}>
              <button
                onClick={() => setExpandedLine(isExpanded ? null : idx)}
                className={`w-full text-left p-3 rounded transition-colors ${
                  result
                    ? hasChanges
                      ? "hover:bg-chart-1/10 bg-chart-1/5"
                      : "hover:bg-muted/5"
                    : "hover:bg-muted/3 opacity-75"
                }`}
              >
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!result ? (
                        <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : result.fileFound && result.methodFound ? (
                        <CheckCircle className="w-4 h-4 text-chart-1 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <code className="text-xs font-mono text-foreground truncate flex-1">{line.trim()}</code>
                      {result && hasChanges && (
                        <Badge variant="default" className="text-xs bg-chart-1/90 hover:bg-chart-1 flex-shrink-0">
                          {result.gitBlameResults.filter((g) => g.inDateRange).length} changes
                        </Badge>
                      )}
                    </div>
                  </div>
                  {result && result.gitBlameResults.length > 0 && (
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && result && (
                <div className="px-3 pb-3 space-y-2 bg-muted/20 rounded-b">
                  {!result.fileFound && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700">
                      File not found. Please manually verify in codebase.
                    </div>
                  )}

                  {result.fileFound && !result.methodFound && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700">
                      Method not found. May be defined in interface or base class.
                    </div>
                  )}

                  {result.fileFound && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">File:</span> {result.filePath}
                    </p>
                  )}

                  {result.lineRange && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">Lines:</span> {result.lineRange.start}-{result.lineRange.end}
                    </p>
                  )}

                  {result.gitBlameResults.length > 0 ? (
                    <div className="space-y-1 pt-2 border-t border-border/50">
                      {result.gitBlameResults.map((blame, bidx) => {
                        const azureUrl = extractAzureDevOpsPRUrl(blame.prNumber, blame.commitMessage)
                        const prUrl = blame.prUrl || azureUrl
                        const prSource = blame.prUrl ? "GitHub" : azureUrl ? "Azure DevOps" : undefined

                        return (
                          <div
                            key={bidx}
                            className={`p-2 rounded text-xs transition-colors ${
                              blame.inDateRange
                                ? "border border-chart-1/40 bg-chart-1/10"
                                : "border border-border/30 bg-muted/10"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <code className="text-foreground/70 font-mono">{blame.commitHash.slice(0, 8)}</code>
                                <span className="text-foreground/60 truncate">{blame.author}</span>
                                <span className="text-foreground/50 flex-shrink-0">
                                  {new Date(blame.commitDate).toLocaleDateString()}
                                </span>
                              </div>
                              {blame.inDateRange && (
                                <Badge
                                  variant="outline"
                                  className="text-xs flex-shrink-0 border-chart-1/50 text-chart-1"
                                >
                                  In Range
                                </Badge>
                              )}
                            </div>
                            <p className="text-foreground/80 mb-2 line-clamp-1">{blame.commitMessage}</p>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              {prUrl && (
                                <Button asChild variant="outline" size="sm" className="text-xs h-6 bg-transparent">
                                  <a href={prUrl} target="_blank" rel="noopener noreferrer">
                                    {"PR"} #{blame.prNumber}
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-2">No git blame results found.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

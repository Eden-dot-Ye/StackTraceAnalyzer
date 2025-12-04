"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileText, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react'
import { useState } from "react"

interface GitBlameAnalysis {
  commitHash: string
  author: string
  commitDate: string
  commitMessage: string
  prNumber?: string
  prUrl?: string
  prSource?: "github" | "azure"
  inDateRange: boolean
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
  results: AnalysisResult[]
  summary?: {
    totalEntries: number
    filesFound: number
    methodsFound: number
    withChanges: number
    dateRange: {
      startDate: string
      endDate: string
    }
  }
}

/**
 * Extract Azure DevOps PR URL from commit message if pattern found
 */
function extractAzureDevOpsPRUrl(commitMessage: string): string | undefined {
  const match = commitMessage.match(/\(PR\s+(\d+)\)/)
  if (match) {
    return `https://devops.wisetechglobal.com/wtg/CargoWise/_git/Dev/pullrequest/${match[1]}`
  }
  return undefined
}

export function AnalysisResults({ results, summary }: Props) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpanded = (key: string) => {
    const newSet = new Set(expandedItems)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedItems(newSet)
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card/50 border border-border">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Total Analyzed</p>
              <p className="text-2xl font-bold text-foreground">{summary.totalEntries}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border border-border">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Files Found</p>
              <p className="text-2xl font-bold text-foreground">{summary.filesFound}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border border-border">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">Methods Found</p>
              <p className="text-2xl font-bold text-foreground">{summary.methodsFound}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border border-border">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground mb-1">With Changes</p>
              <p className="text-2xl font-bold text-chart-1">{summary.withChanges}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {results.map((result) => {
          const key = `${result.namespace}.${result.methodName}`
          const isExpanded = expandedItems.has(key)
          const hasChanges = result.gitBlameResults.some((g) => g.inDateRange)

          return (
            <Card
              key={key}
              className={`overflow-hidden border transition-colors ${
                hasChanges ? "border-chart-1/30 bg-chart-1/5" : "border-border bg-card/50"
              }`}
            >
              <button
                onClick={() => toggleExpanded(key)}
                className="w-full text-left p-4 hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {!result.fileFound ? (
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      ) : !result.methodFound ? (
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-chart-1 flex-shrink-0" />
                      )}
                      <code className="text-sm font-mono text-foreground font-semibold truncate">
                        {result.methodName}
                      </code>
                      {hasChanges && (
                        <Badge variant="default" className="text-xs bg-chart-1/90 hover:bg-chart-1">
                          {result.gitBlameResults.filter((g) => g.inDateRange).length} changes
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">{result.namespace}</p>
                    {result.fileFound && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {result.filePath}
                      </p>
                    )}
                    {!result.fileFound && result.error && (
                      <p className="text-xs text-destructive mt-1">Error: {result.error}</p>
                    )}
                    {result.fileFound && !result.methodFound && result.error && (
                      <p className="text-xs text-amber-600 mt-1">Info: {result.error}</p>
                    )}
                  </div>
                  {result.gitBlameResults.length > 0 && (
                    <div className={`transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}>
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </button>

              {isExpanded && result.gitBlameResults.length > 0 && (
                <div className="border-t border-border bg-muted/30 px-4 py-4 space-y-2">
                  {result.gitBlameResults.map((blame, idx) => {
                    const azureUrl = extractAzureDevOpsPRUrl(blame.commitMessage)
                    const prUrl = blame.prUrl || azureUrl
                    const prSource = blame.prSource || (azureUrl ? "azure" : undefined)

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          blame.inDateRange
                            ? "border-chart-1/40 bg-chart-1/10 hover:bg-chart-1/15"
                            : "border-border/50 bg-muted/20 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono text-foreground/70">
                                {blame.commitHash.slice(0, 8)}
                              </code>
                              <span className="text-xs text-muted-foreground">{blame.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(blame.commitDate).toLocaleDateString()}
                              </span>
                            </div>
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
                        <p className="text-sm text-foreground mb-3 line-clamp-2 font-medium">
                          {blame.commitMessage}
                        </p>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {prUrl && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 bg-transparent"
                            >
                              <a href={prUrl} target="_blank" rel="noopener noreferrer">
                                {prSource ? `${prSource} #${blame.prNumber}` : `PR #${blame.prNumber}`}
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {result.gitBlameResults.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Showing up to 1 year of change history
                    </p>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

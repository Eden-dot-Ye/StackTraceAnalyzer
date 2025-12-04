"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle, GitBranch, CheckCircle2, Info, Copy } from 'lucide-react'
import { AnalysisResults } from "./analysis-results"
import { StackTraceViewer } from "./stack-trace-viewer"

interface AnalysisResult {
  namespace: string
  methodName: string
  filePath: string
  fileFound: boolean
  lineRange: { start: number; end: number } | null
  methodFound: boolean
  gitBlameResults: Array<{
    commitHash: string
    author: string
    commitDate: string
    commitMessage: string
    prNumber?: string
    prUrl?: string
    inDateRange: boolean
    lineCount: number
  }>
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

export function StackTraceAnalyzer() {
  const [stackTrace, setStackTrace] = useState("")
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showHelp, setShowHelp] = useState(false)
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [showProgressDetail, setShowProgressDetail] = useState(true)

  useEffect(() => {
    const progressContainer = document.getElementById("progress-logs")
    if (progressContainer) {
      setTimeout(() => {
        progressContainer.scrollTop = progressContainer.scrollHeight
      }, 0)
    }
  }, [progressSteps])

  const handleAnalyze = async () => {
    if (!stackTrace.trim()) {
      setError("Please enter a stack trace")
      setSuccess("")
      return
    }

    if (!startDate) {
      setError("Please select a start date")
      setSuccess("")
      return
    }

    setIsLoading(true)
    setError("")
    setSuccess("")
    setResults([])
    setProgressSteps([])
    setShowProgressDetail(true)

    try {
      const response = await fetch("/api/analyze-stacktrace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stackTrace,
          startDate,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to analyze stack trace")
        return
      }

      if (data.progress) {
        setProgressSteps(data.progress)
      }

      setResults(data.results || [])

      if (data.results && data.results.length > 0) {
        const filesFound = data.results.filter((r: any) => r.fileFound).length
        const methodsFound = data.results.filter((r: any) => r.methodFound).length
        const withChanges = data.results.filter((r: any) =>
          r.gitBlameResults.some((g: any) => g.inDateRange),
        ).length
        setSuccess(
          `Analysis complete: ${filesFound} files found, ${methodsFound} methods located, ${withChanges} with changes in date range`,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during analysis")
      console.error("Analysis error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const copyExample = () => {
    const example = `at Enterprise.Core.Forms.ZGridColumnStyle.GetColumnValueAtRowCore(CurrencyManager source, Int32 rowNum)
    at Enterprise.Core.Forms.ZGridColumnStyle.ColumnTextAtRow(CurrencyManager source, Int32 rowNum)
    at Enterprise.ZArchitecture.ZCustomControlColumnStyle.Paint(Graphics graphics, Rectangle bounds, CurrencyManager source, Int32 paintingRowNum, Brush backBrush, Brush foreBrush, Boolean alignToRight)
    at Enterprise.ZArchitecture.Core.BaseExceptionReporter.ReportException(String key, Exception ex)`
    setStackTrace(example)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/20">
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <GitBranch className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Stack Trace Analyzer</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Automatically parse stack traces, locate source files, and identify code changes with Git Blame insights
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-8">
          {/* Input Section */}
          <Card className="border border-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Input Stack Trace</CardTitle>
                  <CardDescription>
                    Paste your full stack trace. The tool automatically filters System.* entries and analyzes custom
                    code.
                  </CardDescription>
                </div>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  <Info className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {showHelp && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2 text-sm text-foreground">
                  <p className="font-semibold">How it works:</p>
                  <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Paste your complete stack trace from error logs</li>
                    <li>Select the date you want to start searching from</li>
                    <li>The tool finds each method in your source code</li>
                    <li>Git Blame shows who changed each line and when</li>
                    <li>PR links help you review the actual changes</li>
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Stack Trace Content</label>
                <Textarea
                  value={stackTrace}
                  onChange={(e) => setStackTrace(e.target.value)}
                  placeholder="Paste your stack trace here... (lines starting with 'at' will be analyzed)"
                  className="min-h-48 font-mono text-sm resize-vertical"
                  disabled={isLoading}
                />
                <button
                  onClick={copyExample}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Load example
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={isLoading}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">End date automatically set to today</p>
                </div>
              </div>

              {error && (
                <div className="flex gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Error</p>
                    <p className="text-sm text-destructive/80">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="flex gap-3 p-4 rounded-lg bg-chart-1/10 border border-chart-1/30">
                  <CheckCircle2 className="w-5 h-5 text-chart-1 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-chart-1">{success}</p>
                </div>
              )}

              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full sm:w-auto h-10" size="lg">
                {isLoading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Analyzing...
                  </>
                ) : (
                  "Analyze Stack Trace"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Progress Display */}
          {isLoading && progressSteps.length > 0 && (
            <Card className="border border-chart-1/30 bg-chart-1/5 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Analysis Progress</CardTitle>
                    <CardDescription className="mt-1">
                      {progressSteps.length > 0 && (
                        <span>
                          Step {progressSteps[progressSteps.length - 1].stepNumber} of
                          {progressSteps[0].totalSteps} -
                          {Math.round(
                            (progressSteps.filter((s) => s.status === "complete").length /
                              progressSteps[0].totalSteps) *
                              100,
                          )}
                          % complete
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <button
                    onClick={() => setShowProgressDetail(!showProgressDetail)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showProgressDetail ? "Hide Details" : "Show Details"}
                  </button>
                </div>
              </CardHeader>
              {showProgressDetail && (
                <CardContent>
                  <div id="progress-logs" className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
                    {progressSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border flex items-start gap-2 transition-colors ${
                          step.status === "complete"
                            ? "bg-chart-1/10 border-chart-1/30 text-foreground"
                            : step.status === "error"
                              ? "bg-destructive/10 border-destructive/30 text-destructive"
                              : "bg-muted/50 border-border text-muted-foreground"
                        }`}
                      >
                        <span className="flex-shrink-0 font-semibold text-foreground w-8">[{step.stepNumber}]</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{step.title}</p>
                          {step.description && (
                            <p className="text-xs opacity-70 truncate">{step.description}</p>
                          )}
                          <p className="text-xs opacity-60 mt-1">{step.timestamp}</p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-1">
                          <span className="font-semibold">{step.percentage}%</span>
                          {step.status === "complete" && (
                            <CheckCircle2 className="w-4 h-4 text-chart-1" />
                          )}
                          {step.status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                          {step.status === "running" && <Spinner className="w-4 h-4" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Results Section with Integrated Stack Trace Viewer */}
          {results.length > 0 && (
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-chart-1" />
                <h2 className="text-xl font-semibold text-foreground">Analysis Results</h2>
              </div>
              {/* Show stack trace viewer with analysis results integrated */}
              <StackTraceViewer stackTrace={stackTrace} results={results} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

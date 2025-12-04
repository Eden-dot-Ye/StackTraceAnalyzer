/**
 * Progress tracker for real-time analysis updates
 * Logs detailed information about each step of the analysis
 */

export interface ProgressStep {
  stepNumber: number
  totalSteps: number
  stepName: string
  details: string
  status: "pending" | "running" | "success" | "error"
  percentage: number
  timestamp: string
}

export class ProgressTracker {
  private steps: ProgressStep[] = []
  private currentStepNumber = 0
  private totalSteps = 0
  private observers: ((step: ProgressStep) => void)[] = []

  constructor(totalSteps: number) {
    this.totalSteps = totalSteps
  }

  subscribe(observer: (step: ProgressStep) => void) {
    this.observers.push(observer)
    // Send all existing steps to new observer
    for (const step of this.steps) {
      observer(step)
    }
  }

  private notify(step: ProgressStep) {
    this.observers.forEach((observer) => observer(step))
  }

  startStep(stepName: string, details = "") {
    this.currentStepNumber++
    const percentage = Math.round((this.currentStepNumber / this.totalSteps) * 100)
    const step: ProgressStep = {
      stepNumber: this.currentStepNumber,
      totalSteps: this.totalSteps,
      stepName,
      details,
      status: "running",
      percentage,
      timestamp: new Date().toLocaleTimeString(),
    }

    this.steps.push(step)
    this.notify(step)

    // Also log to console for server-side debugging
    console.log(`STEP ${step.stepNumber}/${this.totalSteps}: ${stepName}${details ? ` - ${details}` : ""}`)

    return step.stepNumber
  }

  completeStep(stepNumber: number, details = "") {
    const step = this.steps[stepNumber - 1]
    if (step) {
      step.status = "success"
      step.details = details
      const percentage = Math.round((step.stepNumber / this.totalSteps) * 100)
      step.percentage = percentage
      step.timestamp = new Date().toLocaleTimeString()

      this.notify(step)

      console.log(
        `STEP ${step.stepNumber}/${this.totalSteps}: ${step.stepName} - SUCCESS${details ? ` (${details})` : ""}`,
      )
    }
  }

  errorStep(stepNumber: number, error: string) {
    const step = this.steps[stepNumber - 1]
    if (step) {
      step.status = "error"
      step.details = error
      step.timestamp = new Date().toLocaleTimeString()

      this.notify(step)

      console.error(`STEP ${step.stepNumber}/${this.totalSteps}: ${step.stepName} - ERROR: ${error}`)
    }
  }

  getSteps(): ProgressStep[] {
    return this.steps
  }
}

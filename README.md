# Stack Trace Analyzer

A powerful tool for analyzing .NET application stack traces, automatically identifying source code, and providing Git blame insights with PR information.

## Features

- **Automatic Stack Trace Parsing** - Intelligently extracts namespaces and method names from stack traces
- **Source File Location** - Automatically finds corresponding C# files in your project
- **Namespace Matching** - Intelligent file matching that selects the best match when multiple files exist
- **Git Blame Analysis** - Retrieves commit history for analyzed methods
- **PR Link Extraction** - Automatically extracts GitHub and Azure DevOps PR numbers
- **Date Range Filtering** - Shows changes within your specified date range, plus history up to 1 year
- **Integrated Results View** - Stack trace viewer with inline analysis results
- **Progress Tracking** - Real-time analysis progress with detailed step information
- **Modern UI** - Clean, professional interface with comprehensive results

## Quick Start

### Prerequisites

- Node.js 18+
- Git (system-installed)
- Windows environment
- Local git project path: `C:\git\GitHub\WiseTechGlobal\CargoWise`

### Installation and Running

1. Download the project code
2. Install dependencies:
   ```bash
   npm install
   ```
1. Run in development mode:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser

## How It Works

```
Input Stack Trace and Date Range
              ↓
Parse and extract namespace/method pairs
              ↓
Locate source files in project (with namespace matching)
              ↓
Find method line ranges in source files
              ↓
Query Git history for changes in date range
              ↓
Extract PR numbers and generate links
              ↓
Display results with full Git blame information
```

## Result Interpretation

### Status Indicators

- **Checkmark (✓)** - File found and method located successfully
- **Warning (⚠)** - File found but method not located (may be in interface/base class)
- **Error (✕)** - File not found in project

### Git Blame Details

Each commit shows:

- **Commit Hash** - Git SHA-1 (first 8 characters)
- **Author** - Commit author name
- **Date** - Commit date
- **Message** - Commit message
- **In Range Badge** - Indicates if commit is within your selected date range
- **Lines Changed** - Number of lines modified in this commit
- **PR Link** - Direct link to GitHub or Azure DevOps PR

## Configuration

### Changing Project Root Path

Edit `app/api/analyze-stacktrace/route.ts` and modify the `PROJECT_ROOT` constant:

```typescript
const PROJECT_ROOT = "C:\\your\\project\\path"
```

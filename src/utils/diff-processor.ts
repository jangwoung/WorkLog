import type { DiffStats } from '@/src/models/pr-event.model';

/**
 * Cost-aware diff processor
 * Truncates large diffs to reduce LLM token usage while preserving key information
 */

const MAX_DIFF_LINES = 5000; // Configurable limit for diff processing

export interface ProcessedDiff {
  content: string;
  stats: DiffStats;
  truncated: boolean;
}

/**
 * Process diff content for LLM consumption
 * Truncates to first N lines and calculates statistics
 */
export function processDiff(diffContent: string): ProcessedDiff {
  const lines = diffContent.split('\n');
  const totalLines = lines.length;
  const truncated = totalLines > MAX_DIFF_LINES;

  // Truncate if necessary
  const processedLines = truncated ? lines.slice(0, MAX_DIFF_LINES) : lines;
  const content = processedLines.join('\n');

  // Calculate statistics
  const stats = calculateDiffStats(diffContent);

  return {
    content,
    stats,
    truncated,
  };
}

/**
 * Calculate diff statistics from full diff content
 */
function calculateDiffStats(diffContent: string): DiffStats {
  const lines = diffContent.split('\n');
  
  let filesChanged = 0;
  let additions = 0;
  let deletions = 0;
  let currentFile: string | null = null;

  for (const line of lines) {
    // Detect file changes
    if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++')) {
      if (line.startsWith('diff --git')) {
        filesChanged++;
      }
    }
    // Count additions and deletions
    else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  // Ensure at least 1 file if diff is not empty
  if (filesChanged === 0 && diffContent.trim().length > 0) {
    filesChanged = 1;
  }

  return {
    filesChanged,
    additions,
    deletions,
    totalLines: lines.length,
  };
}

/**
 * Summarize truncated diff remainder (optional)
 * Can be used to provide context about what was truncated
 */
export function summarizeTruncatedDiff(originalLines: number, processedLines: number): string {
  const truncatedLines = originalLines - processedLines;
  if (truncatedLines <= 0) {
    return '';
  }

  return `[Note: ${truncatedLines} additional lines were truncated to reduce processing cost. Full diff available in PR.]`;
}

import { generateContent } from '@/src/infrastructure/vertex-ai/client';
import { validateAssetCard, ASSET_CARD_SCHEMA_VERSION } from '@/src/schemas/asset-card-schema';
import type { AssetCardSchema } from '@/src/schemas/asset-card-schema';
import type { PREvent, DiffStats } from '@/src/models/pr-event.model';
import { logger } from '@/src/utils/logger';

/**
 * LLM Pipeline for AssetCard generation
 * Implements Extract → Synthesize pattern with fixed schema validation
 */

export interface LLMPipelineInput {
  prEvent: PREvent;
  diffContent: string;
  diffStats?: DiffStats;
}

export interface LLMPipelineOutput {
  assetCard: AssetCardSchema;
  valid: boolean;
  errors?: string[];
}

const MAX_RETRIES = 2;

/**
 * Extract structured facts from PR context
 * Step 1 of Extract → Synthesize pipeline
 */
async function extractFacts(input: LLMPipelineInput): Promise<string> {
  const { prEvent, diffContent, diffStats } = input;

  const extractPrompt = `You are analyzing a GitHub Pull Request to extract structured facts.

PR Title: ${prEvent.prTitle}
PR Description: ${prEvent.prDescription || 'No description'}
PR Author: ${prEvent.prAuthor}
PR URL: ${prEvent.prUrl}

Diff Statistics:
- Files Changed: ${diffStats?.filesChanged || 0}
- Additions: ${diffStats?.additions || 0}
- Deletions: ${diffStats?.deletions || 0}
- Total Lines: ${diffStats?.totalLines || 0}

Diff Content:
\`\`\`
${diffContent}
\`\`\`

Extract the following structured facts:
1. What technologies, frameworks, or tools were used or modified?
2. What specific changes or contributions were made?
3. What was the business or technical impact?
4. Are there any quantifiable metrics (performance improvements, bug fixes, etc.)?

Provide a structured summary of these facts in JSON format:
{
  "technologies": ["tech1", "tech2"],
  "contributions": ["contribution1", "contribution2"],
  "impact": "description of impact",
  "metrics": "quantifiable metrics if available"
}`;

  try {
    const response = await generateContent({
      prompt: extractPrompt,
      model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro',
      temperature: 0.3, // Lower temperature for more deterministic extraction
    });

    return response;
  } catch (error) {
    logger.error('Extract step failed', error, { prEventId: prEvent.prEventId });
    throw error;
  }
}

/**
 * Synthesize AssetCard from extracted facts
 * Step 2 of Extract → Synthesize pipeline
 */
async function synthesizeAssetCard(
  extractedFacts: string,
  input: LLMPipelineInput
): Promise<AssetCardSchema> {
  const { prEvent } = input;

  const synthesizePrompt = `You are creating a structured career asset from extracted PR facts.

PR Context:
- Title: ${prEvent.prTitle}
- Author: ${prEvent.prAuthor}
- URL: ${prEvent.prUrl}

Extracted Facts:
${extractedFacts}

Create a structured AssetCard that:
1. Has a concise title (max 100 chars) summarizing the work
2. Has a detailed description (max 500 chars) of what was accomplished
3. Describes the impact (max 300 chars) - business or technical value
4. Lists technologies used (max 10 items)
5. Lists specific contributions (max 5 items)
6. Includes metrics if available (max 200 chars, optional)

Return ONLY valid JSON matching this exact schema:
{
  "title": "string (max 100 chars)",
  "description": "string (max 500 chars)",
  "impact": "string (max 300 chars)",
  "technologies": ["string", ...] (max 10 items),
  "contributions": ["string", ...] (max 5 items),
  "metrics": "string (max 200 chars, optional)"
}

Do not include any additional text or explanation, only the JSON object.`;

  try {
    const response = await generateContent({
      prompt: synthesizePrompt,
      model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-pro',
      temperature: 0.5, // Slightly higher for more natural synthesis
    });

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const assetCard = JSON.parse(jsonMatch[0]) as AssetCardSchema;
    return assetCard;
  } catch (error) {
    logger.error('Synthesize step failed', error, { prEventId: prEvent.prEventId });
    throw error;
  }
}

/**
 * Run Extract → Synthesize LLM pipeline with retries
 * Validates output against fixed schema
 */
export async function runLLMPipeline(
  input: LLMPipelineInput,
  retryCount = 0
): Promise<LLMPipelineOutput> {
  try {
    // Step 1: Extract facts
    logger.info('Running Extract step', { prEventId: input.prEvent.prEventId, retryCount });
    const extractedFacts = await extractFacts(input);

    // Step 2: Synthesize AssetCard
    logger.info('Running Synthesize step', { prEventId: input.prEvent.prEventId, retryCount });
    const assetCard = await synthesizeAssetCard(extractedFacts, input);

    // Step 3: Validate against schema
    const validation = validateAssetCard(assetCard);

    if (validation.valid) {
      logger.info('LLM pipeline succeeded', {
        prEventId: input.prEvent.prEventId,
        retryCount,
      });
      return {
        assetCard,
        valid: true,
      };
    } else {
      // Retry if validation fails and retries remaining
      if (retryCount < MAX_RETRIES) {
        logger.warn('LLM output validation failed, retrying', {
          prEventId: input.prEvent.prEventId,
          retryCount,
          errors: validation.errors,
        });
        return runLLMPipeline(input, retryCount + 1);
      } else {
        // Max retries reached, return invalid result
        logger.error('LLM pipeline failed after max retries', {
          prEventId: input.prEvent.prEventId,
          retryCount,
          errors: validation.errors,
        });
        return {
          assetCard,
          valid: false,
          errors: validation.errors?.map((e) => `${e.field}: ${e.message}`),
        };
      }
    }
  } catch (error) {
    logger.error('LLM pipeline error', error, {
      prEventId: input.prEvent.prEventId,
      retryCount,
    });

    // Retry on error if retries remaining
    if (retryCount < MAX_RETRIES) {
      logger.warn('LLM pipeline error, retrying', {
        prEventId: input.prEvent.prEventId,
        retryCount,
      });
      return runLLMPipeline(input, retryCount + 1);
    }

    throw error;
  }
}

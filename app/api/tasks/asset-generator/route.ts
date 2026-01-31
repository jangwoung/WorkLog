import { POST as assetGeneratorHandler } from '@/workers/asset-generator/src/index';

/**
 * API route for asset generator worker
 * Invoked by Cloud Tasks
 */
export const POST = assetGeneratorHandler;

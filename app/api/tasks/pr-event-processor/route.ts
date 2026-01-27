import { POST as prEventProcessorHandler } from '@/workers/pr-event-processor/src/index';

/**
 * API route for PR event processor worker
 * Invoked by Cloud Tasks
 */
export const POST = prEventProcessorHandler;

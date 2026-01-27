import { CloudTasksClient } from '@google-cloud/tasks';

/**
 * Cloud Tasks client for enqueueing async tasks
 * Used for PR event processing and asset generation
 */

let tasksClient: CloudTasksClient | null = null;

export function getCloudTasksClient(): CloudTasksClient {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient();
  }
  return tasksClient;
}

export interface EnqueueTaskOptions {
  queueName: string;
  location: string;
  taskName?: string; // For idempotency
  payload: unknown;
  scheduleTime?: Date;
}

/**
 * Enqueue a task to Cloud Tasks queue
 * @param options Task configuration
 * @returns Task name (for tracking/idempotency)
 */
export async function enqueueTask(options: EnqueueTaskOptions): Promise<string> {
  const client = getCloudTasksClient();
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = options.location || process.env.CLOUD_TASKS_LOCATION;
  const queue = options.queueName || process.env.CLOUD_TASKS_QUEUE_NAME;

  if (!project || !location || !queue) {
    throw new Error('Missing required Cloud Tasks configuration: GOOGLE_CLOUD_PROJECT, CLOUD_TASKS_LOCATION, CLOUD_TASKS_QUEUE_NAME');
  }

  const parent = client.queuePath(project, location, queue);

  const scheduleTime = options.scheduleTime
    ? { seconds: Math.floor(options.scheduleTime.getTime() / 1000), nanos: 0 }
    : undefined;

  const task = {
    name: options.taskName ? client.taskPath(project, location, queue, options.taskName) : undefined,
    httpRequest: {
      httpMethod: 'POST' as const,
      url: process.env.CLOUD_TASKS_HANDLER_URL || 'http://localhost:3000/api/tasks/process',
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(options.payload)).toString('base64'),
    },
    ...(scheduleTime && { scheduleTime }),
  };

  const result = await client.createTask({ parent, task });
  const response = Array.isArray(result) ? result[0] : result;

  if (!response?.name) {
    throw new Error('Failed to create task: no task name returned');
  }

  return response.name;
}

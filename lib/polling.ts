/**
 * Smart polling mechanism with exponential backoff
 * Optimizes API calls and reduces server load
 */

interface PollingConfig {
  baseInterval: number;      // Base polling interval in ms
  maxInterval: number;       // Maximum interval in ms
  backoffMultiplier: number;  // Multiplier for exponential backoff
  resetOnSuccess: boolean;    // Reset interval on successful fetch
}

class SmartPoller {
  private interval: number;
  private timeoutId: NodeJS.Timeout | null = null;
  private config: PollingConfig;
  private callback: () => Promise<void>;
  private isRunning: boolean = false;
  private consecutiveErrors: number = 0;

  constructor(
    callback: () => Promise<void>,
    config: Partial<PollingConfig> = {}
  ) {
    this.callback = callback;
    this.config = {
      baseInterval: 5000,        // 5 seconds default
      maxInterval: 60000,        // 1 minute max
      backoffMultiplier: 1.5,    // 1.5x backoff
      resetOnSuccess: true,
      ...config,
    };
    this.interval = this.config.baseInterval;
  }

  /**
   * Start polling
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.consecutiveErrors = 0;
    this.interval = this.config.baseInterval;
  }

  /**
   * Execute poll with error handling and backoff
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.callback();
      // Success: reset interval and error count
      if (this.config.resetOnSuccess) {
        this.interval = this.config.baseInterval;
        this.consecutiveErrors = 0;
      }
    } catch (error) {
      // Error: increase interval with exponential backoff
      this.consecutiveErrors++;
      this.interval = Math.min(
        this.interval * this.config.backoffMultiplier,
        this.config.maxInterval
      );
      console.warn(`Polling error (${this.consecutiveErrors}):`, error);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.timeoutId = setTimeout(() => this.poll(), this.interval);
    }
  }

  /**
   * Get current interval
   */
  getInterval(): number {
    return this.interval;
  }

  /**
   * Get consecutive error count
   */
  getErrorCount(): number {
    return this.consecutiveErrors;
  }

  /**
   * Reset to base interval (useful for manual reset)
   */
  reset(): void {
    this.interval = this.config.baseInterval;
    this.consecutiveErrors = 0;
  }
}

export default SmartPoller;


type AttemptState = {
  count: number;
  firstAttemptAt: number;
  cooldownUntil?: number;
  lockedUntil?: number;
};

type StateOptions = {
  windowMs: number;
  cooldownMs: number;
  lockoutMs: number;
  maxAttempts: number;
};

const DEFAULT_OPTIONS: StateOptions = {
  windowMs: 10 * 60 * 1000,
  cooldownMs: 30 * 1000,
  lockoutMs: 10 * 60 * 1000,
  maxAttempts: 5,
};

export class SecurityState {
  private attempts = new Map<string, AttemptState>();
  private options: StateOptions;

  constructor(options: Partial<StateOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  isLocked(key: string) {
    const state = this.attempts.get(key);
    if (!state) return false;
    const now = Date.now();
    return Boolean(state.lockedUntil && state.lockedUntil > now);
  }

  getCooldownUntil(key: string) {
    const state = this.attempts.get(key);
    if (!state) return null;
    const now = Date.now();
    if (state.cooldownUntil && state.cooldownUntil > now) return state.cooldownUntil;
    return null;
  }

  registerFailure(key: string) {
    const now = Date.now();
    const state = this.attempts.get(key) ?? { count: 0, firstAttemptAt: now };

    if (now - state.firstAttemptAt > this.options.windowMs) {
      state.count = 0;
      state.firstAttemptAt = now;
    }

    state.count += 1;
    state.cooldownUntil = now + this.options.cooldownMs;

    if (state.count >= this.options.maxAttempts) {
      state.lockedUntil = now + this.options.lockoutMs;
    }

    this.attempts.set(key, state);
  }

  reset(key: string) {
    this.attempts.delete(key);
  }
}

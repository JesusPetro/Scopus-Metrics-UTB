export class ScopusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ScopusAuthError extends ScopusError {
  constructor(message = "Invalid apikey or insttoken (401/403).") {
    super(message);
  }
}

export class ScopusRateLimitError extends ScopusError {
  constructor(message = "Rate limit reached (429).") {
    super(message);
  }
}

export class ScopusConnectionError extends ScopusError {
  constructor(message = "Network error while requesting the Elsevier API.") {
    super(message);
  }
}

export class ScopusResponseError extends ScopusError {
  statusCode: number;
  constructor(statusCode: number, detail = "Invalid response from Elsevier") {
    super(`HTTP ${statusCode}: ${detail}`);
    this.statusCode = statusCode;
  }
}

export class ScopusSchemaError extends ScopusError {
  constructor(message: string) {
    super(message);
  }
}

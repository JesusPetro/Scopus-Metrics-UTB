class ScopusError(Exception):
    """Base exception for all Scopus-related errors."""
    pass


class ScopusAuthError(ScopusError):
    """Authentication error (invalid API key or insttoken)."""
    def __init__(self, message: str = "Authentication error with Elsevier API"):
        super().__init__(message)


class ScopusConnectionError(ScopusError):
    """HTTP connection error with Elsevier API."""
    def __init__(self, message: str = "Could not connect to Elsevier API"):
        super().__init__(message)


class ScopusRateLimitError(ScopusError):
    """Too many requests sent to Elsevier API (HTTP 429)."""
    def __init__(self, message: str = "Rate limit reached for Elsevier API"):
        super().__init__(message)


class ScopusResponseError(ScopusError):
    """Invalid or unexpected response from Elsevier API."""
    def __init__(self, status_code: int, detail: str = "Invalid response from Elsevier"):
        self.status_code = status_code
        super().__init__(f"{detail} (HTTP {status_code})")


class ElsevierSchemaError(RuntimeError):
    """Indicates that the JSON response does not match the expected Elsevier/Scopus schema."""
    pass
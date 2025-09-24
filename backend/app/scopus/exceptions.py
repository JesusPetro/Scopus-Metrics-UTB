class ScopusError(Exception):
    """Excepción base para todos los errores relacionados con Scopus."""
    pass


class ScopusAuthError(ScopusError):
    """Error de autenticación (apikey o insttoken inválido)."""
    def __init__(self, message="Error de autenticación con Elsevier API"):
        super().__init__(message)


class ScopusConnectionError(ScopusError):
    """Error de conexión HTTP con Elsevier API."""
    def __init__(self, message="No se pudo conectar con Elsevier API"):
        super().__init__(message)


class ScopusRateLimitError(ScopusError):
    """Cuando Elsevier responde con demasiadas peticiones (HTTP 429)."""
    def __init__(self, message="Se alcanzó el límite de peticiones a Elsevier API"):
        super().__init__(message)


class ScopusResponseError(ScopusError):
    """Cuando la respuesta de Elsevier es inválida o inesperada."""
    def __init__(self, status_code: int, detail: str = "Respuesta inválida de Elsevier"):
        self.status_code = status_code
        super().__init__(f"{detail} (HTTP {status_code})")

import os
import requests, json, time
import app.core.logging as log_util


from pathlib import Path
from app.core.config import settings
from typing import Any, Dict, List, Optional
from app.scopus.exceptions import * 

logger = log_util.get_logger(__name__)

# loggin.log_to_directory("logs")

class ElsClient:
    #TODO: Pasar todo esto a un .env
    __url_base = 'https://api.elsevier.com/'
    __user_agent = "scopus-metrics-utb-v%s" % settings.APP_VERSION
    __min_req_interval = 1
    __ts_last_req = time.time()

    def __init__(
        self, 
        num_res: Optional[int] = 25, 
        local_dir: Optional[str | Path] = None
    ):
        self.api_key = settings.ELSEVIER_APIKEY
        self.inst_token = settings.ELSEVIER_INSTTOKEN
        self.num_res = num_res

        # Validación de credenciales
        if not self.api_key:
            msg = 'Missing ELSEVIER_APIKEY in the environment (.env)'
            logger.warning(msg)
            raise ScopusAuthError(msg)

        if local_dir is None: 
            self.local_dir = Path.cwd()  / 'data'
        else:
            self.local_dir = Path(local_dir)

        if not self.local_dir.exists():
            self.local_dir.mkdir()


    # properties
    @property
    def api_key(self):
        """Get the apiKey for the client instance"""
        return self._api_key
    
    @api_key.setter
    def api_key(self, api_key):
        """Set the apiKey for the client instance"""
        self._api_key = api_key

    @property
    def inst_token(self):
        """Get the instToken for the clien instance"""
        return self._inst_token
    
    @inst_token.setter
    def inst_token(self, inst_token):
        """Set the instToken for the client instance"""
        self._inst_token = inst_token

    @property
    def num_res(self):
        """Gets the max. number of results to be used by the client instance"""
        return self._num_res
    
    @num_res.setter
    def num_res(self, numRes):
        """Sets the max. number of results to be used by the client instance"""
        self._num_res = numRes

    @property
    def local_dir(self):
        """Gets the currently configured local path to write data to."""
        return self._local_dir

    @local_dir.setter
    def local_dir(self, path):
        """Sets the local path to write data to."""
        self._local_dir = Path(path)

    @property
    def req_status(self):
        '''Return the status of the request response, '''
        return {'status_code': self._status_code, 'status_msg': self._status_msg}
    
    def _handle_http_error(self, r: requests.Response, url: str) -> None:
        body = r.text
        status = r.status_code
        self._status_code = r.status_code
        base_msg = f"HTTP {status} desde {url}. Respuesta: {body}"

        if status in (401, 403):
            self._status_msg = "Error de autenticación"
            logger.error(self._status_msg + f" | {base_msg}")
            raise ScopusAuthError("apikey o insttoken inválidos (401/403).")
        elif status == 429:
            self._status_msg = "Rate limit alcanzado"
            logger.warning(self._status_msg + f" | {base_msg}")
            raise ScopusRateLimitError()
        elif 500 <= status <= 599:
            self._status_msg = "Error de servidor Elsevier"
            logger.error(self._status_msg + f" | {base_msg}")
            raise ScopusConnectionError(f"Elsevier respondió {status}. Intenta reintentar más tarde.")
        else:
            self._status_msg = "Respuesta inválida de Elsevier"
            logger.error(self._status_msg + f" | {base_msg}")
            raise ScopusResponseError(status_code=status, detail="Respuesta inválida de Elsevier")

    # acces functions
    def get_base_url(self):
        """Returns the ELSAPI base URL currently configured for the client"""
        return self.__url_base

    # request/response functions
    def exec_request(self, URL, params: Optional[Dict[str, Any]] = None):
        """Sends the actual request; returns response"""

        interval = time.time() - self.__ts_last_req
        if (interval < self.__min_req_interval):
            time.sleep(self.__min_req_interval - interval)

        # Construct and execute request
        headers = {
            "X-ELS-APIKey"  : self.api_key,
            "User-Agent"    : self.__user_agent,
            "Accept"        : 'application/json'
        }

        if self.inst_token:
            headers["X-ELS-Insttoken"] = self.inst_token
            
        logger.info('Sending GET request to ' + URL)

        try: 
            r = requests.get(
                URL, 
                headers=headers, 
                params=params
            )
        except (requests.Timeout, requests.ConnectTimeout) as e:
            self._status_code = None
            self._status_msg = "Timeout conectando a Elsevier"
            logger.error(f"{self._status_msg}: {e}")
            raise ScopusConnectionError("Tiempo de espera agotado al conectar con Elsevier API.")   
        except requests.ConnectionError as e:
            self._status_code = None
            self._status_msg = "Error de conexión"
            logger.error(f"{self._status_msg}: {e}")
            raise ScopusConnectionError("No se pudo establecer conexión con Elsevier API.")     
        except requests.RequestException as e:
            # Errores genéricos de requests
            self._status_code = None
            self._status_msg = "Error de cliente HTTP"
            logger.error(f"{self._status_msg}: {e}")
            raise ScopusConnectionError("Error de red al consultar Elsevier API.")

        self.__ts_last_req = time.time()
        self._status_code = r.status_code

        if r.status_code == 200:
            self._status_msg = 'data retrieved'
            logger.info(f'HTTP {self._status_code} {self._status_msg}')
            return r.json()
        

        self._handle_http_error(r=r, url=URL)

        """ else:
            msg = (
                f"HTTP {r.status_code} Error from {URL} "
                f"and using headers: {r.text}"
            )

            self._status_msg = msg
            logger.error(msg)           
            raise requests.HTTPError(msg) """

elsClient = ElsClient()
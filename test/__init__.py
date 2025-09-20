version = '0.0.1'

from log_util import LOGGERS, add_file_handle_to_logger


def log_to_directory(dirpath, logger_names = None):
    if logger_names is None:
        logger_names = LOGGERS.keys()
    
    assert all(ln in LOGGERS for ln in logger_names), \
        f"Unknow loggers! {logger_names}"
    
    for ln in logger_names:
        add_file_handle_to_logger(LOGGERS[ln], dirpath)
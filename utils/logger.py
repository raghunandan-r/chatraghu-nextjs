import logging
import sys
import json
from datetime import datetime
from typing import Any
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record: dict[str, Any], record: logging.LogRecord, message_dict: dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record.update({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "environment": "production" if not sys.gettrace() else "development",
            "service": "nextjs-api"
        })

def setup_logger():
    logger = logging.getLogger("chatraghu-frontend")
    logger.setLevel(logging.WARNING)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    ))
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logger() 
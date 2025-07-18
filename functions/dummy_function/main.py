"""
Dummy Cloud Function for CI/CD testing.
"""

import json
from datetime import datetime

import functions_framework


@functions_framework.http
def hello_world(request):
    """Basic test function."""
    response_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "function": "dummy_function",
        "version": "1.0.0",
    }
    return json.dumps(response_data)

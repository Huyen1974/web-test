"""
Dummy Cloud Function for CI/CD testing.
"""
import functions_framework
import json
import os
from datetime import datetime

@functions_framework.http
def hello_world(request):
    """Basic test function."""
    response_data = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'function': 'dummy_function',
        'version': '1.0.0'
    }
    return json.dumps(response_data)

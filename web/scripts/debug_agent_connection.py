
import os
import sys
import requests
import json
import subprocess

def get_secret_key():
    try:
        # Fetch the secret token from gcloud
        print("Fetching secret from gcloud...")
        result = subprocess.run(
            ['gcloud', 'secrets', 'versions', 'access', 'latest', '--secret=AGENT_DATA_API_KEY', '--project=github-chatgpt-ggcloud'],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error fetching secret: {e.stderr}")
        sys.exit(1)

def get_service_url():
    try:
        print("Fetching Service URL...")
        result = subprocess.run(
            ['gcloud', 'run', 'services', 'describe', 'agent-data-test', '--project=github-chatgpt-ggcloud', '--region=asia-southeast1', '--format=value(status.url)'],
            capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error fetching URL: {e.stderr}")
        sys.exit(1)

def test_connection():
    api_key = get_secret_key()
    base_url = get_service_url()
    
    print(f"API Key (first 6 chars): {api_key[:6]}...")
    print(f"Base URL: {base_url}")

    # Test Endpoints (RAG Backend)
    endpoints = [
        f"{base_url}/info",  # Health check endpoint
        f"{base_url}/chat",  # Chat endpoint
        f"{base_url}/docs",  # Swagger UI often public
        f"{base_url}/openapi.json",  # often public
    ]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    for url in endpoints:
        print(f"\nTesting: {url}")
        try:
            response = requests.get(url, headers=headers, timeout=10)
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {json.dumps(dict(response.headers), indent=2)}")
            print(f"Response Body Preview: {response.text[:200]}")
            
            if response.status_code == 200:
                print("✅ PASSED")
            elif response.status_code == 401:
                 print("❌ FAILED: Unauthorized. Check Key or Server Config.")
            elif response.status_code == 403:
                 print("❌ FAILED: Forbidden. Check IAM.")
            else:
                 print(f"⚠️  Unexpected Status: {response.status_code}")

        except Exception as e:
            print(f"Error connecting to {url}: {str(e)}")

if __name__ == "__main__":
    test_connection()

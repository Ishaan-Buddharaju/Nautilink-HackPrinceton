"""
Simple script to test auth endpoints.
Make sure the server is running: python main.py
"""
import requests

BASE_URL = "http://localhost:8000"

# Test Signup
print("1. Testing Signup...")
response = requests.post(f"{BASE_URL}/auth/signup", json={
    "email": "test@example.com",
    "password": "test123456"
})
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Save token for protected endpoints
token = response.json().get("access_token") if response.status_code == 201 else None

# Test Login
print("2. Testing Login...")
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "test@example.com",
    "password": "test123456"
})
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}\n")

# Get token from login
token = response.json().get("access_token") if response.status_code == 200 else token

# Test Get Current User (protected)
if token:
    print("3. Testing Get Current User...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

print("Done!")

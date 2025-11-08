# Nautilink Backend

FastAPI backend with Supabase integration.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the backend directory with the following variables:
```env
SUPABASE_URL=https://kbybqxergznphfrdzxmm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieWJxeGVyZ3pucGhmcmR6eG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1NTcwNjYsImV4cCI6MjA3ODEzMzA2Nn0.-a8YafVxmYXvPyPr4U0OhMDQEOrQBjcUDo_SZ-S89Bg
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note:** The service role key can be found in your Supabase Dashboard > Project Settings > API > service_role key. Keep this secret!

## Running the Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

- `main.py` - FastAPI application entry point
- `config.py` - Configuration settings using Pydantic
- `requirements.txt` - Python dependencies


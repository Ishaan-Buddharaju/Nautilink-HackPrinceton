from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from config import settings
from auth.router import router as auth_router
from api.router import router as api_router
from posts.router import router as posts_router
from monitoring.router import router as monitoring_router

app = FastAPI(title="Nautilink API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# Include routers
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(posts_router)
app.include_router(monitoring_router)


@app.get("/")
async def root():
    return {"message": "Nautilink API is running", "status": "healthy"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Nautilink API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


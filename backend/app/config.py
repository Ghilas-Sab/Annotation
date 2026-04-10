import os


class Settings:
    DATA_DIR: str = os.getenv("DATA_DIR", "/data")
    VIDEOS_DIR: str = os.getenv("VIDEOS_DIR", "/videos")
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    MAX_VIDEO_SIZE_MB: int = int(os.getenv("MAX_VIDEO_SIZE_MB", "2000"))
    TEMP_DIR: str = os.getenv("TEMP_DIR", "/tmp/annotations_exports")


settings = Settings()

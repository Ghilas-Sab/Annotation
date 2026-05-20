FROM mcr.microsoft.com/playwright:v1.49.0-jammy
WORKDIR /e2e
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .

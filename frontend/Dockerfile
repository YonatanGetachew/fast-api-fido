# Build stage
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage (serving static files)
FROM node:18-alpine

# Install 'serve' to serve the React build folder
RUN npm install -g serve

WORKDIR /app

# Copy built files from build stage
COPY --from=build /app/build ./build

# Expose port (not strictly required for Cloud Run but good practice)
EXPOSE 8080

# Start serve to host build folder on port 8080
CMD ["serve", "-s", "build", "-l", "8080"]



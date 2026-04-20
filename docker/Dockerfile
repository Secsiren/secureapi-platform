# Stage 1 — Builder
# We use a full Node.js image to install dependencies and compile TypeScript
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package files first — Docker caches this layer
# If package.json hasn't changed, Docker skips npm install on next build
COPY package*.json ./

# Install ALL dependencies including devDependencies (we need TypeScript to compile)
RUN npm install

# Copy all source code into the container
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2 — Production
# We start fresh with a clean image — no TypeScript compiler, no devDependencies
# This makes the final image much smaller and more secure
FROM node:20-alpine AS production

# Create a non-root user — running as root inside a container is a security risk
# If an attacker exploits the app, they get this limited user, not root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only package files and install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist

# Switch to the non-root user before starting the app
USER appuser

# Tell Docker this container listens on port 3000
EXPOSE 3000

# Start the application
CMD ["node", "dist/app.js"]

# Stage 1: Build
FROM node:20-bullseye AS builder
WORKDIR /app

# Copy package manager files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies (including dev for build)
RUN pnpm install

# Copy source code
COPY . .

# Build the app
RUN pnpm run build

# Stage 2: Production
FROM node:20-bullseye AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy only prod dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Run compiled app instead of dev mode
CMD ["node", "dist/main.js"]

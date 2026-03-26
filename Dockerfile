# Use Node.js 20 LTS
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Build Next.js app
RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Install runtime dependencies for onnxruntime and native modules
RUN apk add --no-cache \
    libstdc++ \
    libgomp \
    gcompat

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev

# Copy built app and necessary runtime files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.ts ./next.config.ts

# Create pdfs directory for uploaded PDFs
RUN mkdir -p /app/pdfs

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]

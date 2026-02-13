FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY apps/agent/package.json apps/agent/

# Install all dependencies
RUN npm install

# Copy source
COPY packages/shared/ packages/shared/
COPY packages/db/ packages/db/
COPY apps/agent/ apps/agent/
COPY tsconfig.base.json ./

# Build shared package
RUN npm -w packages/shared run build

# Generate Prisma client
RUN cd packages/db && npx prisma generate

# Expose port
EXPOSE 3001

# Push DB schema then start agent
CMD sh -c "cd packages/db && npx prisma db push --skip-generate && cd /app && npx tsx apps/agent/src/index.ts"

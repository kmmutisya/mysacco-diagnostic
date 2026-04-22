FROM node:20-alpine

WORKDIR /app

# Install production dependencies (pg, docx, etc. are referenced by compiled server bundle)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy pre-built output — avoids layer-cache issues with npm run build
# CACHE_BUST: update value in Railway env vars to force fresh image
ARG CACHE_BUST=1
ENV CACHE_BUST=$CACHE_BUST
COPY dist/ ./dist/

EXPOSE 5000

CMD ["node", "dist/index.cjs"]

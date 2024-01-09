ARG IMG=node:16.14-alpine3.14

FROM $IMG as builder

WORKDIR /usr/src/app/

COPY .babelrc package.json package-lock.json ./
# Install build dependencies
# We use `npm install` so we install dev deps e.g. babel
RUN apk add --no-cache --virtual .gyp python3 make g++ &&\
    npm install &&\
    apk del .gyp

COPY ./src/ ./src/
COPY ./scripts/ ./scripts/
COPY config.js.docker ./src/config.js

RUN npm run build && npm run build-scripts

FROM $IMG as deps

WORKDIR /usr/src/app/
ENV NODE_ENV=production

# Install only production dependencies with `npm ci`
# We will only use the node_modules folder from this step

COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .gyp python3 make g++ &&\
    npm ci --only=production &&\
    apk del .gyp &&\
    npm cache clean --force &&\
    rm -rf /tmp/* /var/cache/apk/*

FROM $IMG

WORKDIR /usr/src/app/
ENV NODE_ENV=production

# Get built source code from `builder` and dependencies from `deps`
COPY --from=builder /usr/src/app/dist/ ./dist/
COPY --from=builder /usr/src/app/dist-scripts/ ./scripts/
COPY --from=deps /usr/src/app/node_modules/ ./node_modules/
COPY --from=deps /usr/src/app/package.json ./

# Install the process supervisor
RUN apk add --no-cache dumb-init &&\
    rm -rf /tmp/* /var/cache/apk/*

EXPOSE 8000
ENTRYPOINT ["dumb-init", "node", "dist/index.js"]

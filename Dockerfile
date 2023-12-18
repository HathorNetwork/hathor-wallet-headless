ARG IMG=node:16.14-alpine3.14

FROM $IMG as builder

WORKDIR /usr/src/app/

COPY .babelrc package.json package-lock.json ./
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

COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .gyp python3 make g++ &&\
    npm ci --only=production &&\
    apk del .gyp &&\
    apk add --no-cache dumb-init &&\
    npm cache clean --force &&\
    rm -rf /tmp/* /var/cache/apk/*

FROM $IMG

WORKDIR /usr/src/app/
ENV NODE_ENV=production

COPY --from=builder /usr/src/app/dist/ ./dist/
COPY --from=builder /usr/src/app/dist-scripts/ ./dist-scripts/
COPY --from=deps /usr/src/app/node_modules/ ./node_modules/
COPY --from=deps /usr/src/app/package.json ./

RUN apk add --no-cache dumb-init &&\
    rm -rf /tmp/* /var/cache/apk/*

EXPOSE 8000
ENTRYPOINT ["dumb-init", "node", "dist/index.js"]

FROM node:18-alpine3.18
WORKDIR /usr/src/app/

COPY .babelrc package.json package-lock.json ./
RUN apk add --no-cache --virtual .gyp python3 make g++ &&\
    npm clean-install &&\
    apk del .gyp

COPY ./src/ ./src/
COPY ./scripts/ ./scripts/
COPY config.js.docker ./src/config.js

EXPOSE 8000
ENTRYPOINT ["npm", "start", "--"]

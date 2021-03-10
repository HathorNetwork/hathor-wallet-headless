FROM node:12.21.0-alpine3.12
WORKDIR /usr/src/app/

COPY .babelrc package.json package-lock.json ./
RUN npm install

COPY ./src/ ./src/
COPY config.js.docker ./src/config.js

EXPOSE 8000
ENTRYPOINT ["npm", "start", "--"]

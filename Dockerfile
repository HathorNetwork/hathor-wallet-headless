FROM node:16.14-alpine3.14
WORKDIR /usr/src/app/

COPY .babelrc package.json package-lock.json ./
RUN npm install

COPY ./src/ ./src/
COPY config.js.docker ./src/config.js

EXPOSE 8000
ENTRYPOINT ["npm", "start", "--"]

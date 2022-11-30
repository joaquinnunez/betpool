FROM node:18

ARG NODE_ENV=development

WORKDIR /app

COPY ./package.json .

RUN yarn install
COPY . .

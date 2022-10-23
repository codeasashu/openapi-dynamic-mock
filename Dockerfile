FROM node:18

WORKDIR /app

ADD package.* .

RUN npm i

ADD . .

CMD ["node", "index.js"]

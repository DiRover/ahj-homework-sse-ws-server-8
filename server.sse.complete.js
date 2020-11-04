const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const { streamEvents } = require('http-event-stream');
const uuid = require('uuid');
const { type } = require('os');

const app = new Koa();

const messages = [
  {
    msg: 'Идёт перемещение мяча по полю, игроки и той, и другой команды активно пытаются атаковать',
    type: 'action'
  },
  {
    msg: 'Нарушение правил, будет штрафной удар',
    type: 'freekick'
  },
  {
    msg: 'Отличный удар! И Г-О-Л!',
    type: 'goal'
  },
  {
    msg: 'Игра продолжается',
    type: 'other'
  },
];

function getRandomEvent() {
  const foo = Math.random() * 100;
  console.log(foo);
  if (foo < 11) { // 0-10
    return 'goal';
  } else if (foo < 41) { // 10-40
    return 'freekick';
  } else if (foo < 51) { //40-50
    return 'action';
  } else {
    return 'other';
  }
};

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }

  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({ ...headers });
    try {
      return await next();
    } catch (e) {
      e.headers = { ...e.headers, ...headers };
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUD, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }

    ctx.response.status = 204;
  }
});

const router = new Router();

router.get('/sse', async (ctx) => {
  streamEvents(ctx.req, ctx.res, {
    async fetch() {
      return [];
    },
    stream(sse) {
      const interval = setInterval(() => {
        const evType = getRandomEvent();
        //console.log(type);
        const event = messages.filter((evn) => {
          return evn.type === evType;
        });
        console.log(event);
        sse.sendEvent({
          id: uuid.v4(),
          data: JSON.stringify({field: event}),
          event: 'message',
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  });

  ctx.respond = false; // koa не будет обрабатывать ответ
});

router.get('/index', async (ctx) => {
  ctx.response.body = 'hello';
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7871;
const server = http.createServer(app.callback())
server.listen(port);

import Router from 'koa-joi-router'
import * as fs from 'fs'
import { SwaggerAPI } from 'koa-joi-router-docs'

const generator = new SwaggerAPI()

const router = Router()
const ext = __filename.substring(__filename.lastIndexOf('.'))


for (const file of fs.readdirSync(__dirname)) {
  if (!file.startsWith('index') && file.endsWith(ext)) {
    const module = require(`${__dirname}/${file}`)
    const name = file.substring(0, file.lastIndexOf('.'))
    // log.info(`using routers in ${name}`)
    if (module.router) {
      router.use(`/${name}`, module.router.middleware())
      generator.addJoiRouter(module.router, { prefix: `/${name}` })
    } else if (Array.isArray(module.routers)) {
      module.routers.forEach((sub_router: Router.Router) => {
        router.use(`/${name}`, sub_router.middleware())
        generator.addJoiRouter(sub_router, { prefix: `/${name}` + (sub_router.router.prefix || '') })
      })
    }
  }
}

const spec = generator.generateSpec({
  info: {
    title: 'Example API',
    description: 'API for creating and editing examples.',
    version: '1.1'
  },
  basePath: '/',
  tags: [{
    name: 'users',
    description: `A User represents a person who can login
      and take actions subject to their granted permissions.`
  }],

}, {
  defaultResponses: {
    200: {
      description: 'OK'
    },
    500: {
      description: 'ERROR'
    }
  } // Custom default responses if you don't like default 200
})

router.get('/', async ctx => {
  ctx.body = 'Welcome to Pet Love\'s API'
})

/**
 * Swagger JSON API
 */
 router.get('/_api.json', async ctx => {
  ctx.body = JSON.stringify(spec, null, '  ')
})

router.get('/apiDocs', async ctx => {
  ctx.body = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Example API</title>
  </head>
  <body>
    <redoc spec-url='/_api.json' lazy-rendering></redoc>
    <script src="https://rebilly.github.io/ReDoc/releases/latest/redoc.min.js"></script>
  </body>
  </html>
  `
})

export default router
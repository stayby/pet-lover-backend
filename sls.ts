import * as dotenv from 'dotenv';
dotenv.config();

import Koa from 'koa'
// import convert from 'koa-convert'
import Router from 'koa-joi-router'
import routers from './routers'
import bodyParser from 'koa-bodyparser'
import cors from '@koa/cors'
import { logger, acl } from './middleware'

const _addRoute = Router.prototype._addRoute
// const defaultInjectors = injectors(person_injector, attachment_injector)

// const core = async (ctx: Koa.Context, next: () => Promise<any>) => {
//   await next()
//   if (!ctx.body && ctx.core) {
//     ctx.body = await ctx.core()
//   }
// }

Router.prototype._addRoute = function addRoute(spec: Router.Spec) {
  const handler = Array.isArray(spec.handler) ? spec.handler : [spec.handler]
  for (const fn of handler) {
    if (fn.name === 'authenticate') {
      for (const key of Object.keys(acl)) {
        if (fn === acl[key]) {
          if (!spec.validate) {
            spec.validate = {}
          }
          // spec.validate.header = authorization(capitalize(key.replace(/_include.*?(?=_or|$)/, '')).replace(/_/g, ' '))
        }
      }
    }
  }
  // handler.splice(handler.length - 1, 0, core, defaultInjectors)
  spec.handler = handler
  _addRoute.call(this, spec)
}


const app = new Koa()
const port = process.env.PORT || 3333

const server = app.listen(port, () => {
  console.log(`app listening on port ${port}`)
})

server.setTimeout(10 * 60 * 1000)

app.use(cors({
  maxAge: 86400
}))

//.........

app.use(logger())

app.use(bodyParser({
  jsonLimit: '16mb'
}))

app.use(routers.middleware())

export default app

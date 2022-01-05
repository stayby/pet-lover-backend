import Boom from 'boom'
import Koa from 'koa'

const log = console
const boom = async (ctx: any, next: Function) => {
  try {
    await next()
  }catch(error) {
    console.log('catch error#####')
    console.error(error)
    if(typeof error.status === 'number') {
      ctx.status = error.status
      if(error.details) {
        ctx.body = {message: error.message, messages: error.details.map(detail => detail.message)}
      } else {
        ctx.body = { message: error.message }
      }
    }else {
      let boom
      if(error.errors) {
        const err = error.errors[0]
        if (error.name === 'SequelizeValidationError') {
          boom = Boom.expectationFailed(err.message, err)
        } else if (error.name === 'SequelizeUniqueConstraintError') {
          boom = Boom.conflict(err ? err.message : error.parent.sql, error)
        } else {
          boom = Boom.badData(err.message, err)
        }
      } else if (error.name === 'UnauthorizedError') {
        boom = Boom.unauthorized(error.message.trim())
      } else {
        boom = new Boom(error)
      }
      ctx.status = boom.output.statusCode
      ctx.body = boom.output.payload
      ctx._boom = boom
    }
    if (ctx._boom && ctx.status >= 500) {
      //todo:  logged error and warning on server
      //   if (!isTest && bugsnag) { bugsnag.notify(ctx._boom, serializers.ctx(ctx)) }
      //   log.error(error) // log the original error message
      //   log.error(str(ctx._boom.output.payload))
      // } else {
      //   // 4xx errors will go through here and be logged.
        log.error(ctx.body.messages || ctx.body.message)
        log.error(error)
    }
  }
}

export default ():Koa.Middleware => {
  return async (ctx: any, next) => {
    await boom(ctx, next)
  }
}
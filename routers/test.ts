import Router from 'koa-joi-router'
import { db } from '../models'
import Boom from 'boom'

const Joi = Router.Joi

export const router = Router()

router.route({
  path: '/env',
  method: 'get',
  meta: {
    swagger: {
      summary: 'get env info',
      tags: ['test']
    }
  },
  handler: ctx => {
    ctx.body = { env: process.env.stage }
  }
})

router.route({
  path: '/db-connect',
  method: 'get',
  meta: {
    swagger: {
      summary: 'test db connect',
      tags: ['test']
    }
  },
  handler: async ctx => {
    try {
      await db.authenticate();
      console.log('Connection has been established successfully.');
      ctx.body = "DB connect success."
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw new Error('db connect fails')
      // ctx.body = "DB connect faile."
    }
  }
})


router.route({
  path: '/error/:status',
  method: 'get',
  meta: {
    swagger: {
      summary: 'return error',
      tags: ['test']
    }
  },
  validate: {
    query: {
      status: Joi.number()
    },
    output: {
      200: {
        body: Joi.object()
      }
    }
  },
  handler: ctx => {
    const { status } = ctx.request.params
    ctx.body = { status }
    switch (status) {
      case '400': throw Boom.badRequest('Bad request')
      case '401': throw Boom.unauthorized('Invalid password')
      case '402': throw Boom.paymentRequired('Bandwidth used')
      case '403': throw Boom.forbidden('Forbidden')
      case '404': throw Boom.notFound('Not found')
      case '405': throw Boom.methodNotAllowed('That method is not allowed')
      case '408': throw Boom.clientTimeout('Timed out')
      case '500': throw Boom.badImplementation('An internal server error occurred')
    }
  }
})
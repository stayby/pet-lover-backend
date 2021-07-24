// import {Sequelize} from 'sequelize-typescript'
import { Op } from 'sequelize'
import Joi from 'joi'
// import Router from 'koa-joi-router'

// const Joi = Router.Joi


const Joi_nullable = Joi.extend({
  type: 'number', //name
  base: Joi.number().allow(null),
  coerce(value, helpers) {
    if (value === 'null') return null
    return {value}
  }
}, {
  type: 'object',
  base: Joi.alternatives(Joi.object(), Joi.array().items(Joi.number())).allow(null),
  coerce(value, helpers) {
    if (value === 'null') return null
    return {value}
  }
}, {
  type: 'string',
  base: Joi.string().allow(null),
  coerce(value, helpers) {
    if (value === 'null') return null
    return {value}
  }
})

export const query = Joi.object({
  created_at: Joi.alternatives(Joi.date(), Joi_nullable.string()),
  updated_at: Joi.alternatives(Joi.date(), Joi_nullable.string()),
  sort: Joi_nullable.string().regex(/^[-+]?[a-z_]+(,[-+]?[a-z_]+)*$/),
  limit: Joi.number().default(200),
  offset: Joi.number().default(0)
})
// .pattern(/\.op$/, Joi.string().valid(Object.keys(Op)))
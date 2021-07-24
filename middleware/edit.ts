import * as Boom from 'boom'
import { snakeCase } from 'lodash'
import { Context } from 'koa'
import { Sequelize, Model } from 'sequelize-typescript'
import { Op, Utils } from 'sequelize'
import { db } from '../models'

type Next = () => Promise<any>

export const ValueFrom = {
  Params: 1,
  Query: 2,
  Body: 4,
  All: 7,
  ParamsQuery: 3
}

const parseSortOption = (ctx: Context, option: string | undefined) => {
  if (option) {
    const options = []
    const add = (x: string, dir: 'ASC' | 'DESC') => {
      if (ctx.model.options.sortOptionMapping) {
        const val = ctx.model.options.sortOptionMapping[x]
        if (val) {
          options.push([val, dir])
          return
        }
      }
      if (Object.keys(ctx.model.attributes).includes(x)) {
        options.push([x, dir])
      }
    }

    option.split(/,/).forEach((col) => {
      if (/^-/.test(col)) {
        add(col.substr(1), 'DESC')
      } else if (/^\+/.test(col)) {
        add(col.substr(1), 'ASC')
      } else {
        add(col, 'ASC')
      }
    })
    return options
  }
  const defaultOrder = ctx.model.options.defaultOrder
  if (defaultOrder) {
    if (typeof defaultOrder === 'function') {
      return defaultOrder(ctx)
    } else {
      return defaultOrder
    }
  }
}

export const page_size = (rows: number | 'unlimited') => (ctx: Context, next: Next) => {
  ctx.page_size = rows
  return next()
}

export const unlimited = page_size('unlimited')

export const get_value = (ctx: Context, key: string, readBody: number) => {
  var value: any
  if ((readBody & ValueFrom.Params) === ValueFrom.Params) {
    value = value || ctx.state[key] || ctx.params[key]
  }
  if (!value && (readBody & ValueFrom.Query) === ValueFrom.Query && ctx.request.query)  {
    value = value || ctx.request.query[key]
  }
  if (!value && (readBody & ValueFrom.Body) === ValueFrom.Body && ctx.request.body)  {
    value = value || ctx.request.body[key]
  }
  return value
}

export const read_ctx_key = (ctx: Context, key: string, readBody: number) => {
  let value = get_value(ctx, key, readBody)
  if (value !== undefined) {
    if (value === 'null') {
      value = null
    }
    if (ctx.method == 'GET' || ctx.method == 'DELETE') {
      const op_k = get_value(ctx, `${key}.op`, ValueFrom.ParamsQuery)
      let op = Op.eq
      if (op_k && Op[op_k]) {
        op = Op[op_k]
      }
      if (op === Op.eq) {
        return { [key]: value }
      } else {
        if (ctx.model.attributes[key] && (op === Op.gte || op === Op.lte || op === Op.gt || op === Op.lt)) {
          const values = ctx.model.attributes[key].values
          if (Array.isArray(values)) {
            value = values.indexOf(value) + 1
          }
        }
        return { [key]: { [op]: value } }
      }
    } else {
      return { [key]: value }
    }
  }
}

export const read_ctx = (ctx: Context, readBody: number) => {
  return Object.assign({}, ...Object.keys(ctx.model.attributes).map((key) => read_ctx_key(ctx, key, readBody)))
}

/**
 * use_scope
 */

export type UseScopeScope = any | ((ctx: any) => any | void | Promise<any | void>) | void

export const use_scope = (...scopes: UseScopeScope[]) => {
  return async (ctx: Context, next: Next) => {
    const final_scopes = []
    for (const scope of scopes) {
      if (typeof scope === 'function') {
        const _scope = await scope(ctx)
        if (Array.isArray(_scope)) {
          final_scopes.push(..._scope)
        } else {
          final_scopes.push(_scope)
        }
      } else {
        final_scopes.push(scope)
      }
    }
    ctx.use_scope = [...(ctx.use_scope || []), ...final_scopes.filter((scope) => scope !== undefined)]
    return next()
  }
}

export const ctx_scope = (name: string) => {
  return ctx => ({ method: [name, ctx] })
}

const scoped_model = (ctx: Context) => {
  const scopes: any[] = []
  if (ctx.use_scope) {
    if (Array.isArray(ctx.use_scope)) {
      scopes.push(...ctx.use_scope)
    } else {
      scopes.push(ctx.use_scope)
    }
  } else {
    scopes.push('defaultScope')
  }
  return ctx.model.scope(scopes.filter((x) => x))
}

/**
 *
 */
const getInstance = async (ctx: Context) => {
  let instance = ctx.params.instance
  if (instance) {
    return instance
  }

  instance = await scoped_model(ctx).findOne({ where: read_ctx(ctx, ValueFrom.ParamsQuery) })

  if (!instance) {
    throw Boom.notFound(`${ctx.model.name} not found`)
  }
  ctx.params.instance = instance
  return instance
}

const getInstances = async (ctx: Context) => {
  const { sort, limit, offset } = ctx.query
  const paginate = ctx.page_size !== 'unlimited'
  const options: any = {}
  if (paginate) {
    options.limit = ctx.page_size || Math.min(Number(limit) || 20, 1000)
    if (offset) {
      options.offset = parseInt(offset as string, 10)
    }
  }
  const order = parseSortOption(ctx, sort as string)
  if (order) {
    options.order = order
  }
  // options.logging = console.log
  options.where = read_ctx(ctx, ValueFrom.ParamsQuery)

  const _model = scoped_model(ctx)
  const rows = await _model.findAll(options)
  if (paginate) {
    const count = await _model.count({
      distinct: true,
      col: `\`${ctx.model.name}\`.\`id\``,
      where: options.where
    })
    return { rows, count }
  } else {
    return { rows }
  }
}

/**
 * edit(() => Model)
 */
 type Constructor<T> = new (...args: any[]) => T;
 type ModelType<T extends Model<T>> = Constructor<T> & typeof Model;

export default  <T extends Model<T>>(model: ModelType<T>, returnKey?: string) => {
  const name = returnKey || snakeCase(model.name)
  const one = {
    DELETE: async (ctx: Context) => {
      const instance = await getInstance(ctx)
      await instance.destroy()
      return { done: true }
    },

    PUT: async (ctx: Context) => {
      const instance = await getInstance(ctx)
      await instance.update(read_ctx(ctx, ValueFrom.Body))
      if (!ctx.skip_reload_after_put) {
        await instance.reload()
      }
      return { [name]: instance }
    },

    GET: async (ctx: Context) => {
      const instance = await getInstance(ctx)
      return { [name]: instance }
    },
  }

  const many = {
    POST: async (ctx: Context) => {
      const instance = await ctx.model.create(read_ctx(ctx, ValueFrom.All))

      if (typeof ctx.afterSave === 'function') {
        await db.transaction(async (transaction) => {
          await ctx.afterSave(instance, transaction)
        })
      }
      await instance.reload()
      return { [name]: instance }
    },

    GET: async (ctx: Context) => {
      const { count, rows } = await getInstances(ctx)
      return { [Utils.pluralize(name)]: rows, count }
    }
  }

  const core = async (ctx: Context) => {
    if (ctx.params.id || ctx.method === 'DELETE') {
      return await one[ctx.method](ctx)
    } else {
      return await many[ctx.method](ctx)
    }
  }

  return async (ctx: Context, next: Next) => {
    ctx.model = model
    ctx.core = () => core(ctx)
    ctx.getInstance = () => getInstance(ctx)
    ctx.getInstances = () => getInstances(ctx)
    await next()
    if (!ctx.body) {
      ctx.body = await ctx.core()
    }
  }
}

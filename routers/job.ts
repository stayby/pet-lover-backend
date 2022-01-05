import Router from 'koa-joi-router'
import Boom from 'boom'
import { User, RoleLevel } from '../models'

const tags = ['job']

export const router = Router()



router.route({
  method: 'post',
  path: '/root/create',
  handler: async ctx => {
    const params:any = {
      role: RoleLevel.admin,
      email: 'root@petlove.com',
      nickname: 'root'
    }
    const root = await User.findOne({where: params})
    if(!root) {
      params.password = "123456"
      const root = await User.create(params)
      ctx.body = {root}
    }else {
      throw Boom.badRequest('Root account already exist')
    }
  }
})

router.route({
  method: 'post',
  path: '/root/reset',
  handler: async ctx => {
    const params:any = {
      role: RoleLevel.admin,
      email: 'root@petlove.com'
    }
    const root = await User.findOne({where: params})
    await root.update({ password: ctx.request.body.password})
    ctx.body = { root }
  }
})


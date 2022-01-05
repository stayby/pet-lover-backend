import Router from 'koa-joi-router'
import Boom from 'boom'
import { acl } from '../middleware'
import { User, Pet, Attachment, RoleLevel } from '../models'
import multer from '@koa/multer'

const tags = ['pet']

export const router = Router()


const upload = multer()


const check_permission = async (ctx, next) => {
  let user = ctx.state.user as User
  const { user_id } = ctx.query
  if (user_id !== user.id) {
    if (user.hasRole(RoleLevel.contributor, RoleLevel.adopter, RoleLevel.admin)) {
      user = await User.findOne({ where: { id: user.id } })
      if (!user) {
        throw Boom.notFound()
      }
    } else {
      throw Boom.forbidden('Your operate is forbidden.')
    }
  }
  ctx.state.user = user
  await next()
}

router.route({
  method: 'get',
  path: '/',
  meta: {
    swagger: {
      summary: 'Get pets list',
      tags
    }
  },
  handler: [acl.any, check_permission, async ctx => {
    const { user_id } = ctx.query
    const where = {} as any
    if (user_id) {
      where.owner_id = user_id
    }
    const pets = await Pet.findAll({ where })
    ctx.body = { pets }
  }]
})

router.route({
  method: 'get',
  path: '/:id',
  meta: {
    swagger: {
      summary: 'Get a pet',
      tags
    }
  },
  handler: [async ctx => {
    const { id } = ctx.request.params
    const pet = await Pet.findOne({ where: { id } })
    ctx.body = { pet }

  }]
})

router.route({
  method: 'post',
  path: '/',
  meta: {
    swagger: {
      summary: 'Create a pet',
      tags
    }
  },
  handler: [acl.any, check_permission, async ctx => {
    const user = ctx.state.user as User
    const { user_id } = ctx.query
    const params = ctx.request.body
    params.creator_id = user.id
    if (user_id) {
      // params.owner_id = params.owner_id || user_id || user.id
      params.owner_id = user_id
    }

    const pet = await Pet.create(params)
    ctx.body = { pet }
  }]
})

router.route({
  method: 'put',
  path: '/:id',
  meta: {
    swagger: {
      summary: 'Edit a pet',
      tags
    }
  },
  handler: [acl.any, check_permission, async ctx => {
    const params = ctx.request.body
    let pet = await Pet.findOne({ where: { id: ctx.request.params.id } })
    await pet.update(params)
    ctx.body = { pet }
  }]
})

router.route({
  method: 'delete',
  path: '/:id',
  meta: {
    swagger: {
      summary: 'Delete a pet',
      tags
    }
  },
  handler: [acl.any, check_permission, async ctx => {
    await Pet.deletion(ctx.request.params.id)
    ctx.body = { done: true }
  }]
})


router.route({
  method: 'post',
  path: '/:id/album',
  meta: {
    swagger: {
      summary: 'upload photo',
      tags
    }
  },
  handler: [acl.any, check_permission, upload.single('file'), async ctx => {
    const pet = await Pet.findOne({ where: { id: ctx.request.params.id } })
    const { originalname, buffer } = ctx.file
    const attachment = await Attachment.upload(pet, 'album', originalname, buffer, ctx.request.body)
    ctx.body = { attachment }
  }]
})



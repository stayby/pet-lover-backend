import Router from 'koa-joi-router'
import Boom from 'boom'
import { acl } from '../middleware'
import { Attachment, Pet } from '../models'
import store from '../models/store'

const tags = ['attachment']

export const router = Router()


router.route({
  method: 'post',
  path: '/set-thumb/:id',
  meta: {swagger: {
    summary: 'set a attachment as thumb(pet album)',
    tags
  }},
  handler: [acl.any, async ctx => {
    // const {pet_id} = ctx.query
    let attachment = await Attachment.findOne({where: {id: ctx.request.params.id}})
    await Attachment.update({is_thumb: 0},{where: {
      attachable: attachment.attachable,
      attachable_id: attachment.attachable_id
    }} )
    await attachment.update({is_thumb: 1})
    const attachments = await  Attachment.findAll({where: {
      attachable: attachment.attachable,
      attachable_id: attachment.attachable_id
    }, order: [['is_thumb', 'DESC']]})
    ctx.body = { attachments }
  }]
})

router.route({
  method: 'delete',
  path: '/pet_album/:id',
  meta: {swagger: {
    summary: 'delete a attachment from pet album',
    tags
  }},
  handler: [acl.any, async ctx => {
    const user = ctx.state.user
    const {pet_id} = ctx.query
    const pet = await Pet.findOne({where: {id: pet_id}})
    if(user.id === pet.owner_id) {
      const attachment = await Attachment.findOne({where: {id: ctx.request.params.id}})
      await attachment.destroy()
      await store.deletion([attachment.cos_name])
    } else {
      throw Boom.forbidden('Your operate is forbidden.')
    }

  }]
})


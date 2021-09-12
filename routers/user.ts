import Router from 'koa-joi-router'
import lodash from 'lodash'
import {User, Profile, RealInfo} from '../models'


const Joi = Router.Joi

const tags = ['user']

export const router = Router()

const password = Joi.string().min(6).max(30).required()
const email = Joi.string().email().lowercase().trim().required()

const baseUserInfo = Joi.object({
  email,
  password
})

router.route({
  method: 'post',
  path: '/login',
  meta: {swagger: {
    summary: 'Login user with email and password',
    tags
  }},
  // validate: {
  //   type: 'json',
  //   body: person_login.keys({
  //     app
  //   }),
  //   output: {
  //     '200': {
  //       body: {
  //         token: Joi.string(),
  //         person
  //       }
  //     }
  //   }
  // },
  handler: async ctx => {
    const { password, app, phone} = ctx.request.body
    let user = await User.unscoped().findOne({where: {phone}})
    if(!user) {
      throw new Error()
    }
    // const token = person.generateToken()
    // person = await Person.Cached.findByPk(person.id)
    ctx.body = { user }
  }
})

router.route({
  method: 'post',
  path: '/register',
  meta: {
    swagger: {
      summary: 'Register new account',
      tags
    }
  },
  handler:[ async ctx => {
    console.log(ctx.request.body)
    const user = await User.create(lodash.assign(ctx.request.body, {profile: {}, real_info: {}}), {include: [Profile, RealInfo]})
    ctx.body = { user }
  }]
})

router.route({
  method: 'get',
  path: '/',
  meta: {
    swagger: {
      summary: 'Get Users',
      tags
    }
  },
  handler: []
  // async ctx => {

  // }
})

router.route({
  method: 'get',
  path: '/:id(me|\\d+)',
  meta: {
    swagger: {
      summary: 'User get own info',
      tags
    }
  },
  handler: async ctx => {
    const {id} = ctx.request.params
    const  user = await User.findOne({where: {id: Number(id)}}
    )
    ctx.body={user}
  }
})

router.route({
  method: 'put',
  path: '/:id(me|\\d+)',
  meta: {
    swagger: {
      summary: 'Update user info',
      tags
    }
  },
  handler: [async ctx => {
    const params = ctx.request.body
    let user = await User.findOne({where: {id: ctx.request.params.id}})
    if(Number(user.status) < User.accountStatus.Normal) {
      if(params.profile) {
        params.status = User.accountStatus.NoRealInfo
      }
      if(params.real_info) {
        params.status = User.accountStatus.Normal
      }
    }
    await user.update(params)
    ctx.body = {user}
  }]
})

router.route({
  method: 'delete',
  path: '/:id(me|\\d+)',
  meta: {
    swagger: {
      summary: 'delete user',
      tags
    }
  },
  handler: [async ctx  => {
    await User.destroy({where: {
      id: ctx.request.params.id
    }})
    ctx.body={done: true}
  }]
})
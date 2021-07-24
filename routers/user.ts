import Router from 'koa-joi-router'
import {User} from '../models'

const Joi = Router.Joi

const tags = ['user']

export const router = Router()

const password = Joi.string().min(6).max(30).required()
const email = Joi.string().email().lowercase().trim().required()

const baseUserInfo = Joi.object({
  email,
  password,
  gender: Joi.number().valid(0,1),

})

router.route({
  method: 'post',
  path: '/regiest',
  meta: {
    swagger: {
      summary: '注册',
      tags
    }
  },
  validate: {

  },
  handler: async ctx => {
    ctx.body = { status: 'done' }
  }
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
  handler: []
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

// router.route({
//   method: 'post',
//   path: '/',
//   meta: {
//     swagger: {
//       sumary: 'Create user',
//       tags
//     }
//   },
//   handler: []
// })
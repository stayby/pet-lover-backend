import Router from 'koa-joi-router'
import _ from 'lodash'
import Boom from 'boom'
import multer from  '@koa/multer'
import { acl } from '../middleware'
import {User, Profile, RealInfo, Attachment, RoleLevel} from '../models'
import {verilySmsCode} from './sms'



const Joi = Router.Joi

const tags = ['user']

export const router = Router()

const password = Joi.string().min(6).max(30).required()
const email = Joi.string().email().lowercase().trim().required()

const upload = multer()

const me_id_check = async (ctx, next) => {
  let user = ctx.state.user as User
    if (ctx.params.id !== 'me' && ctx.params.id !== user.id) {
      if (user.hasRole(RoleLevel.contributor, RoleLevel.adopter, RoleLevel.admin)) {
        user = await User.findOne({where: {id: user.id}})
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
  //   // body: person_login.keys({
  //   //   app
  //   // }),
  //   output: {
  //     '200': {
  //       body: {
  //         token: Joi.string(),
  //         // person
  //         user: Joi.object
  //       }
  //     }
  //   }
  // },
  handler: async ctx => {
    const { password, app, phone, email, code} = ctx.request.body
    let where = {}
    if(phone) where = {phone}
    else if (email) where = {email}
    let user = await User.unscoped().findOne({where})

    if(code) {
      // verilySmsCode(phone, code)
      if(!user) {
        // regiest
        user = await User.create(_.assign({phone, password: Math.round(Math.random() * 1000000)+''} as any, {profile: {}, real_info: {}}), {include: [Profile, RealInfo]})
      }
    }else if (!user.matchPassword(password)) {
      throw Boom.forbidden(`${phone || email} Wrong password`)
    }
    if(!user) {
      throw Boom.notFound(`${phone || email} is not registered`)
    }else if(Number(user.status) === User.accountStatus.Abnormal) {
      throw Boom.locked('您的账号已被冻结，请联系管理员')
    }

    const token = user.generateToken()
    // person = await Person.Cached.findByPk(person.id)
    ctx.body = { user, token }
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
    const {phone, pasword, code} = ctx.request.body
    // verify code
    await verilySmsCode(phone, code)
    const user = await User.create(_.assign({phone, pasword} as any, {profile: {}, real_info: {}}), {include: [Profile, RealInfo]})
    const token = user.generateToken()
    ctx.body = { user, token }
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
  handler: [acl.in(RoleLevel.admin, RoleLevel.editor, RoleLevel.contributor), async ctx => {
    let users = await User.findAll({where: ctx.query || {}})
    users = users.filter(user => user.email !=='root@petlove.com')
    ctx.body = {users}
  }]
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
  handler: [acl.any, async ctx => {
    const {id} = ctx.request.params
    const  user = await User.findOne({where: {id: Number(id)}}
    )
    ctx.body={user}
  }]
})

router.route({
  method: 'post',
  path: '/',
  meta: {
    swagger: {
      summary: 'Add user by admin',
      tags
    }
  },
  handler: [acl.admin, async ctx=> {
    const params = ctx.request.body
    if(!params.password) {
      params.password = `${parseInt(Math.random() * 1000000 + '')}`
    }
    const user = await User.create(_.assign(params as any, {profile: {}, real_info: {}}), {include: [Profile, RealInfo]})
    ctx.body={user}
  }]
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
  handler: [acl.any, me_id_check, async ctx => {
    let {id} = ctx.request.params
    let user = ctx.state.user as User
    if(id === 'me') {
      id = user.id
    }
    const params = ctx.request.body
    user = await User.findOne({where: {id: ctx.request.params.id}})
    if(Number(user.status) < User.accountStatus.Normal) {
      if(params.profile) {
        params.status = User.accountStatus.NoRealInfo
      }
      if(params.real_info) {
        params.status = User.accountStatus.Normal
      }
    }
    delete params.password
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
  handler: [acl.any, me_id_check, async ctx  => {
    let {id} = ctx.request.params
    let user = ctx.state.user as User
    if(id === 'me') {
      id = user.id
    }
    const account = await  User.findOne({where: {id}})
    if(account.role === RoleLevel.admin && account.email === 'root@petlover.com') {
      throw Boom.badRequest('Can not delete root account.')
    }
    await User.deletion(id)
    ctx.body={done: true}
  }]
})

router.route({
  method: 'post',
  path: '/:id(me|\\d+)/avatar',
  meta: {
    swagger: {
      summary: 'User uploads a new avatar',
      tags
    }
  },
  handler: [acl.any, me_id_check, upload.single('file'), async ctx => {
    let user = ctx.state.user as User
    const {originalname, buffer} = ctx.file
    await Attachment.upload(user, 'avatar', originalname, buffer)
    user =  await User.findOne({where: {id: user.id}})
    ctx.body = { user }
  }]
})

router.route({
  method: 'post',
  path: '/reset-password/:id',
  meta: {
    swagger: {
      summary: ' Reset someone password by user id',
      tags
    }
  },
  handler: [acl.admin, async ctx => {
    const {id} = ctx.request.params
    const {password} = ctx.request.body
    const user = await User.findOne({where: {id}})
    await user.update({password})
    ctx.body = {done: true}
  } ]
})

router.route({
  method: 'post',
  path: '/reset-password',
  meta: {
    swagger: {
      summary: ' Reset own password',
      tags
    }
  },
  handler: [acl.any, async ctx => {
    let user = ctx.state.user
    const {password, phone, code} = ctx.request.body
    if(user) {
      await user.update({password, password_changed: 1})
    }else {
      user = User.findOne({where: {
        phone
      }})
      if(code) {
        // verify code
        verilySmsCode(phone, code)
        await user.update({password, password_changed: 1})
      }
    }
    ctx.body = {done: true}
  } ]
})

router.route({
  method: 'put' ,
  path: '/status/:id/:opr',
  meta: {
    swagger: {
      summary: 'freeze or unfreeze',
      tags
    }
  },
  handler: [acl.admin, async ctx => {
    let {id, opr} = ctx.request.params
    const user  = await User.findOne({where: {id}}) as any
    let status
    if(opr === 'freeze') {
      status = User.accountStatus.Abnormal
    }else if (opr === 'unfreeze') {
      if(user.profile) {
        status = User.accountStatus.NoRealInfo
      }
      if(user.real_info) {
        status = User.accountStatus.Normal
      }
    }

    await user.update({status})

    ctx.body= {user}
  }]
})
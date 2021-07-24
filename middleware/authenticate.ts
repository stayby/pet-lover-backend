import * as Boom from 'boom'
import * as jwt from 'jsonwebtoken'
import { User, RoleLevel, PermanentLink } from '../models'
import { Context } from 'koa'

const secret = process.env.AUTH_SECRET

const Bearer = /^Bearer (\S*)$/
const Permalink = /^Permalink (\S*)$/
const ResetPwdFlagIgnorePaths = /\/(change_password|team)\??$/

const role_check = (role: number) => {
  return (user: User) => {
    if ((user.role & role) === 0) {
      throw Boom.forbidden('You do not have enough role to access')
    }
  }
}

const roles_check = (roles: number[]) => {
  return (user: User) => {
    for (const role of roles) {
      if (user.hasRole(role)) return
    }
    throw Boom.forbidden('You do not have enough role to access')
  }
}

function decode_authorization(ctx: any)  {
  if (!ctx.header || !ctx.header.authorization) {
    return null
  }

  const jwt_m = Bearer.exec(ctx.header.authorization)
  if (!jwt_m || !jwt_m[1]) {
    return null
  }
  const token = jwt_m[1]
  let user
  try {
    user = jwt.verify(token, secret)
  } catch (err) {
    return null
  }

  return user
}

async function jwt_authenticate(authorization: string): Promise<[User, boolean]> {
  const jwt_m = Bearer.exec(authorization)
  if (!jwt_m || !jwt_m[1]) {
    throw Boom.unauthorized('Bad Authorization header format. Format is "Authorization: Bearer <token>"')
  }
  const token = jwt_m[1]
  let user
  try {
    user = jwt.verify(token, secret)
  } catch (err) {
    throw Boom.unauthorized('Invalid token')
  }
  console.log(user)
  user = await User.findByPk(user.id)//User.Cached.findByPk(user.id)
  if (!user) {
    console.log(`User with token not found user id is ${user.id}`)
    throw Boom.unauthorized('User with token not found')
  }
  return [user, user.limited]
}

async function permalink_authenticate(authorization: string): Promise<PermanentLink> {
  const m = Permalink.exec(authorization)
  if (!m || !m[1]) {
    throw Boom.unauthorized('Bad Authorization header format. Format is "Authorization: Permalink <hash>"')
  }
  const hash = m[1]
  const permalink = await PermanentLink.findOne({ where: { hash } })
  if (!permalink) {
    throw Boom.unauthorized('Invalid PermanentLink')
  }
  return permalink
}

const default_permalink_check = (permanent_link: PermanentLink) => {
  throw Boom.forbidden('You do not have enough role to access')
}

function authenticate(check_fn: (user: User) => void, permacheck_fn: (permalink: PermanentLink) => void = default_permalink_check) {
  return async function authenticate(ctx: any, next: Function) {
    if (!ctx.state.user && !ctx.state.permalink) {
      if (!ctx.header || !ctx.header.authorization) {
        throw Boom.unauthorized('No authorization token found')
      }
      let user: User
      let limited: boolean
      let permalink: PermanentLink
      try {
        [user, limited] = await jwt_authenticate(ctx.header.authorization)
      } catch (error) {
        try {
          permalink = await permalink_authenticate(ctx.header.authorization)
        } catch (perror) {
          throw error
        }
      }

      // can this logic be merged into logic below that checks "limited"
      // variable?
      if(!ResetPwdFlagIgnorePaths.test((ctx as Context).path)
      // &&
      //    user && user.profile && user.profile.password_reset_required

         ) {
        // clients need to resign in when experts reseted their password
        // to John: cause FE AND IOS has a agreement that we should use 401(unauthorized) instead of 403(forbiden)
        throw Boom.unauthorized('need resign-in')
      }

      // if (user && user.hasRole(RoleLevel.account_manager)) {
      //   ctx.state.account_manager = user
      //   if (ctx.header.personid) {
      //     user = await User.Cached.findByPk(ctx.header.personid)
      //     if (!user) {
      //       throw Boom.unauthorized('User with person_id not found')
      //     }
      //   }
      // }
      if (limited) {
        let accessible = false
        if (ctx.path == '/people/me') {
          accessible = true
        } else if (ctx.method == 'POST' && ctx.path == '/people/change_password') {
          accessible = true
        } else if (ctx.method == 'GET' && ctx.path == '/team') {
          accessible = true
        }
        if (!accessible) {
          throw Boom.forbidden('You have to change your password before continue')
        }
      }
      ctx.state.user = user
      ctx.state.permalink = permalink
    }
    if (ctx.state.user) {
      check_fn(ctx.state.user)
    }
    if (ctx.state.permalink) {
      permacheck_fn(ctx.state.permalink)
    }
    return next()
  }
}

export default {
  any: authenticate(() => {}, (permalink) => {
  }),
  in: (...roles: number[]) => authenticate(roles_check(roles)),
  adopter: authenticate(role_check(RoleLevel.adopter)),
  salvor: authenticate(roles_check([RoleLevel.adopter, RoleLevel.salvor])),
  ontributor: authenticate(roles_check([RoleLevel.adopter, RoleLevel.ontributor])),
  editor: authenticate(role_check(RoleLevel.editor)),
  admin: authenticate(role_check(RoleLevel.admin)),
  permalink: authenticate(role_check(RoleLevel.admin), (permalink) => {
  }),
  decode_authorization
}

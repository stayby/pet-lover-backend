import * as Boom from "boom";
import * as jwt from "jsonwebtoken";
import { User, RoleLevel } from "../models";

const secret = process.env.AUTH_SECRET;

const Bearer = /^Bearer (\S*)$/;

const role_check = (role: number) => {
  return (user: User) => {
    if ((user.role & role) === 0) {
      throw Boom.forbidden("You do not have enough role to access");
    }
  };
};

const roles_check = (roles: number[]) => {
  return (user: User) => {
    for (const role of roles) {
      if (user.hasRole(role)) return;
    }
    throw Boom.forbidden("You do not have enough role to access");
  };
};

function decode_authorization(ctx: any) {
  if (!ctx.header || !ctx.header.authorization) {
    return null;
  }

  const jwt_m = Bearer.exec(ctx.header.authorization);
  if (!jwt_m || !jwt_m[1]) {
    return null;
  }
  const token = jwt_m[1];
  let user;
  try {
    user = jwt.verify(token, secret);
  } catch (err) {
    return null;
  }

  return user;
}

async function jwt_authenticate(authorization: string): Promise<User> {
  const jwt_m = Bearer.exec(authorization);
  if (!jwt_m || !jwt_m[1]) {
    throw Boom.unauthorized(
      'Bad Authorization header format. Format is "Authorization: Bearer <token>"'
    );
  }
  const token = jwt_m[1];
  let user;
  try {
    user = jwt.verify(token, secret);
  } catch (err) {
    throw Boom.unauthorized("Invalid token");
  }

  user = await User.findByPk(user.id);
  if (!user) {
    console.log(`User with token not found user id is ${user.id}`);
    throw Boom.unauthorized("User with token not found");
  }
  return user;
}

function authenticate(check_fn: (user: User) => void) {
  return async function authenticate(ctx: any, next: Function) {
    if (ctx.state.user) {
      return next();
    }

    if (!ctx.header || !ctx.header.authorization) {
      throw Boom.unauthorized("No authorization token found");
    }
    let user: User;
    try {
      user = await jwt_authenticate(ctx.header.authorization);
    } catch (error) {
      throw error;
    }

    // 角色校验
    check_fn(user);

    ctx.state.user = user;

    return next();
  };
}

export default {
  any: authenticate(() => {}),
  in: (...roles: number[]) => authenticate(roles_check(roles)),
  adopter: authenticate(role_check(RoleLevel.adopter)),
  salvor: authenticate(roles_check([RoleLevel.adopter, RoleLevel.salvor])),
  contributor: authenticate(
    roles_check([RoleLevel.adopter, RoleLevel.contributor])
  ),
  editor: authenticate(role_check(RoleLevel.editor)),
  admin: authenticate(role_check(RoleLevel.admin)),
  decode_authorization,
};

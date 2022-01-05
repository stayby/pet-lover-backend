import { Table, Column, Model, IsIn, HasOne, DefaultScope, DataType, Is } from "sequelize-typescript";
import { db } from '../index'
import { Profile } from './Profile'
import { RealInfo } from "./RealInfo";
import { Attachment } from './Attachment'
import { RoleLevel } from '../enum'
import Boom from 'boom'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

@DefaultScope(() => ({
  attributes: { exclude: ['salt', 'hash'] },
  include: [
    {model: Profile},
    {model: RealInfo},
    {
      model: Attachment,
      as: 'avatar'
    }
  ]
}))
@Table
export class User extends Model<User> {

  static accountStatus = {
    NoNickname: 0,
    NoProfile: 1,
    NoRealInfo: 2,
    Normal: 3,
    Abnormal: 4
  }

  @Column({
    unique: true
  })
  @Column
  phone: string;

  @Column({
    unique: true
  })
  @Column
  email: string;

  @HasOne(() => Attachment, {
    foreignKey: 'attachable_id',
    constraints: false,
    scope: { attachable: 'person.avatar' }
  } as any)
  avatar: Attachment

  @IsIn([Object.keys(RoleLevel).map(key => RoleLevel[key])])
  @Column({
    defaultValue: RoleLevel.adopter,
  })
  role: number;

  @Is(/^[a-z0-9]{64}$/)
  @Column({
    type: DataType.STRING(64),
    allowNull: false
  })
  salt: string

  @Is(/^[a-z0-9]{64}$/)
  @Column({
    type: DataType.STRING(64),
    allowNull: false
  })
  hash: string

  @Column({
    unique: true
  })
  nickname: string;

  @Column({
    type: new DataType.VIRTUAL(DataType.STRING)
  })
  set password(password: string) {
    if (!password || password.length < 6) {
      throw Boom.expectationFailed('password should have at least 6 characters')
    }
    const buf = crypto.randomBytes(32)
    const salt = buf.toString('hex')
    this.setDataValue('salt', salt)
    this.setDataValue('hash', User.hash(password, salt))
  }

  @Column({
    defaultValue: User.accountStatus.NoNickname,
    type: DataType.ENUM(...Object.keys(User.accountStatus))
  })
  status: keyof typeof User.accountStatus

  @Column({
    defaultValue: 0
  })
  password_changed: number

  @HasOne(() => Profile, {
    foreignKey: 'user_id',
  } as any)
  profile: Profile

  @HasOne(() => RealInfo, {
    foreignKey: 'user_id',
  } as any)
  real_info: RealInfo

  hasRole(...roles: number[]) {
    for (const role of roles) {
      if ((this.role & role) === role) {
        return true;
      }
    }
    return false;
  }

  generateToken(): string {
    console.log('generateToken process.env.AUTH_SECRET===', process.env.AUTH_SECRET)
    return jwt.sign({
      id: this.id,
      // limited: this.profile ? !!this.profile.password_reset_required : false
    }, process.env.AUTH_SECRET)
  }

  static hash(password: string, salt: string) {
    return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha512').toString('hex')
  }

  // toJSON() {
  //   const json = this.get({ plain: true })
  //   delete json.salt
  //   delete json.hash
  //   // check if the client has new message
  //   if (json.messages && json.messages.length > 0) {
  //     json.new_message = true
  //   } else {
  //     json.new_message = false
  //   }
  //   delete json.messages
  //   return json
  // }

  matchPassword(password: string): boolean {
    return this.hash === User.hash(password, this.salt)
  }

  static async deletion(user_id: string) {
    await db.transaction(async (transaction) => {
      await Attachment.destroy({
        where: {
          attachable: 'person.avatar',
          attachable_id: user_id
        },
        transaction
      })
      await User.destroy({where: {
          id: user_id
        }, transaction})
    })
  }
}

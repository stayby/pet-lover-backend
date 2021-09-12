import { Table, Column, Model, IsIn, HasOne, DefaultScope, DataType } from "sequelize-typescript";
import {Profile} from './Profile'
import { RealInfo } from "./RealInfo";
// import { NOW } from "sequelize";

export const RoleLevel = {
  adopter: 1 << 0, // 领养人
  salvor: 1 << 1, // 救助人
  contributor: 1 << 2, // 协助人，
  editor: 1 << 3, // 后台编辑
  admin: 1 << 10,
};

@DefaultScope(() => ({
  attributes: { exclude: ['password', 'salt', 'hash'] },
  include: [
    {model: Profile},
    {model: RealInfo}
  ]
}))
@Table
export class User extends Model<User> {

  static accountStatus = {
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

  @IsIn([Object.keys(RoleLevel).map(key => RoleLevel[key])])
  @Column({
    defaultValue: RoleLevel.adopter,
  })
  role: number;

  @Column({
    unique: true
  })
  nickname: string;

  @Column
  password: string;

  @Column({
    defaultValue: User.accountStatus.NoProfile,
    type: DataType.ENUM(...Object.keys(User.accountStatus))
  })
  status: keyof typeof User.accountStatus

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
}

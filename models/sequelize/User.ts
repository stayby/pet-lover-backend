import { Table, Column, Model } from "sequelize-typescript";
import { NOW } from "sequelize";

export const RoleLevel = {
  adopter: 1 << 0, // 领养人
  salvor: 1 << 1, // 救助人
  contributor: 1 << 2, // 协助人，
  editor: 1 << 3, // 后台编辑
  admin: 1 << 10,
};

@Table({
  timestamps: true,
  updatedAt: false,
})
export class User extends Model<User> {
  @Column
  nickname: string;

  @Column // 0 -> female 1 -> male
  gender: number;

  //todo avatar

  @Column
  email: string;

  @Column
  phone: string;

  @Column
  password: string;

  @Column({
    defaultValue: RoleLevel.adopter,
  })
  role: number;

  @Column({
    defaultValue: NOW,
  })
  @Column
  created_at: Date;

  @Column({
    defaultValue: NOW,
  })
  @Column
  updated_at: Date;

  hasRole(...roles: number[]) {
    for (const role of roles) {
      if ((this.role & role) === role) {
        return true;
      }
    }
    return false;
  }
}

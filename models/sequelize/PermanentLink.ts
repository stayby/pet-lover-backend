import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript'
import * as crypto from 'crypto'
import { User } from './User'

@Table({
  timestamps: true,
  updatedAt: false
})
export class PermanentLink extends Model<PermanentLink> {

  @ForeignKey(() => User)
  @Column({
    unique: 'user_scope'
  })
  user_id: number

  @Column(DataType.STRING(64))
  hash: string

  @Column({
    unique: 'user_scope'
  })
  scope: string

  @BelongsTo(() => User, { onDelete: 'cascade' })
  person: User

  static async one(user_id: number, scope: string): Promise<PermanentLink> {
    const permanent_link = await PermanentLink.sequelize.transaction(async (transaction) => {
      let link = await PermanentLink.findOne({ where: { user_id, scope }, transaction })
      if (!link) {
        // link = await PermanentLink.create({ user_id, scope, hash: crypto.randomBytes(32).toString('hex') }, { transaction })
      }
      return link
    })
    return permanent_link
  }

  static async hash_check(user_id: number, hash: string, scope: string) {
    let result = false
    const link = await PermanentLink.findOne({ where: { user_id, scope, hash }})
    if (link) {
      result = true
    }
    return result
  }
}

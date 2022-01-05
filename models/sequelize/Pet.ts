import { Table, Column, Model, IsIn, HasOne, DefaultScope, DataType, Is, HasMany, ForeignKey, BelongsTo } from "sequelize-typescript"
import { db } from '..'
import { Attachment } from './Attachment'
import { User } from './User'
import JSONColumn from '../decorators/JSONColumn'

@DefaultScope(() => ({
  attributes: { exclude: ['creator_id', 'salvor_id', 'adopter_id'] },
  include: [
    {model: Attachment, as: 'album'},
    {model: User, as: 'creator'},
    {model: User, as: 'salvor'},
    {model: User, as: 'adopter'}
  ],
  order: [[{model: Attachment, as: 'album'}, 'is_thumb', 'DESC']]
}))
@Table
export class Pet extends Model<Pet> {

  static liveStatus = {
    field: '流浪中（群护/放归）',
    waite_for_adopte: '待领养',
    adopted: '已领养',
    family: '家养中',
    missing: '走失中'
  }

  @Column
  nickname: string

  @IsIn([['female', 'male', 'unknow']])
  @Column
  gender: string

  @Column
  date_of_birth: Date

  @IsIn([['cat', 'dog', 'other']])
  @Column
  category: string

  @IsIn([['family', 'field']])
  @Column
  origin: string

  @IsIn([Object.keys(Pet.liveStatus).map(key => key)])
  @Column
  live_status: string

  @JSONColumn
  health_status: string

  @Column
  creator_id: number

  @Column
  salvor_id: number

  @Column
  adopter_id: number

  @Column
  owner_id: number

  @Column(DataType.TEXT)
  introduction: string

  @Column(DataType.TEXT)
  details: string

  @Column
  extend_url: string

  @Column({
    defaultValue: 0
  })
  status: number

  @BelongsTo(() => User, {foreignKey: 'creator_id'})
  creator: User

  @BelongsTo(() => User, {foreignKey: 'salvor_id'})
  salvor: User

  @BelongsTo(() => User, {foreignKey: 'adopter_id'})
  adopter: User

  @HasMany(() => Attachment, {
    foreignKey: 'attachable_id',
    constraints: false,
    scope: { attachable: 'pet.album' }
  })
  album: Attachment[]

  static async deletion(pet_id: string) {
    await db.transaction(async (transaction) => {
      await Attachment.deletion('pet.album', pet_id, transaction)
      await Pet.destroy({where: {
          id: pet_id
        }, transaction})
    })
  }

}
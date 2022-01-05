import { Table, Column, Model, DataType } from 'sequelize-typescript'
import sequelize from 'sequelize'
import Boom from 'boom'
// import { User } from './User'
import store from '../store'
import { Readable } from 'stream'

// type Configuration = {
//   model: () => typeof Model & (new () => Model<any>)
//   // postCheck: (t: Model<any>) => boolean
// }

// each row in attachment table describes a data blob stored in s3 which is
// associated with (attached to) a row in another table. Attachment.attachable =
// x.y and Attachable.attachable_id = z means there is blob data stored for row
// z in table x according to the Attachment association y in table
// x. e.g. person.avatar is the "avatar" association in Person table and the
// blob is the avatar image, file.attachment is the "attachment" association in
// File table, etc.
@Table({
  timestamps: true,
  updatedAt: false
})
export class Attachment extends Model<Attachment> {

  // string x.y where x is the target table and y is an association in the
  // table's model.
  @Column({
    allowNull: false
  })
  attachable: string

  // id into target table which this attachment is for.
  @Column({
    allowNull: false
  })
  attachable_id: number

  // name of uploaded file.
  @Column
  name: string

  @Column
  uploaded_by: string

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  is_thumb: number

  @Column({
    type: new DataType.VIRTUAL(DataType.STRING, ['attachable', 'attachable_id', 'name'])
  })
  get cos_name(): string {
    return `${this.attachable}/${this.attachable_id}-${this.name}`
  }

  @Column({
    type: new DataType.VIRTUAL(DataType.STRING, ['attachable', 'attachable_id', 'name'])
  })
  get cos_url(): any {
    return store.getPublicSignedUrl(this.cos_name)
  }

  static async deletion(attachable: string, attachable_id: string, t?: sequelize.Transaction) {
    const condition = { attachable, attachable_id }
    const attachments = await Attachment.findAll({ where: condition })
    const keys = attachments.map(attachment => attachment.cos_name)
    await Attachment.destroy({
      where: condition,
      transaction: t
    })
    await store.deletion(keys)
  }

  static async upload<T extends Model<T>>(instance: T, as: string, filename: string, file: Readable | Buffer, params: any = {}, t?: sequelize.Transaction) {
    if (!file || !instance) return
    const association = (instance.constructor as any).associations[as]
    if (!association) {
      throw Boom.badRequest(`${as} is not associated with ${instance.constructor}`)
    }

    if (association.isSingleAssociation) {
      const current = await instance[association.accessors.get]()
      if (current) {
        await current.destroy()
      }
    }
    const attachment = await instance[association.accessors.create]({ name: filename }, { transaction: t })

    if (params) {
      attachment.update(params)
    }

    await store.upload(attachment.cos_name, file)

    return attachment

  }

}

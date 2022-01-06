import { DataType, addAttribute } from 'sequelize-typescript'
// import { EncryptedColumnUtil } from '../../../lib'
import moment from 'moment'

export enum EncryptedColumnTypeEnum {
  STRING,
  BOOLEAN,
  INTEGER,
  FLOAT,
  DECIMAL,
  DATE,
}

const _converter = (fieldType: EncryptedColumnTypeEnum, decryptedStr: string): any => {
  switch (fieldType) {
    case EncryptedColumnTypeEnum.DATE:
      return moment(new Date(decryptedStr)).format('YYYY-MM-DD')
    case EncryptedColumnTypeEnum.BOOLEAN:
      return Boolean(decryptedStr)
    case EncryptedColumnTypeEnum.INTEGER:
      return parseInt(decryptedStr)
    case EncryptedColumnTypeEnum.FLOAT:
      return parseFloat(decryptedStr)
    case EncryptedColumnTypeEnum.STRING:
    case EncryptedColumnTypeEnum.DECIMAL:
    default:
      return decryptedStr
  }
}

export default (fieldType: any) => {
  return (target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor) => {
    const options = {
      type: DataType.STRING,
      get() {
        const raw = this.getDataValue(propertyName)
        if (raw && raw !== null) {
          // const decryptedStr = EncryptedColumnUtil.decrypt85(raw)
          // return _converter(fieldType, decryptedStr)
          return null
        } else {
          return null
        }
      },
      set(val: any) {
        if (val && val !== null) {
          // this.setDataValue(propertyName, EncryptedColumnUtil.encrypt85(val.toString()))

        } else {
          this.setDataValue(propertyName, null)
        }
      },
    }
    addAttribute(target, propertyName, options)
  }
}

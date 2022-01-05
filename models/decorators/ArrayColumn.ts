import { DataType, addAttribute } from 'sequelize-typescript'

export default (target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor) => {
  const options = {
    type: DataType.TEXT,
    get() {
      const raw = this.getDataValue(propertyName)
      if (!raw) return undefined
      return raw.split(', ')
    },
    set(json: string[] | string) {
      if (Array.isArray(json)) {
        this.setDataValue(propertyName, json.join(', '))
      } else {
        this.setDataValue(propertyName, json)
      }
    }
  }
  addAttribute(target, propertyName, options)
}
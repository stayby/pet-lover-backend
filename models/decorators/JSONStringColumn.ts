import { DataType, addAttribute } from 'sequelize-typescript'

// import { log } from '../../logger'

// if raw data is pure string,just return it.
export default (target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor) => {
  const options = {
    // since json strings can be huge (like uploaded healthkit records) use
    // mediumtext type which allows 16MB size strings.
    type: DataType.TEXT, //DataType.TEXT('medium'),
    get() {
      const raw = this.getDataValue(propertyName)
      if (!raw) return undefined
      if (!raw.startsWith('{')) return raw
      try {
        return JSON.parse(raw)
      } catch (error) {
        throw new Error(`Error parsing ${propertyName} of ${this.getDataValue('id')}`)
      }
    },
    set(json: object | string) {
      // warn about json that is large, but still allow it to be saved.
      const warn_size = (value: string) => {
        if (value && value.length > 256 * 1024) {
          // log.info(`json column [${propertyName}] set to long string (length ${value.length})`)
        }
      }

      if (typeof json === 'object') {
        const parameters = json ? JSON.stringify(json) : null
        warn_size(parameters)
        this.setDataValue(propertyName, parameters)
      } else {
        warn_size(json)
        this.setDataValue(propertyName, json)
      }
    }
  }
  addAttribute(target, propertyName, options)
}

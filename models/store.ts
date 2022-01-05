import COS from 'cos-nodejs-sdk-v5'
import { Readable } from 'stream'
import fs from 'fs'

const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID,
  SecretKey: process.env.TENCENT_SECRET_KEY
})

const bucket = process.env.BUCKET_NAME
const region = process.env.BUCKET_REGION

class Wrapper {

  getPublicSignedUrl(key: string) {
    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
  }

  getSignedUrl(key: string, expires: number = 60*60*24) { // change default expires from 900s to 24h
    return new Promise((resolve, reject) => {
      cos.getObjectUrl({
        Bucket: bucket,
        Region: region,     /* 存储桶所在地域，必须字段 */
        Key: key,
        Sign: false,    /* 获取不带签名的对象URL */
        Expires: expires
     }, (err, data) => {
      if (err) return reject(err)
      return resolve(data.Url)
     })
    })
  }

  async upload(key: string, body: Readable | Buffer) {
    return new Promise((resolve, reject) => {
      cos.putObject({
        Bucket: bucket, /* 必须 */
        Region: region,    /* 必须 */
        Key: key,              /* 必须 */
        Body: body, /* 必须 */
    }, function(err, data) {

        if (err) return reject(err)
        return resolve(data)
    });
    })
  }

  deletion(keys: string[]) {
    const tasks = []
    for(const key of keys) {
      tasks.push(cos.deleteObject({
        Bucket: bucket, /* 必须 */
        Region: region,    /* 必须 */
        Key: key
      }))
    }
    return new Promise((resolve, reject) => {
      Promise.all(tasks).then(datas => resolve(datas)).catch(err => reject(err))
    })
  }

}

const store = new Wrapper()
export default store
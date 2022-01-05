
import Router from 'koa-joi-router'
// import Tencentcloud from  'tencent-serverless-http'
import Boom from 'boom'
import {User} from '../models'
const tags = ['sms']

const cacheCode = {}

const expiration = 5 * 60 * 1000

export const router = Router()

export const verilySmsCode = (phone, code) => {
  clearCacheCode()
  if(cacheCode[phone] ) {
    if(cacheCode[phone].used === 2) {
      throw Boom.badData("验证码已使用")
    }else if (cacheCode[phone].num > 3) {
      throw Boom.badData("验证码次过多")
    }else if(code !== cacheCode[phone].code) {
      throw Boom.badData("验证码不正确")
    }else {
      cacheCode[phone].used = 2
      cacheCode[phone].num++
      return true
    }
  }else {
    throw Boom.badData("验证码不正确")
  }
}

router.route({
  method: 'post',
  path: '/',
  meta: {swagger: {
    summary: '获取短信验证码',
    tags
  }},
  handler: [async ctx => {
    const {phone} = ctx.request.body
    // const user = User.findOne({where: {phone}})
    // if(user){
    //   throw Boom.badRequest('phone is unique')
    // }
    const sessionCode = getSms()
    try{
      await sendSms(phone, sessionCode.code)
      sessionCode.sendTime = new Date().getTime()
      cacheCode[phone] = sessionCode
      ctx.body = {done: true}
    }catch(error) {
      console.error(error)
      throw error
    }
  }]
})

router.route({
  method: 'post',
  path: '/verily',
  meta: {
    swagger: {
      summary: '校验短信验证码',
      tags
    }
  },
  handler: [async ctx=> {
    const {phone, code} = ctx.request.body

    if(verilySmsCode(phone, code)) {
      ctx.body={ done: true }
    }
  }]
})


function clearCacheCode() {
  for(const phone in cacheCode) {
    if(new Date().getTime() - cacheCode[phone].sendTime>expiration) {
      delete cacheCode[phone]
    }
  }
}

function getSms() {
  const code = Math.random().toString().slice(-6);//生成6位数随机验证码
  const sessionId = Math.random().toString().slice(-8);//生成8位随机数
  const sessionCode = {
    code,
    sessionId,
    sendTime: new Date().getTime(),
    num: 0,//验证次数，最多可验证3次
    used: 1//1-未使用，2-已使用
  }
  return sessionCode
}

/**
 *
 * @param {*} 功能：通过 SDK 发送短信
 * @param {*} 参数：手机号、短信验证码
 */
 async function sendSms(phone, code) {
  const tencentcloud = require('tencentcloud-sdk-nodejs');
  const SmsClient = tencentcloud.sms.v20210111.Client;
  //腾讯云账户 secretId，secretKey，切勿泄露
  const secretId = process.env.TENCENT_SECRET_ID;//需要配置为真实的 secretId
  const secretKey = process.env.TENCENT_SECRET_KEY;//需要配置为真实的 secretKey
  const clientConfig = {
    credential: {
      secretId,
      secretKey,
    },
    region: "ap-nanjing",
    profile: {
      httpProfile: {
        endpoint: "sms.tencentcloudapi.com",
      },
    },
  };
  const client = new SmsClient(clientConfig);
  phone = "+86" + phone;//国内手机号
  let req = {
      PhoneNumberSet: [phone],//发送短信的手机号
      TemplateId: "1118910",//<a href="#Step1_2">步骤1.2</a> 中创建并记录的模板 ID
      SignName: "有宠分子",
      // Sign: "404577",//<a href="#Step1_1">步骤1.1</a> 中创建的签名
      TemplateParamSet: [code, '5'],//随机验证码
      SmsSdkAppId: "1400572901"//短信应用 ID
  }

  function smsPromise() {
      return new Promise((resolve, reject) => {
          client.SendSms(req, function (errMsg, response) {
              if (errMsg) {
                  reject(errMsg)
              } else {
                  if (response.SendStatusSet && response.SendStatusSet[0] && response.SendStatusSet[0].Code === "Ok") {
                      resolve({
                          errorCode: 0,
                          errorMessage: response.SendStatusSet[0].Message,
                          data: {
                              codeStr: response.SendStatusSet[0].Code,
                              requestId: response.RequestId
                          }
                      })
                  } else {
                      resolve({
                          errorCode: -1003,//短信验证码发送失败
                          errorMessage: response.SendStatusSet[0].Message,
                          data: {
                              codeStr: response.SendStatusSet[0].Code,
                              requestId: response.RequestId
                          }
                      })
                  }
              }
          });
      })
  }

  let queryResult = await smsPromise()
  return queryResult
}


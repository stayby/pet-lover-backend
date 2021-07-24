declare module 'koa-joi-router' {
  import * as Koa from 'koa'
  import * as Joi from 'joi'
  import * as KoaRouter from 'koa-router'

  interface Request extends Koa.Request {
    body: any
    parts?: { field?: { [key: string]: any } }
    params: { [key: string]: string }
  }

  export interface Context extends Koa.Context {
    request: Request
    [otherProperty: string]: any
    model: typeof Model
    filterInstances?(): any
    getInstance(paronoid: boolean = true): Promise<any>
    core(): Promise<any>
  }
  export type Middleware = (ctx: Context, next?: Function) => Promise<void> | void
  type Schema = Joi.ObjectSchema | { [key: string]: Joi.AnySchema } | Joi.AlternativesSchema | Joi.ArraySchema

  export interface Spec {
    method: string | string[]
    path: string | RegExp
    handler: Middleware | Middleware[]
    validate?: {
      type?: string
      body?: Schema
      query?: Schema
      params?: Schema
      header?: Schema
      output?: {
        [status: string]: {
          body: Schema
        }
      }
    },
    meta?: {
      swagger: {
        summary: string,
        description?: string,
        tags: string[]
      }
    }
  }

  interface createRouter {
    (): createRouter.Router
    Joi: typeof Joi
  }

  declare namespace createRouter {
    interface Router {
      routes: Spec[]
      param(param: string, middleware: (param: string, context: Koa.Context, next: () => Promise<any>) => any): void
      use(path: string, ...middleware: (Middleware | Middleware[])[]): Router
      use(...middleware: (Middleware | Middleware[])[]): Router
      get(path: string, ...middleware: (Middleware | Middleware[])[]): Router
      delete(path: string, ...middleware: (Middleware | Middleware[])[]): Router
      post(path: string, ...middleware: (Middleware | Middleware[])[]): Router
      put(path: string, ...middleware: (Middleware | Middleware[])[]): Router
      route(spec: Spec | Spec[]): Router
      prefix(prefix: string): void
      middleware(): Koa.Middleware
      router: KoaRouter
    }
  }

  declare var createRouter: createRouter
  export = createRouter
}

declare module 'koa-joi-router-docs' {
  import { Router } from 'koa-joi-router'
  class SwaggerAPI {
    addJoiRouter(spec: Router, options?: { prefix: string }): void
    generateSpec(spec: object, options?: object): object
  }
}

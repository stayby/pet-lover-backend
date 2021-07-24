// import { Sequelize, Model } from 'sequelize-typescript'
// // import { dedup } from '../redis/redis'
// import Cacher from '../redis/Cacher'
// interface MaybeObject { toJSON?: () => Object, [key: string]: any }
// declare type Root = MaybeObject[] | MaybeObject

// export const toJSON = (item: Root): any => Array.isArray(item) ? item.map(toJSON) : (item && item.toJSON ? item.toJSON() : item)

// const No = 'No'
// const Yes = 'Yes'
// const Maybe = 'Maybe'

// type B = 'No'|'Yes'|'Maybe'

// class Traveller {
//   context_check: (context: string[]) => B
//   populateKey: string

//   constructor(exp: string) {
//     const paths = exp.split("/")
//     this.populateKey = paths.pop()
//     const wildcard = paths[0] === '*'
//     paths.reverse()
//     if (wildcard) paths.pop()

//     this.context_check = (ctx: string[]) => {
//       if (!ctx[0] || ctx.length < paths.length) return Maybe
//       const match = paths.every((path, i) => path === ctx[i])
//       return match ? Yes : (wildcard ? Maybe : No)
//     }
//   }

//   travel(root: Root, onEach: (root: Object[]|Object, context: string[]) => void, ...startContext: string[]) {
//     const deeper = (root: Object, context: string[]) => {
//       if (root) {
//         for (const key of Object.keys(root)) {
//           if (root[key] && typeof root[key] === 'object' && root[key].constructor !== Date) {
//             root[key] = action(root[key], key, ...context)
//           }
//         }
//       }
//     }

//     const action = (root: Root, ...context: string[]) => {
//       const check = this.context_check(context)
//       if (check === No) return root
//       root = toJSON(root)
//       if (check === Yes) {
//         onEach(root, context.slice())
//       }
//       if (Array.isArray(root)) {
//         for (const each of root) { deeper(each, context) }
//       } else {
//         deeper(root, context)
//       }
//       return root
//     }

//     return action(root, ...startContext)
//   }
// }

// type Populator = (ids: number[]) => Promise<Object | void>
// type Future = (object: Object) => void
// type ContextReader = (...context: string[]) => [string, string[], Populator]

// const safeAssign = (source: Object, ...targets: Object[]) => {
//   for (const target of targets) {
//     if (target) {
//       for (const key of Object.keys(target)) {
//         if (source[key] && typeof target[key] === 'object') {
//           try {
//             Object.assign(source[key], target[key])
//           } catch (error) {
//             console.log(source[key], target[key])
//           }
//         } else {
//           source[key] = target[key]
//         }
//       }
//     }
//   }
// }

// export class InjectorReducer {
//   cache_fn: Populator
//   context_reader: ContextReader
//   __jobs: Map<string, number[]> = new Map()
//   __futures: Map<string, Future[]> = new Map()
//   __cache_fn: Map<string, Populator> = new Map()
//   removeKey: boolean

//   constructor(cache_fn: Populator, removeKey: boolean) {
//     this.cache_fn = cache_fn
//     this.removeKey = removeKey
//   }

//   inject(root: Root, populateKey: string, keyed_objects: Object) {
//     if (Array.isArray(root)) {
//       root.forEach(object => this.injectEach(object, populateKey, keyed_objects))
//     } else {
//       this.injectEach(root, populateKey, keyed_objects)
//     }
//   }

//   injectEach(json: Object, populateKey: string, keyed_objects: Object) {
//     const key = json[populateKey]
//     if (!key) return
//     if (Array.isArray(key)) {
//       const pluralKey = Sequelize.Utils.pluralize(populateKey.replace('_ids', ''))
//       json[pluralKey] = key.map(key => keyed_objects[key]).filter(x => x)
//     } else {
//       const value = keyed_objects[key]
//       // console.log('injectEach', json, key, value)

//       if (Array.isArray(value)) {
//         safeAssign(json, ...value)
//       } else {
//         safeAssign(json, value)
//       }
//     }
//     if (this.removeKey && populateKey.includes('_id')) {
//       delete json[populateKey]
//     }
//   }

//   addJobs(context_key: string, ids: number[]) {
//     this.__jobs.set(context_key, (this.__jobs.get(context_key) || []).concat(ids))
//   }

//   addFuture(context_key: string, future: Future) {
//     this.__futures.set(context_key, (this.__futures.get(context_key) || []).concat(future))
//   }

//   grabIDs(objects: Object[]|Object, populateKey: string) {
//     const ids: number[] = []
//     const _grab = (object: Object) => {
//       if (object) {
//         const id = object[populateKey]
//         const type = typeof id
//         if (type === 'string' || type === 'number') {
//           ids.push(id)
//         } else if (Array.isArray(id)) {
//           ids.push(...id)
//         }
//       }
//     }
//     if (Array.isArray(objects)) {
//       objects.forEach(_grab)
//     } else {
//       _grab(objects)
//     }
//     return ids
//   }

//   add(root: Object[] | Object, populateKey: string, context: string[]) {
//     const ids = this.grabIDs(root, populateKey)
//     if (!ids || !ids.length) return
//     let context_key
//     if (this.context_reader) {
//       const ret = this.context_reader(...context)
//       if (!ret) return
//       const [property, new_context, fn] = ret
//       context_key = property + '/' + new_context.join('/')
//       this.__cache_fn.set(context_key, fn)
//     } else {
//       context_key = '*'
//     }
//     const future = keyed_objects => this.inject(root, populateKey, keyed_objects)
//     this.addJobs(context_key, ids)
//     this.addFuture(context_key, future)
//   }

//   async exec() {
//     const promises: Promise<any>[] = []
//     const resolves: Map<string, any> = new Map()

//     for (const [context_key, ids] of this.__jobs) {
//       const cache_fn = this.__cache_fn.get(context_key) || this.cache_fn
//       if (!cache_fn) continue
//       promises.push(cache_fn(ids).then(keyed_objects => {
//         if (keyed_objects) {
//           resolves.set(context_key, keyed_objects)
//         }
//       }))
//     }
//     await Promise.all(promises)
//     for (const [context_key, keyed_objects] of resolves) {
//       const futures = this.__futures.get(context_key)
//       if (futures) {
//         futures.forEach(future => future(keyed_objects))
//       }
//     }
//   }
// }

// const scheme_populator = (populateKey: string, fn: (ids: number[]) => Promise<any[]>) => {
//   const property = populateKey.replace(/_ids?$/, '')
//   const isPlural = Sequelize.Utils.pluralize(populateKey) === populateKey || populateKey === 'id'
//   return async (ids: number[]) => {
//     const rows = await fn(ids)
//     if (isPlural) {
//       return Object.assign({}, ...rows.map(row => ({ [row.id]: row })))
//     } else {
//       return Object.assign({}, ...rows.map(row => ({ [row.id]: { [property]: row } })))
//     }
//   }
// }

// export default class Injector extends Traveller {

//   reducerMaker: () => InjectorReducer

//   constructor(exp: string) {
//     super(exp)
//     let populator: Populator
//     if (cache_fn instanceof Cacher) {
//       populator = scheme_populator(this.populateKey, async (ids) => {
//         const rows = await cache_fn.findAll(ids)
//         return rows.map((row: any) => row.toJSON())
//       })
//     } else if (!!cache_fn['sequelize']) {
//       populator = scheme_populator(this.populateKey, async (ids) => {
//         const rows = await Model.findAll.bind(cache_fn)({
//           where: { id: ids }
//           // where: { id: dedup(ids) }
//         })
//         return rows.map((row: any) => row.toJSON())
//       })
//     } else {
//       populator = cache_fn as Populator
//     }
//     this.reducerMaker = () => new InjectorReducer(populator, removeKey)

//   }

//   // constructor(exp: string, cache_fn: Function|(typeof Model)|Cacher<any>|InjectorReducer, removeKey: boolean = true) {
//   //   super(exp)
//   //   if (cache_fn instanceof InjectorReducer) {
//   //     this.reducerMaker = () => cache_fn
//   //     return
//   //   }
//   //   let populator: Populator
//   //   if (cache_fn instanceof Cacher) {
//   //     populator = scheme_populator(this.populateKey, async (ids) => {
//   //       const rows = await cache_fn.findAll(ids)
//   //       return rows.map((row: any) => row.toJSON())
//   //     })
//   //   } else if (!!cache_fn['sequelize']) {
//   //     populator = scheme_populator(this.populateKey, async (ids) => {
//   //       const rows = await Model.findAll.bind(cache_fn)({
//   //         where: { id: ids }
//   //         // where: { id: dedup(ids) }
//   //       })
//   //       return rows.map((row: any) => row.toJSON())
//   //     })
//   //   } else {
//   //     populator = cache_fn as Populator
//   //   }
//   //   this.reducerMaker = () => new InjectorReducer(populator, removeKey)
//   // }

//   async inject(root: Root, ...context: string[]) {
//     const reducer = this.reducerMaker()
//     root = super.travel(root, (object, context) => {
//       reducer.add(object, this.populateKey, context)
//     }, ...context)
//     await reducer.exec()
//     return root
//   }
// }

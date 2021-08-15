import { Sequelize } from "sequelize-typescript";

export { User, RoleLevel } from "./sequelize/User";

let log_db = false;
export const enable_log_db = (enable: boolean): void => {
  log_db = enable;
};
// const db_logger = (message) => {
//   if (log_db) {
//     log.info(message)
//   }
// }

// const sequelize = new Sequelize()
console.log("string", process.env.PG_CONNECT_STRING);

export const db = new Sequelize(process.env.PG_CONNECT_STRING || "", {
  // logging: db_logger,
  define: {
    underscored: true,
    timestamps: false,
    charset: "utf8mb4",
  },
  dialectOptions: {
    charset: "utf8mb4",
  },
  modelPaths: [__dirname + "/sequelize"],
  modelMatch: (filename: string, member: string) =>
    filename[0].toUpperCase() === filename[0] && member.startsWith(filename),
});

db.sync({ alter: true });

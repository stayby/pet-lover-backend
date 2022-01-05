import { Table, Column, Model, ForeignKey, IsIn, DataType } from "sequelize-typescript";
import { User } from './User'

@Table
export class Profile extends Model<Profile> {

  @ForeignKey(() => User)
  @Column
  user_id: number;

  @IsIn([['female', 'male']])
  @Column
  gender: string;

  @Column
  date_of_birth: Date

  @Column
  hobby: string

  @Column(DataType.TEXT)
  intreduction: string

}
import { Table, Column, Model, ForeignKey, DataType } from "sequelize-typescript";
import {User} from './User'

@Table
export class RealInfo extends Model<RealInfo> {

  @ForeignKey(() => User)
  @Column
  user_id: number

  @Column
  married_status: string

  @Column
  address: string

  @Column
  company: string

  @Column
  duty: string

  @Column
  monthly_income: string

  @Column
  monthly_budget: string

  @Column
  animal_source: string

  @Column

  hight_spending: string

  @Column(DataType.TEXT)
  introduction_for_salvor: string
}
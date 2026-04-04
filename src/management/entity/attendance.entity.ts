
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "../../auth/entity/employee.entity";

@Entity()
export class Attendance {
    @PrimaryGeneratedColumn('uuid')
    id: string;  

    @Column()
    TimeIn: Date;

    @Column({ nullable: true })
    TimeOut: Date;

    @ManyToOne(() => Employee, (employee) => employee.attendances, { nullable: false })
    employee: Employee;
    

}
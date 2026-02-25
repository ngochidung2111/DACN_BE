import { Employee } from "src/auth/entity/employee.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

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

import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "../../auth/entity/employee.entity";

@Entity()
@Index('idx_attendance_time_in', ['TimeIn'])
@Index('idx_attendance_employee_time_in', ['employee', 'TimeIn'])
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
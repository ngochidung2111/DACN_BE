import { Employee } from "src/auth/entity/employee.entity";
import { Column, JoinColumn, ManyToOne } from "typeorm";

export class LeaveRequest {
    @Column('uuid')
    id: string;

    @Column()
    created_at: Date;

    @Column()
    updated_at: Date;

    
    @JoinColumn({ name: 'employee_id' })
    @ManyToOne(() => Employee)
    employee: Employee;

    @Column('uuid')
    @ManyToOne(() => Employee)
    approved_by: string;

    @Column()
    date_from: Date;

    @Column()
    date_to: Date;

    @Column()
    reason: string;
    
}
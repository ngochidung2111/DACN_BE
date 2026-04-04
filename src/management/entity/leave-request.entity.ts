
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { LEAVE_REQUEST_STATUS } from "./constants";
import { Employee } from "../../auth/entity/employee.entity";

@Entity()
export class LeaveRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    
    @JoinColumn({ name: 'employee_id' })
    @ManyToOne(() => Employee)
    employee: Employee;

    @JoinColumn({ name: 'approved_by' })
    @ManyToOne(() => Employee, { nullable: true })
    approved_by?: Employee;

    @Column()
    date_from: Date;

    @Column()
    date_to: Date;

    @Column()
    reason: string;

    @Column()
    description: string;

    @Column({ default: LEAVE_REQUEST_STATUS.PENDING })
    status: LEAVE_REQUEST_STATUS;
    
}
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Employee } from "./employee.entity";

@Entity()
export class Degree {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    school: string;

    @Column()
    degree: string;

    @Column()
    fieldOfStudy: string;

    @Column()
    graduationYear: number;

    @Column({ nullable: true })
    description?: string;

    @ManyToOne(() => Employee, (employee) => employee.degrees, { nullable: false })
    employee: Employee;
}
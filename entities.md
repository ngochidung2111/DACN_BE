
**1. Rooms**
- `id`: Primary Key, unique identifier for the room
- `name`: String, name of the room (e.g., "Meeting Room A")
- `capacity`: Integer, maximum number of people the room can accommodate
- `equipment`: Array of strings, list of equipment available in the room (e.g., ["projector", "whiteboard"])

**2. Bookings**
- `id`: Primary Key, unique identifier for the booking
- `room_id`: Foreign Key, references `Rooms.id`
- `employee_id`: Foreign Key, references `Employees.id`
- `start_time`: DateTime, start time of the booking
- `end_time`: DateTime, end time of the booking
- `purpose`: String, purpose of the booking
- `status`: Enum, status of the booking (e.g., "confirmed", "checked-in", "checked-out", "cancelled")
- `recurring_id`: Foreign Key, (nullable) references a recurring booking pattern

**3. RecurringBookings**
- `id`: Primary Key, unique identifier for the recurring booking pattern
- `room_id`: Foreign Key, references `Rooms.id`
- `employee_id`: Foreign Key, references `Employees.id`
- `start_time`: Time, start time of the recurring booking
- `end_time`: Time, end time of the recurring booking
- `purpose`: String, purpose of the booking
- `pattern`: String, recurring pattern (e.g., "weekly", "monthly")
- `start_date`: Date, start date of the recurring booking
- `end_date`: Date, end date of the recurring booking

**4. Assets**
- `id`: Primary Key, unique identifier for the asset
- `name`: String, name of the asset (e.g., "Laptop")
- `type`: String, type of the asset (e.g., "Electronics")
- `condition`: Enum, condition of the asset (e.g., "new", "in use", "broken", "under maintenance", "retired")
- `purchase_date`: Date, date the asset was purchased
- `warranty_expiration_date`: Date, date the warranty expires
- `maintenance_schedule`: Date, next scheduled maintenance date

**5. AssetAssignments**
- `id`: Primary Key, unique identifier for the assignment
- `asset_id`: Foreign Key, references `Assets.id`
- `employee_id`: Foreign Key, references `Employees.id`
- `assignment_date`: Date, date the asset was assigned
- `return_date`: Date, (nullable) date the asset was returned

**6. Tickets**
- `id`: Primary Key, unique identifier for the ticket
- `employee_id`: Foreign Key, references `Employees.id` (the employee who created the ticket)
- `assignee_id`: Foreign Key, (nullable) references `Employees.id` (the support staff assigned to the ticket)
- `category`: Enum, category of the ticket (e.g., "IT", "HR", "Maintenance")
- `title`: String, title of the ticket
- `description`: Text, detailed description of the issue
- `status`: Enum, status of the ticket (e.g., "New", "In Progress", "Resolved")
- `created_at`: DateTime, timestamp when the ticket was created
- `updated_at`: DateTime, timestamp when the ticket was last updated

**7. Employees**
- `id`: Primary Key, unique identifier for the employee
- `name`: String, full name of the employee
- `email`: String, unique email address of the employee
- `department`: String, department the employee belongs to
- `role`: Enum, role of the employee (e.g., "Admin", "Manager", "Employee", "Support Staff")
- `password`: String, hashed password for authentication

**8. Notifications**
- `id`: Primary Key, unique identifier for the notification
- `employee_id`: Foreign Key, references `Employees.id`
- `message`: Text, content of the notification
- `type`: Enum, type of notification (e.g., "meeting_reminder", "ticket_update", "warranty_reminder")
- `status`: Enum, status of the notification (e.g., "sent", "read")
- `created_at`: DateTime, timestamp when the notification was created

**9. CompanyAnnouncements**
- `id`: Primary Key, unique identifier for the announcement
- `employee_id`: Foreign Key, references `Employees.id` (author of the post)
- `title`: String, title of the announcement
- `content`: Text, content of the announcement
- `category`: Enum, category of the announcement (e.g., "General", "HR", "Events")
- `created_at`: DateTime, timestamp when the announcement was created
- `pinned`: Boolean, whether the announcement is pinned to the top

**10. AnnouncementInteractions**
- `id`: Primary Key, unique identifier for the interaction
- `announcement_id`: Foreign Key, references `CompanyAnnouncements.id`
- `employee_id`: Foreign Key, references `Employees.id`
- `interaction_type`: Enum, type of interaction (e.g., "like", "comment", "acknowledgement")
- `comment`: Text, (nullable) content of the comment

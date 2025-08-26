// This file is for local configuration overrides.
// It is not committed to version control.

import { registerAs } from '@nestjs/config';
import { Employee } from '../auth/entity/employee.entity';
import { Room } from '../management/entity/room.entity';
import { Asset } from '../management/entity/asset.entity';
import { AssetAssignment } from '../management/entity/asset-assignment.entity';
import { Booking } from '../management/entity/booking.entity';
import { RecurringBooking } from '../management/entity/recurring-booking.entity';
import { Ticket } from '../management/entity/ticket.entity';
import { Notification } from '../management/entity/notification.entity';
import { CompanyAnnouncement } from '../management/entity/company-announcement.entity';
import { AnnouncementInteraction } from '../management/entity/announcement-interaction.entity';

export default registerAs('database', () => ({
}));

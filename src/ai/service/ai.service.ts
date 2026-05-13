import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAgent, DynamicTool } from 'langchain';

import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatHistory } from '../entity/chat-history.entity';
import { ChatHistoryService } from './chat-history.service';
import { DepartmentService } from '../../auth/service/department.service';
import { EmployeeService } from '../../auth/service/employee.service';
import { AnnouncementService } from '../../management/service/announcement.service';
import { AttendanceService } from '../../management/service/attendance.service';
import { BookingService } from '../../management/service/booking.service';
import { LeaveRequestService } from '../../management/service/leave-request.service';
import { LEAVE_REQUEST_TYPE, ROLE } from '../../management/entity/constants';
import { TICKET_STATUS } from '../../management/entity/constants';
import { RoomService } from '../../management/service/room.service';
import { TicketService } from '../../management/service/ticket.service';

type ChatParams = {
  userId: string;
  email?: string;
  roles?: string[] | string;
  message: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly employeeService: EmployeeService,
    private readonly departmentService: DepartmentService,
    private readonly bookingService: BookingService,
    private readonly roomService: RoomService,
    private readonly attendanceService: AttendanceService,
    private readonly leaveRequestService: LeaveRequestService,
    private readonly announcementService: AnnouncementService,
    private readonly ticketService: TicketService,
    private readonly chatHistoryService: ChatHistoryService,
  ) {}

  async chat(params: ChatParams): Promise<ChatResponseDto> {
    const sessionId = await this.resolveEmployeeSessionId(params.userId);
    const normalizedRoles = this.normalizeRoles(params.roles);

    if (this.isRestrictedSystemStatsQuestion(params.message) && !this.hasRole(normalizedRoles, ROLE.ADMIN)) {
      const deniedReply =
        'Bạn không có quyền truy cập thông tin này. Vui lòng liên hệ quản trị viên nếu bạn nghĩ đây là lỗi.';

      await this.chatHistoryService.saveMessage(
        params.userId,
        sessionId,
        params.message,
        deniedReply,
        'action',
      );

      return {
        reply: deniedReply,
        source: 'action',
        action: 'role_restriction',
      };
    }

    const history = await this.chatHistoryService.getSessionHistory(params.userId, sessionId, 10);
    const reply = await this.invokeGeminiAgent(params, history, sessionId);

    await this.chatHistoryService.saveMessage(
      params.userId,
      sessionId,
      params.message,
      reply,
      'llm',
    );

    return {
      reply,
      source: 'llm',
    };
  }

  private async invokeGeminiAgent(
    params: ChatParams,
    history: ChatHistory[] = [],
    sessionId?: string,
  ): Promise<string> {
    const apiKey = this.configService.get<string>('ai.geminiApiKey') || '';
    const modelName = this.configService.get<string>('ai.geminiModel') || 'gemini-2.0-flash';
    const temperature = this.configService.get<number>('ai.geminiTemperature') ?? 0.3;
    const maxOutputTokens = this.configService.get<number>('ai.geminiMaxOutputTokens') ?? 1024;
    const verbose = this.configService.get<boolean>('ai.langchainVerbose') ?? false;

    if (!apiKey) {
      return 'AI_GEMINI_API_KEY or GOOGLE_API_KEY is missing. Please configure Gemini API key in environment variables.';
    }

    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: modelName,
      temperature,
      maxOutputTokens,
    });

    const tools = [
      new DynamicTool({
        name: 'get_current_datetime',
        description:
          'Get the current date/time context in Vietnam timezone (UTC+7) and UTC. Use this for questions about current time/date and relative date words (hôm nay, ngày mai, ngày kia).',
        func: async () => {
          const now = new Date();
          const vietnamDate = this.formatDateInVietnamTimezone(now);
          const vietnamTime = this.formatTimeInVietnamTimezone(now);

          return JSON.stringify({
            success: true,
            timezone: 'Asia/Ho_Chi_Minh',
            utc_iso: now.toISOString(),
            vietnam_date: vietnamDate,
            vietnam_time: vietnamTime,
            vietnam_datetime: `${vietnamDate} ${vietnamTime}`,
          });
        },
      }),
      new DynamicTool({
        name: 'get_user_context',
        description:
          'Get authenticated user context including userId, email, and roles. Use this to personalize answers.',
        func: async () =>
          JSON.stringify({
            userId: params.userId,
            email: params.email || 'unknown',
            roles: this.normalizeRoles(params.roles),
          }),
      }),
      new DynamicTool({
        name: 'get_my_profile',
        description: 'Get current authenticated employee profile details.',
        func: async () => {
          const employee = await this.employeeService.findById(params.userId);
          return JSON.stringify({
            success: true,
            data: {
              id: employee.id,
              email: employee.email,
              firstName: employee.firstName,
              middleName: employee.middleName,
              leaveBalance: employee.leaveBalance,
              lastName: employee.lastName,
              phone: employee.phone,
              address: employee.address,
              roles: employee.roles,
              department: employee.department
                ? {
                    id: employee.department.id,
                    name: employee.department.name,
                  }
                : null,
              avatarUrl: employee.avatarUrl,
            },
          });
        },
      }),
      new DynamicTool({
        name: 'list_departments',
        description: 'Get all departments in company.',
        func: async () => {
          const departments = await this.departmentService.findAll();
          return JSON.stringify({
            success: true,
            total: departments.length,
            data: departments.map((department) => ({
              id: department.id,
              name: department.name,
            })),
          });
        },
      }),
      new DynamicTool({
        name: 'attendance_check_in',
        description: 'Check in attendance for current user.',
        func: async () => {
          try {
            const attendance = await this.attendanceService.checkIn(params.userId);
            return JSON.stringify({
              success: true,
              message: 'Checked in successfully',
              data: attendance,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return JSON.stringify({
              success: false,
              error: errorMessage,
              message: 'Bạn đã check in rồi và chưa check out. Vui lòng check out trước khi check in lại.',
            });
          }
        },
      }),
      new DynamicTool({
        name: 'attendance_check_out',
        description: 'Check out attendance for current user.',
        func: async () => {
          try {
            const attendance = await this.attendanceService.checkOut(params.userId);
            return JSON.stringify({
              success: true,
              message: 'Checked out successfully',
              data: attendance,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return JSON.stringify({
              success: false,
              error: errorMessage,
              message: 'Bạn chưa check in. Vui lòng check in trước.',
            });
          }
        },
      }),
      new DynamicTool({
        name: 'get_my_attendance',
        description:
          'Get attendance history of current user. Input JSON optional: page, pageSize, fromDate, toDate.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const data = await this.attendanceService.getAttendanceByEmployee(params.userId, {
            page: this.readSafeLimit(payload.page, 1, 1000),
            pageSize: this.readSafeLimit(payload.pageSize, 20, 100),
            fromDate: this.readOptionalString(payload.fromDate),
            toDate: this.readOptionalString(payload.toDate),
          });

          return JSON.stringify({
            success: true,
            total: data.length,
            data,
          });
        },
      }),
      new DynamicTool({
        name: 'get_my_monthly_attendance_summary',
        description:
          'Get monthly attendance summary of current user. Input JSON optional: year, month.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const now = new Date();
          const year = this.readSafeLimit(payload.year, now.getFullYear(), 9999);
          const month = this.readSafeLimit(payload.month, now.getMonth() + 1, 12);
          const summary = await this.attendanceService.getMonthlyAttendanceSummary(
            params.userId,
            year,
            month,
          );

          return JSON.stringify({
            success: true,
            data: summary,
          });
        },
      }),
      new DynamicTool({
        name: 'submit_leave_request',
        description:
          'Submit leave request for current user. Input JSON required: date_from, date_to, type, reason. Optional: description.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const leaveRequest = await this.leaveRequestService.submitLeaveRequest(params.userId, {
            date_from: String(payload.date_from || ''),
            date_to: String(payload.date_to || ''),
              type: String(payload.type || '') as LEAVE_REQUEST_TYPE,
            reason: String(payload.reason || ''),
            description: this.readOptionalString(payload.description),
          });

          return JSON.stringify({
            success: true,
            message: 'Leave request submitted successfully',
            data: leaveRequest,
          });
        },
      }),
      new DynamicTool({
        name: 'get_my_leave_requests',
        description:
          'Get my leave requests. Input JSON optional: page, pageSize, search, fromDate, toDate.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const result = await this.leaveRequestService.getMyLeaveRequests(params.userId, {
            page: this.readSafeLimit(payload.page, 1, 1000),
            pageSize: this.readSafeLimit(payload.pageSize, 20, 100),
            search: this.readOptionalString(payload.search),
            fromDate: this.readOptionalString(payload.fromDate),
            toDate: this.readOptionalString(payload.toDate),
          });

          return JSON.stringify({
            success: true,
            ...result,
          });
        },
      }),
      new DynamicTool({
        name: 'get_my_leave_summary',
        description: 'Get leave request summary of current user.',
        func: async () => {
          const summary = await this.leaveRequestService.getMyLeaveSummary(params.userId);
          return JSON.stringify({
            success: true,
            data: summary,
          });
        },
      }),
      new DynamicTool({
        name: 'list_meeting_rooms',
        description:
          'List meeting rooms. Input JSON optional: room_name, min_capacity. Returns matched rooms.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const roomName = this.readOptionalString(payload.room_name);
          const minCapacity = payload.min_capacity !== undefined ? Number(payload.min_capacity) : undefined;
          const rooms = await this.roomService.getAllRooms();

          const filtered = rooms.filter((room) => {
            const byName = roomName
              ? room.name.toLowerCase().includes(roomName.toLowerCase())
              : true;
            const byCapacity = minCapacity !== undefined && !Number.isNaN(minCapacity)
              ? room.capacity >= minCapacity
              : true;
            return byName && byCapacity;
          });

          return JSON.stringify({
            success: true,
            total: filtered.length,
            data: filtered,
          });
        },
      }),
      new DynamicTool({
        name: 'get_my_bookings',
        description: 'Get current user bookings where user is creator or attendee.',
        func: async () => {
          const bookings = await this.bookingService.findByCreatorOrAttendee(params.userId);
          return JSON.stringify({
            success: true,
            total: bookings.length,
            data: bookings,
          });
        },
      }),
      new DynamicTool({
        name: 'get_recent_announcements',
        description:
          'Get recent announcements. Input JSON optional: search, page, pageSize, pinned.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const page = this.readSafeLimit(payload.page, 1, 1000);
          const pageSize = this.readSafeLimit(payload.pageSize, 10, 50);
          const pinned =
            payload.pinned === undefined
              ? undefined
              : this.readBoolean(payload.pinned);

          const announcements = await this.announcementService.getAnnouncements(
            {
              page,
              pageSize,
              search: this.readOptionalString(payload.search),
              pinned,
            },
            params.userId,
          );

          return JSON.stringify({
            success: true,
            data: announcements,
          });
        },
      }),
      new DynamicTool({
        name: 'list_my_ticket_categories',
        description:
          'List ticket categories available for current user based on department. Input JSON optional: issue_text. Use this before creating a ticket so user can choose category.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const issueText = this.readOptionalString(payload.issue_text);
          const categories = await this.getAvailableTicketCategoriesForUser(params.userId);

          const suggestions = issueText
            ? this.rankTicketCategoriesByIssue(categories, issueText).slice(0, 3)
            : [];

          const fallbackSuggestions =
            categories.length === 0 && issueText
              ? this.rankTicketCategoriesByIssue(
                  await this.getActiveTicketCategories(),
                  issueText,
                ).slice(0, 3)
              : [];

          return JSON.stringify({
            success: true,
            total: categories.length,
            using_department_categories: categories.length > 0,
            message:
              categories.length > 0
                ? 'Hay yeu cau user chon 1 category_id trong danh sach truoc khi tao ticket.'
                : 'Khong co category nao duoc gan cho phong ban cua ban. AI se goi y category phu hop de ban gui admin gan quyen.',
            data: categories.map((category) => ({
              id: category.id,
              name: category.name,
              description: category.description,
            })),
            suggestions: suggestions.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              score: item.score,
              matched_keywords: item.matchedKeywords,
            })),
            fallback_suggestions: fallbackSuggestions.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              score: item.score,
              matched_keywords: item.matchedKeywords,
            })),
          });
        },
      }),
      new DynamicTool({
        name: 'suggest_ticket_category',
        description:
          'Suggest best ticket category from issue text by matching category name/description. Input JSON required: issue_text. Optional: limit (max 5).',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const issueText = this.readOptionalString(payload.issue_text);

          if (!issueText) {
            return JSON.stringify({
              success: false,
              error: 'issue_text la bat buoc',
            });
          }

          const limit = this.readSafeLimit(payload.limit, 3, 5);
          const availableCategories = await this.getAvailableTicketCategoriesForUser(params.userId);
          const allActiveCategories = await this.getActiveTicketCategories();

          const scopedCategories =
            availableCategories.length > 0 ? availableCategories : allActiveCategories;

          const ranked = this.rankTicketCategoriesByIssue(scopedCategories, issueText).slice(
            0,
            limit,
          );

          return JSON.stringify({
            success: true,
            issue_text: issueText,
            using_department_categories: availableCategories.length > 0,
            department_category_count: availableCategories.length,
            total_candidates: scopedCategories.length,
            recommendations: ranked.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              score: item.score,
              matched_keywords: item.matchedKeywords,
            })),
            note:
              availableCategories.length > 0
                ? 'Ban co the chon category_id duoc de tao ticket ngay.'
                : 'Phong ban cua ban chua duoc gan category. Hay gui de xuat nay cho admin/manager de gan quyen truoc khi tao ticket.',
          });
        },
      }),
      new DynamicTool({
        name: 'create_my_ticket',
        description:
          'Create ticket for current user. Input JSON required: title, description. Category is required via category_id OR category_name. Always call list_my_ticket_categories first and let user choose.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const title = String(payload.title || '').trim();
          const description = String(payload.description || '').trim();

          if (!title || !description) {
            return JSON.stringify({
              success: false,
              error: 'title va description la bat buoc de tao ticket',
            });
          }

          const categories = await this.getAvailableTicketCategoriesForUser(params.userId);
          if (categories.length === 0) {
            const suggested = this.rankTicketCategoriesByIssue(
              await this.getActiveTicketCategories(),
              `${title} ${description}`,
            ).slice(0, 3);

            return JSON.stringify({
              success: false,
              error:
                'Khong co category nao kha dung cho phong ban cua ban. Vui long lien he quan tri vien.',
              suggested_categories: suggested.map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                score: item.score,
              })),
            });
          }

          const categoryId = this.readOptionalString(payload.category_id);
          const categoryName = this.readOptionalString(payload.category_name);

          const resolvedCategory = this.resolveTicketCategory(categories, categoryId, categoryName);

          if (!resolvedCategory) {
            return JSON.stringify({
              success: false,
              error:
                'Khong tim thay category phu hop. Vui long chon category_id hop le tu danh sach list_my_ticket_categories.',
              available_categories: categories.map((category) => ({
                id: category.id,
                name: category.name,
              })),
            });
          }

          const ticket = await this.ticketService.createTicket(
            {
              category_id: resolvedCategory.id,
              title,
              description,
            },
            params.userId,
          );

          return JSON.stringify({
            success: true,
            message: 'Tao ticket thanh cong',
            data: {
              id: ticket.id,
              title: ticket.title,
              description: ticket.description,
              status: ticket.status,
              category: ticket.category
                ? {
                    id: ticket.category.id,
                    name: ticket.category.name,
                  }
                : null,
              created_at: ticket.created_at,
            },
          });
        },
      }),
      new DynamicTool({
        name: 'get_my_tickets',
        description:
          'Get tickets created by current user. Input JSON optional: page, limit, status, keyword, category_id.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const statusValue = this.readOptionalString(payload.status);
          const normalizedStatus = statusValue?.trim().toUpperCase();
          const status = normalizedStatus && Object.values(TICKET_STATUS).includes(normalizedStatus as TICKET_STATUS)
            ? (normalizedStatus as TICKET_STATUS)
            : undefined;

          const result = await this.ticketService.getMyTickets(params.userId, {
            page: this.readSafeLimit(payload.page, 1, 1000),
            limit: this.readSafeLimit(payload.limit, 10, 100),
            status,
            keyword: this.readOptionalString(payload.keyword),
            category_id: this.readOptionalString(payload.category_id),
          });

          return JSON.stringify({
            success: true,
            ...result,
          });
        },
      }),
      new DynamicTool({
        name: 'get_chat_history',
        description:
          'Get recent chat history of current employee session. Input JSON supports optional limit (max 20).',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const sessionId = await this.resolveEmployeeSessionId(params.userId);
          const limit = this.readSafeLimit(payload.limit, 10, 20);

          const history = await this.chatHistoryService.getSessionHistory(
            params.userId,
            sessionId,
            limit,
          );

          return JSON.stringify({
            success: true,
            session_id: sessionId,
            count: history.length,
            data: history.map((item) => ({
              id: item.id,
              userMessage: item.userMessage,
              aiResponse: item.aiResponse,
              source: item.source,
              createdAt: item.createdAt,
            })),
          });
        },
      }),
      new DynamicTool({
        name: 'clear_chat_history',
        description:
          'Clear current employee chat history session. Returns deleted confirmation.',
        func: async (input: string) => {
          this.parseJsonInput(input);
          const sessionId = await this.resolveEmployeeSessionId(params.userId);

          await this.chatHistoryService.clearSession(params.userId, sessionId);

          return JSON.stringify({
            success: true,
            session_id: sessionId,
            message: 'Chat history cleared successfully',
          });
        },
      }),
      new DynamicTool({
        name: 'check_meeting_room_schedule',
        description:
          'Check meeting room availability/schedule by timeframe. Input must be JSON string with start_time, end_time, optional room_id, optional min_capacity.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const startTime = new Date(String(payload.start_time || ''));
          const endTime = new Date(String(payload.end_time || ''));

          if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            return JSON.stringify({
              success: false,
              error: 'start_time/end_time must be valid ISO datetime strings',
            });
          }

          const minCapacity =
            payload.min_capacity !== undefined ? Number(payload.min_capacity) : undefined;

          const schedules = await this.bookingService.getMeetingRoomSchedule(
            startTime,
            endTime,
            this.readOptionalString(payload.room_id),
            Number.isNaN(minCapacity as number) ? undefined : minCapacity,
          );

          const result = schedules.map((item) => ({
            room_id: item.room.id,
            room_name: item.room.name,
            capacity: item.room.capacity,
            location: item.room.location,
            available: item.available,
            conflict_count: item.conflictCount,
            conflicts: item.conflicts,
          }));

          return JSON.stringify({
            success: true,
            total_rooms: result.length,
            data: result,
          });
        },
      }),
      new DynamicTool({
        name: 'book_meeting_room',
        description:
          'Create a meeting room booking. Input must be JSON string with start_time, end_time, purpose. Supports: (1) explicit room_id, OR (2) auto-select by room_name and/or min_capacity. Attendee IDs optional.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);

          let roomId = this.readOptionalString(payload.room_id);
          const roomName = this.readOptionalString(payload.room_name);
          const minCapacity = payload.min_capacity
            ? Number(payload.min_capacity)
            : undefined;

          const startTime = new Date(String(payload.start_time || ''));
          const endTime = new Date(String(payload.end_time || ''));

          if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
            return JSON.stringify({
              success: false,
              error: 'start_time/end_time must be valid ISO datetime strings',
            });
          }

          // Auto-select room if room_id not provided
          if (!roomId) {
            // Find available rooms for the time slot
            const schedules = await this.bookingService.getMeetingRoomSchedule(
              startTime,
              endTime,
              undefined,
              minCapacity,
            );

            // Filter by room name if provided
            let availableRooms = schedules.filter((item) => item.available);
            if (roomName) {
              availableRooms = availableRooms.filter((item) =>
                item.room.name.toLowerCase().includes(roomName.toLowerCase()),
              );
            }

            if (availableRooms.length === 0) {
              const filters = [
                roomName ? `tên "${roomName}"` : '',
                minCapacity ? `sức chứa ≥ ${minCapacity} người` : '',
              ]
                .filter((f) => f)
                .join(', ');
              return JSON.stringify({
                success: false,
                error: `Không tìm thấy phòng trống phù hợp (${filters || 'bất kỳ tiêu chí nào'}). Vui lòng thử khác thời gian hoặc tiêu chí khác.`,
              });
            }

            // Select smallest room that fits (to optimize space usage)
            const selectedRoom = availableRooms.sort(
              (a, b) => a.room.capacity - b.room.capacity,
            )[0];
            roomId = selectedRoom.room.id;
          }

          try {
            const booking = await this.bookingService.createBooking(params.userId, {
              room_id: String(roomId || ''),
              start_time: String(payload.start_time || ''),
              end_time: String(payload.end_time || ''),
              purpose: String(payload.purpose || ''),
              attendee_ids: this.readStringArray(payload.attendee_ids),
            });

            return JSON.stringify({
              success: true,
              message: 'Meeting room booked successfully',
              data: booking,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('book_meeting_room failed', error as any);
            return JSON.stringify({
              success: false,
              error: errorMessage,
            });
          }
        },
      }),
      new DynamicTool({
        name: 'get_system_attendance_stats',
        description:
          'Get system-wide attendance statistics for today. ADMIN ONLY. Input JSON optional: department_id. Returns total checked in, pending checkout, etc.',
        func: async (input: string) => {
          const normalizedRoles = this.normalizeRoles(params.roles);
          if (!this.hasRole(normalizedRoles, ROLE.ADMIN)) {
            return JSON.stringify({
              success: false,
              error: 'Only ADMIN can access system attendance statistics',
            });
          }

          try {
            const payload = this.parseJsonInput(input);
            const departmentId = this.readOptionalString(payload.department_id);

            if (departmentId) {
              const deptStatus = await this.attendanceService.getDepartmentTodayCheckInStatus(
                params.userId,
              );
              return JSON.stringify({
                success: true,
                scope: 'department',
                data: deptStatus,
              });
            }

            // System-wide stats for all departments
            const departments = await this.departmentService.findAll();
            const stats: Array<{ department: string; checked_in: number; pending_checkout: number }> = [];

            for (const dept of departments) {
              const employees = await this.employeeService.findByDepartmentId(dept.id);
              let checkedIn = 0;
              let pendingCheckout = 0;

              for (const emp of employees) {
                const status = await this.attendanceService.getTodayCheckInStatus(emp.id);
                if (status.checkedIn) {
                  checkedIn++;
                  if (!status.checkedOut) {
                    pendingCheckout++;
                  }
                }
              }

              stats.push({
                department: dept.name,
                checked_in: checkedIn,
                pending_checkout: pendingCheckout,
              });
            }

            return JSON.stringify({
              success: true,
              scope: 'system',
              total_departments: departments.length,
              data: stats,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return JSON.stringify({
              success: false,
              error: errorMessage,
            });
          }
        },
      }),
      new DynamicTool({
        name: 'get_system_leave_stats',
        description:
          'Get system-wide leave request statistics. ADMIN ONLY. Returns total pending, approved, rejected leave requests.',
        func: async () => {
          const normalizedRoles = this.normalizeRoles(params.roles);
          if (!this.hasRole(normalizedRoles, ROLE.ADMIN)) {
            return JSON.stringify({
              success: false,
              error: 'Only ADMIN can access system leave statistics',
            });
          }

          try {
            const departments = await this.departmentService.findAll();
            const summaries: Array<{
              department: string;
              total: number;
              pending: number;
              approved: number;
              rejected: number;
            }> = [];

            for (const dept of departments) {
              const employees = await this.employeeService.findByDepartmentId(dept.id);
              let deptTotal = 0;
              let deptPending = 0;
              let deptApproved = 0;
              let deptRejected = 0;

              for (const emp of employees) {
                try {
                  const summary = await this.leaveRequestService.getMyLeaveSummary(emp.id);
                  deptTotal += summary.total;
                  deptPending += summary.pending || 0;
                  deptApproved += summary.approved || 0;
                  deptRejected += summary.rejected || 0;
                } catch {
                  // Skip if error
                }
              }

              if (deptTotal > 0) {
                summaries.push({
                  department: dept.name,
                  total: deptTotal,
                  pending: deptPending,
                  approved: deptApproved,
                  rejected: deptRejected,
                });
              }
            }

            const totalStats = {
              total: summaries.reduce((sum, s) => sum + s.total, 0),
              pending: summaries.reduce((sum, s) => sum + s.pending, 0),
              approved: summaries.reduce((sum, s) => sum + s.approved, 0),
              rejected: summaries.reduce((sum, s) => sum + s.rejected, 0),
            };

            return JSON.stringify({
              success: true,
              scope: 'system',
              total_stats: totalStats,
              by_department: summaries,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return JSON.stringify({
              success: false,
              error: errorMessage,
            });
          }
        },
      }),
      new DynamicTool({
        name: 'get_system_employee_stats',
        description:
          'Get system-wide employee statistics. ADMIN ONLY. Returns total employees by department, roles distribution.',
        func: async () => {
          const normalizedRoles = this.normalizeRoles(params.roles);
          if (!this.hasRole(normalizedRoles, ROLE.ADMIN)) {
            return JSON.stringify({
              success: false,
              error: 'Only ADMIN can access system employee statistics',
            });
          }

          try {
            const departments = await this.departmentService.findAll();
            const deptStats: Array<{ department: string; total_employees: number }> = [];
            let totalEmployees = 0;

            for (const dept of departments) {
              const employees = await this.employeeService.findByDepartmentId(dept.id);
              deptStats.push({
                department: dept.name,
                total_employees: employees.length,
              });
              totalEmployees += employees.length;
            }

            return JSON.stringify({
              success: true,
              scope: 'system',
              total_employees: totalEmployees,
              total_departments: departments.length,
              by_department: deptStats,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return JSON.stringify({
              success: false,
              error: errorMessage,
            });
          }
        },
      }),
      new DynamicTool({
        name: 'get_system_overview_report',
        description:
          'Get a comprehensive system overview report. ADMIN ONLY. Returns combined attendance, leave, employee, and announcement highlights for the whole company. Use this when admin asks for system reports, dashboards, or a total overview.',
        func: async () => {
          const normalizedRoles = this.normalizeRoles(params.roles);
          if (!this.hasRole(normalizedRoles, ROLE.ADMIN)) {
            return JSON.stringify({
              success: false,
              error: 'Only ADMIN can access system overview report',
            });
          }

          try {
            const departments = await this.departmentService.findAll();
            const overviewByDepartment: Array<{
              department: string;
              employees: number;
              checked_in: number;
              pending_checkout: number;
              leave_total: number;
              leave_pending: number;
              leave_approved: number;
              leave_rejected: number;
            }> = [];

            let totalEmployees = 0;
            let totalCheckedIn = 0;
            let totalPendingCheckout = 0;
            let totalLeave = 0;
            let totalLeavePending = 0;
            let totalLeaveApproved = 0;
            let totalLeaveRejected = 0;

            for (const dept of departments) {
              const employees = await this.employeeService.findByDepartmentId(dept.id);
              let deptCheckedIn = 0;
              let deptPendingCheckout = 0;
              let deptLeaveTotal = 0;
              let deptLeavePending = 0;
              let deptLeaveApproved = 0;
              let deptLeaveRejected = 0;

              totalEmployees += employees.length;

              for (const emp of employees) {
                const attendanceStatus = await this.attendanceService.getTodayCheckInStatus(emp.id);
                if (attendanceStatus.checkedIn) {
                  deptCheckedIn++;
                  totalCheckedIn++;

                  if (!attendanceStatus.checkedOut) {
                    deptPendingCheckout++;
                    totalPendingCheckout++;
                  }
                }

                try {
                  const leaveSummary = await this.leaveRequestService.getMyLeaveSummary(emp.id);
                  deptLeaveTotal += leaveSummary.total || 0;
                  deptLeavePending += leaveSummary.pending || 0;
                  deptLeaveApproved += leaveSummary.approved || 0;
                  deptLeaveRejected += leaveSummary.rejected || 0;

                  totalLeave += leaveSummary.total || 0;
                  totalLeavePending += leaveSummary.pending || 0;
                  totalLeaveApproved += leaveSummary.approved || 0;
                  totalLeaveRejected += leaveSummary.rejected || 0;
                } catch {
                  // Skip employees whose leave summary is unavailable.
                }
              }

              overviewByDepartment.push({
                department: dept.name,
                employees: employees.length,
                checked_in: deptCheckedIn,
                pending_checkout: deptPendingCheckout,
                leave_total: deptLeaveTotal,
                leave_pending: deptLeavePending,
                leave_approved: deptLeaveApproved,
                leave_rejected: deptLeaveRejected,
              });
            }

            const recentAnnouncements = await this.announcementService.getAnnouncements(
              {
                page: 1,
                pageSize: 5,
              },
              params.userId,
            );

            return JSON.stringify({
              success: true,
              scope: 'system',
              generated_at: new Date().toISOString(),
              total_departments: departments.length,
              total_employees: totalEmployees,
              attendance_today: {
                checked_in: totalCheckedIn,
                pending_checkout: totalPendingCheckout,
              },
              leave_requests: {
                total: totalLeave,
                pending: totalLeavePending,
                approved: totalLeaveApproved,
                rejected: totalLeaveRejected,
              },
              recent_announcements: {
                total: recentAnnouncements.total,
                items: recentAnnouncements.items.map((announcement) => ({
                  id: announcement.id,
                  title: announcement.title,
                  category: announcement.category,
                  pinned: announcement.pinned,
                  created_at: announcement.created_at,
                })),
              },
              by_department: overviewByDepartment,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return JSON.stringify({
              success: false,
              error: errorMessage,
            });
          }
        },
      }),
      new DynamicTool({
        name: 'get_vietnam_today',
        description:
          'Get date context in Vietnam timezone (UTC+7), including today/yesterday/tomorrow. Use this before booking to avoid day offset.',
        func: async () => {
          const now = new Date();
          const dateStr = this.formatDateInVietnamTimezone(now);
          const todayUtc = this.convertVietnamDateTimeToUTC(dateStr, '00:00:00');

          const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const tomorrowStr = this.formatDateInVietnamTimezone(tomorrowDate);
          const yesterdayStr = this.formatDateInVietnamTimezone(yesterdayDate);

          return JSON.stringify({
            success: true,
            timezone: 'Asia/Ho_Chi_Minh',
            vietnam_date: dateStr,
            vietnam_time: this.formatTimeInVietnamTimezone(now),
            yesterday_vietnam_date: yesterdayStr,
            tomorrow_vietnam_date: tomorrowStr,
            iso_utc_midnight: todayUtc,
          });
        },
      }),
      new DynamicTool({
        name: 'convert_vietnam_time_to_utc',
        description:
          'Convert Vietnam time (UTC+7) to UTC ISO string. IMPORTANT: Always use this tool when converting user-provided times for booking. Input JSON required: date (YYYY-MM-DD), time (HH:MM or HH:MM:SS). Returns UTC ISO string for booking.',
        func: async (input: string) => {
          const payload = this.parseJsonInput(input);
          const dateStr = this.readOptionalString(payload.date);
          const timeStr = this.readOptionalString(payload.time);

          if (!dateStr || !timeStr) {
            return JSON.stringify({
              success: false,
              error: 'date (YYYY-MM-DD) and time (HH:MM) are required',
            });
          }

          try {
            const utcIsoString = this.convertVietnamDateTimeToUTC(dateStr, timeStr);
            return JSON.stringify({
              success: true,
              vietnam_time: `${dateStr} ${timeStr}`,
              utc_iso: utcIsoString,
              message: `Vietnam time ${dateStr} ${timeStr} (UTC+7) = ${utcIsoString} (UTC)`,
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: 'Invalid date or time format. Use YYYY-MM-DD for date, HH:MM for time.',
            });
          }
        },
      }),
    ];

    const systemPrompt =
      'You are an internal HR assistant. Answer clearly and concisely. Use available tools when needed. Always respond in Vietnamese unless the user asks for another language. You can support profile lookup, attendance, leave requests, announcements, ticket support, and meeting room booking. CRITICAL for meeting room booking: Vietnam is UTC+7 timezone. You must never infer date from raw UTC timestamps. Always resolve relative date phrases ("hôm nay", "ngày mai", "ngày mốt", "hôm qua") using get_vietnam_today first. Then convert each Vietnam local time to UTC using convert_vietnam_time_to_utc before calling book_meeting_room. Steps: (1) Call get_vietnam_today to resolve exact Vietnam date. (2) Map relative day phrase to a concrete YYYY-MM-DD in Vietnam timezone. (3) For each time user mentions, call convert_vietnam_time_to_utc with that date and time. (4) Use returned utc_iso values as start_time and end_time for book_meeting_room. Example: User says "7h đến 8h sáng ngày mai" -> get tomorrow_vietnam_date from get_vietnam_today -> convert 07:00 and 08:00 -> call book_meeting_room with returned UTC strings. For ticket requests, first call suggest_ticket_category with issue_text, then call list_my_ticket_categories and ask user to choose a category before creating ticket. If department has no category permission, still provide recommendation based on category description and explain that admin/manager must assign permission first. For ADMIN users: You also have access to system-wide statistics tools (get_system_attendance_stats, get_system_leave_stats, get_system_employee_stats, get_system_overview_report). Use get_system_overview_report when admin asks for a comprehensive system report, tổng quan hệ thống, dashboards, or company-wide statistics.';

    const agent = createAgent({
      model: llm,
      tools,
      systemPrompt,
    });

    try {
      const userContext = JSON.stringify({
        userId: params.userId,
        email: params.email || 'unknown',
        roles: this.normalizeRoles(params.roles),
        sessionId: sessionId || '',
      });
      const historyMessages = this.mapHistoryToMessages(history);

      const response = await agent.invoke({
        messages: [
          ...historyMessages,
          {
            role: 'human',
            content: `User context: ${userContext}\n\nQuestion: ${params.message}`,
          },
        ],
      });

      if (verbose) {
        this.logger.log(`Gemini agent executed for userId=${params.userId}`);
      }

      const messages = Array.isArray((response as { messages?: unknown }).messages)
        ? ((response as { messages: Array<{ content?: unknown }> }).messages)
        : [];
      const lastMessage = messages[messages.length - 1];
      const lastContent = this.extractMessageContent(lastMessage?.content);

      return lastContent || 'No response generated from Gemini Agent.';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Gemini agent error';
      this.logger.error(`Gemini agent invoke failed: ${message}`);
      throw new InternalServerErrorException('Failed to process Gemini agent request');
    }
  }

  private extractMessageContent(content: unknown): string {
    if (typeof content === 'string') {
      return content.trim();
    }

    if (Array.isArray(content)) {
      const text = content
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          if (item && typeof item === 'object' && 'text' in (item as Record<string, unknown>)) {
            const value = (item as Record<string, unknown>).text;
            return typeof value === 'string' ? value : '';
          }

          return '';
        })
        .join(' ')
        .trim();

      return text;
    }

    return '';
  }

  private normalizeRoles(roles: unknown): string[] {
    if (Array.isArray(roles)) {
      return roles.filter((role): role is string => typeof role === 'string' && role.length > 0);
    }

    if (typeof roles === 'string' && roles.length > 0) {
      return [roles];
    }

    if (roles && typeof roles === 'object' && 'name' in (roles as Record<string, unknown>)) {
      const roleName = (roles as Record<string, unknown>).name;
      return typeof roleName === 'string' && roleName.length > 0 ? [roleName] : [];
    }

    return [];
  }

  private hasRole(userRoles: string[], role: ROLE): boolean {
    const target = String(role).toLowerCase();
    return userRoles.some((item) => item.toLowerCase() === target);
  }

  private isRestrictedSystemStatsQuestion(message: string): boolean {
    const normalized = this.normalizeText(message);

    const statsTerms = [
      'thong ke',
      'bao cao',
      'so lieu',
      'dashboard',
      'summary',
      'report',
      'stats',
      'chi so',
      'kpi',
    ];

    const systemScopeTerms = [
      'he thong',
      'tong quan',
      'toan cong ty',
      'cong ty',
      'toan bo',
      'tat ca phong ban',
      'company wide',
      'system wide',
      'overall',
      'global',
    ];

    const explicitRestrictedPatterns = [
      /tong\s+so\s+nhan\s+vien/,
      /ti\s+le\s+di\s+lam/,
      /ti\s+le\s+vang\s+mat/,
      /thong\s+ke\s+ticket/,
      /thong\s+ke\s+tai\s+san/,
      /thong\s+ke\s+cham\s+cong/,
      /thong\s+ke\s+nghi\s+phep/,
    ];

    const hasStatsIntent = statsTerms.some((term) => normalized.includes(term));
    const hasSystemScope = systemScopeTerms.some((term) => normalized.includes(term));
    const hasExplicitRestricted = explicitRestrictedPatterns.some((pattern) => pattern.test(normalized));

    return (hasStatsIntent && hasSystemScope) || hasExplicitRestricted;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatDateInVietnamTimezone(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    return formatter.format(date);
  }

  private formatTimeInVietnamTimezone(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return formatter.format(date);
  }

  private convertVietnamDateTimeToUTC(dateStr: string, timeStr: string): string {
    // Convert Vietnam time (UTC+7) to UTC ISO string
    // dateStr: "2026-05-11", timeStr: "11:00" or "11:00:00"
    // UTC time = Vietnam time - 7 hours
    const parts = dateStr.split('-');
    const timeParts = timeStr.split(':');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[2], 10);
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;

    // Create a UTC date by subtracting 7 hours from Vietnam time
    // This gives us the correct UTC timestamp
    const dateUtc = new Date(Date.UTC(year, month, day, hour - 7, minute, second, 0));
    return dateUtc.toISOString();
  }

  private parseJsonInput(input: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(input || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Input must be a JSON object');
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new InternalServerErrorException(
        'Invalid tool input format. Please provide a valid JSON object string.',
      );
    }
  }

  private readOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    return undefined;
  }

  private readStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const strings = value.filter((item): item is string => typeof item === 'string');
    return strings.length > 0 ? strings : undefined;
  }

  private readSafeLimit(value: unknown, fallback: number, max: number): number {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 1) {
      return fallback;
    }

    return Math.min(Math.floor(parsed), max);
  }

  private readBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['1', 'true', 'yes', 'on'].includes(normalized);
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return false;
  }

  private mapHistoryToMessages(history: ChatHistory[]): Array<{ role: 'human' | 'assistant'; content: string }> {
    if (!history.length) {
      return [];
    }

    return history.flatMap((entry) => {
      const userMessage = entry.userMessage?.trim();
      const aiResponse = entry.aiResponse?.trim();
      const messages: Array<{ role: 'human' | 'assistant'; content: string }> = [];

      if (userMessage) {
        messages.push({ role: 'human', content: userMessage });
      }

      if (aiResponse) {
        messages.push({ role: 'assistant', content: aiResponse });
      }

      return messages;
    });
  }

  private async getAvailableTicketCategoriesForUser(userId: string) {
    const employee = await this.employeeService.findById(userId);

    if (!employee.department?.id) {
      return [];
    }

    return this.ticketService.getTicketCategories({
      department_id: employee.department.id,
    });
  }

  private async resolveEmployeeSessionId(userId: string): Promise<string> {
    const employee = await this.employeeService.findById(userId);
    return employee.id;
  }

  private async getActiveTicketCategories() {
    return this.ticketService.getTicketCategories({});
  }

  private rankTicketCategoriesByIssue(
    categories: Array<{ id: string; name: string; description?: string | null }>,
    issueText: string,
  ): Array<{
    id: string;
    name: string;
    description?: string | null;
    score: number;
    matchedKeywords: string[];
  }> {
    const normalizedIssue = this.normalizeText(issueText);
    const keywords = normalizedIssue
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3);

    const uniqueKeywords = Array.from(new Set(keywords));

    return categories
      .map((category) => {
        const searchable = this.normalizeText(
          `${category.name || ''} ${category.description || ''}`,
        );

        let score = 0;
        const matchedKeywords: string[] = [];

        if (normalizedIssue.includes(this.normalizeText(category.name || ''))) {
          score += 6;
        }

        for (const keyword of uniqueKeywords) {
          if (searchable.includes(keyword)) {
            score += 2;
            matchedKeywords.push(keyword);
          }
        }

        return {
          id: category.id,
          name: category.name,
          description: category.description,
          score,
          matchedKeywords,
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private resolveTicketCategory(
    categories: Array<{ id: string; name: string }>,
    categoryId?: string,
    categoryName?: string,
  ): { id: string; name: string } | undefined {
    if (categoryId) {
      return categories.find((category) => category.id === categoryId);
    }

    if (!categoryName) {
      return undefined;
    }

    const normalizedInput = this.normalizeText(categoryName);

    const exact = categories.find(
      (category) => this.normalizeText(category.name) === normalizedInput,
    );
    if (exact) {
      return exact;
    }

    return categories.find((category) =>
      this.normalizeText(category.name).includes(normalizedInput),
    );
  }
}

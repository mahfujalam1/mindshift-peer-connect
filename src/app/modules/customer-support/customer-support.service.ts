import httpStatus from 'http-status';
import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import AppError from '../../error/appError';
import { sendNotification } from '../../helper/notificationHelper';
import sendEmail from '../../utilities/sendEmail';
import User from '../user/user-model';
import { TUserRole } from '../user/user-interface';
import { CustomerSupport } from './customer-support.model';

const createTicket = async (
  payload: { name: string, email: string, title: string; description: string }
) => {
  const user = await User.findOne({ email: payload.email }).select('fullName email');
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exist using this email. Please put your valid email address");
  }

  const result = await CustomerSupport.create({
    user: new Types.ObjectId(user?._id),
    requesterName: payload.name,
    requesterEmail: payload.email,
    title: payload.title,
    description: payload.description,
  });

  await sendNotification(
    'admin',
    'New Customer Support Query',
    `${user.fullName} submitted a customer support query.`,
    { type: 'customer_support', ticketId: result._id }
  );

  await sendEmail({
    email: user.email,
    subject: `Customer Support Query: ${payload.title}`,
    html: `<p>Hello ${user.fullName},</p><p>Your query "${payload.title}" has been received. We will get back to you soon.</p>`,
  });

  return result;
};

const getAllTickets = async (query: Record<string, unknown>) => {
  const ticketQuery = new QueryBuilder(
    CustomerSupport.find()
      .populate('user', 'fullName email profileImage')
      .populate('repliedBy', 'fullName email'),
    query
  )
    .search(['title', 'description', 'requesterName', 'requesterEmail'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await ticketQuery.modelQuery;
  const meta = await ticketQuery.countTotal();
  return { meta, result };
};

const getMyTickets = async (
  userId: string,
  query: Record<string, unknown>
) => {
  const ticketQuery = new QueryBuilder(
    CustomerSupport.find({ user: new Types.ObjectId(userId) }).populate(
      'repliedBy',
      'fullName'
    ),
    query
  )
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await ticketQuery.modelQuery;
  const meta = await ticketQuery.countTotal();
  return { meta, result };
};

const getTicketById = async (
  ticketId: string,
  userId: string,
  role: TUserRole
) => {
  if (!Types.ObjectId.isValid(ticketId)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid ticket ID');
  }

  const ticket = await CustomerSupport.findById(ticketId)
    .populate('user', 'fullName email profileImage')
    .populate('repliedBy', 'fullName email');
  if (!ticket) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer support ticket not found');
  }

  if (role !== 'admin' && ticket.user._id.toString() !== userId) {
    throw new AppError(httpStatus.FORBIDDEN, 'You cannot access this ticket');
  }

  return ticket;
};

const updateMyTicket = async (
  ticketId: string,
  userId: string,
  payload: { title?: string; description?: string }
) => {
  const result = await CustomerSupport.findOneAndUpdate(
    {
      _id: ticketId,
      user: new Types.ObjectId(userId),
      status: 'Pending',
    },
    payload,
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Pending customer support ticket not found'
    );
  }
  return result;
};

const replyToTicket = async (
  ticketId: string,
  adminId: string,
  reply: string
) => {
  const ticket = await CustomerSupport.findByIdAndUpdate(
    ticketId,
    {
      reply,
      repliedBy: new Types.ObjectId(adminId),
      repliedAt: new Date(),
      status: 'Replied',
    },
    { new: true, runValidators: true }
  );

  if (!ticket) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer support ticket not found');
  }

  const safeTitle = ticket.title.replace(/[<>&"']/g, '');
  const safeReply = reply.replace(/[<>&"']/g, '');
  await Promise.all([
    sendEmail({
      email: ticket.requesterEmail,
      subject: `Reply to your support query: ${ticket.title}`,
      html: `<p>Hello ${ticket.requesterName},</p><p>Your query <strong>${safeTitle}</strong> has received a reply:</p><p>${safeReply}</p>`,
    }),
    sendNotification(
      ticket.user.toString(),
      'Customer Support Reply',
      `Your query "${ticket.title}" has been answered.`,
      { type: 'customer_support', ticketId: ticket._id }
    ),
  ]);

  return ticket;
};

const closeTicket = async (ticketId: string, userId: string, role: TUserRole) => {
  const filter: Record<string, unknown> = { _id: ticketId };
  if (role !== 'admin') filter.user = new Types.ObjectId(userId);

  const result = await CustomerSupport.findOneAndUpdate(
    filter,
    { status: 'Closed' },
    { new: true }
  );
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer support ticket not found');
  }
  return result;
};

const deleteTicket = async (ticketId: string, userId: string, role: TUserRole) => {
  const filter: Record<string, unknown> = { _id: ticketId };
  if (role !== 'admin') filter.user = new Types.ObjectId(userId);

  const result = await CustomerSupport.findOneAndDelete(filter);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer support ticket not found');
  }
  return result;
};

export const CustomerSupportServices = {
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicketById,
  updateMyTicket,
  replyToTicket,
  closeTicket,
  deleteTicket,
};

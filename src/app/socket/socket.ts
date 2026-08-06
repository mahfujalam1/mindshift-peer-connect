/* eslint-disable no-console */
import { Server as HTTPServer } from 'http';
import { Types } from 'mongoose';
import { Server as IOServer, Socket } from 'socket.io';
import { getPublicFileUrl } from '../helper/multer-s3-uploader';
import { sendNotification } from '../helper/notificationHelper';
import { sendSinglePushNotification } from '../helper/sendPushNotification';
import { Conversation, Message } from '../modules/chat/chat.model';
import { ChatAsset } from '../modules/chat-asset/chat-asset.model';
import { LiveDiscussion, LiveMessage } from '../modules/live-discussion/live-discussion.model';
import User from '../modules/user/user-model';
import { areUsersBlocked } from '../modules/user/user-block.utils';

type TMessageStatus = 'sent' | 'delivered' | 'seen';

type TSendMessagePayload = {
    conversationId: string;
    text?: string;
    file?: string;
    assetId?: string;
};

type TLiveMessagePayload = {
    roomId: string;
    text?: string;
    file?: string;
};

type TSeenMessagePayload = {
    conversationId: string;
    messageId?: string;
};

type TMessageResponse = Record<string, unknown> & {
    file?: string | null;
    asset?: (Record<string, unknown> & { url?: string | null }) | null;
};

let io: IOServer;

// Map to track active call sessions: roomName => { caller, receiver }
const activeCalls = new Map<string, { caller: { id: string; fullName: string; profileImage: string }; receiver: { id: string; fullName: string; profileImage: string } }>();

const onlineUsers = new Map<string, Set<string>>();

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const isUserOnline = (userId: string) => onlineUsers.has(userId);

const addOnlineUser = (userId: string, socketId: string) => {
    const userSockets = onlineUsers.get(userId) || new Set<string>();
    userSockets.add(socketId);
    onlineUsers.set(userId, userSockets);
};



const removeOnlineUser = (userId: string, socketId: string) => {
    const userSockets = onlineUsers.get(userId);
    if (!userSockets) {
        return;
    }

    userSockets.delete(socketId);
    if (!userSockets.size) {
        onlineUsers.delete(userId);
    }
};

const getOnlineConversationPartners = async (userId: string) => {
    const conversations = await Conversation.find({ participants: userId }).select('participants');
    const partnerIds = new Set(
        conversations.flatMap(conv => 
            conv.participants
                .map(p => p.toString())
                .filter(pId => pId !== userId)
        )
    );
    return Array.from(partnerIds).filter(partnerId => onlineUsers.has(partnerId));
};

const emitOnlineUsersForUser = async (userId: string) => {
    const onlinePartners = await getOnlineConversationPartners(userId);
    io.to(userId).emit('onlineUser', onlinePartners);
};

const emitOnlineUsersToPartners = async (userId: string) => {
    const conversations = await Conversation.find({ participants: userId }).select('participants');
    const partnerIds = new Set(
        conversations.flatMap(conv => 
            conv.participants
                .map(p => p.toString())
                .filter(pId => pId !== userId)
        )
    );
    for (const partnerId of partnerIds) {
        if (onlineUsers.has(partnerId)) {
            await emitOnlineUsersForUser(partnerId);
        }
    }
};

const emitMessageStatus = (
    userId: string,
    payload: {
        conversationId: unknown;
        messageId: unknown;
        status: TMessageStatus;
    }
) => {
    io.to(userId).emit('message_status_updated', payload);
};

const markPendingMessagesAsDelivered = async (receiverId: string) => {
    const pendingMessages = await Message.find({
        receiver: receiverId,
        status: 'sent',
    }).select('_id conversation sender');

    if (!pendingMessages.length) {
        return;
    }

    await Message.updateMany(
        { _id: { $in: pendingMessages.map((message) => message._id) } },
        { status: 'delivered' }
    );

    pendingMessages.forEach((message) => {
        const payload = {
            conversationId: message.conversation,
            messageId: message._id,
            status: 'delivered' as const,
        };

        emitMessageStatus(message.sender.toString(), payload);
        emitMessageStatus(receiverId, payload);
    });
};

const getConversationForUser = async (
    socket: Socket,
    conversationId: string,
    userId: string
) => {
    if (!Types.ObjectId.isValid(conversationId)) {
        socket.emit('message_error', { message: 'Invalid conversationId' });
        return null;
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        socket.emit('message_error', { message: 'Conversation not found' });
        return null;
    }

    const isParticipant = conversation.participants.some(
        (participantId) => participantId.toString() === userId
    );

    if (!isParticipant) {
        socket.emit('message_error', {
            message: 'You are not a participant in this conversation',
        });
        return null;
    }

    return conversation;
};

const sendOfflineMessagePush = async (
    receiverId: string,
    senderName: string,
    message: {
        _id: unknown;
        conversation: unknown;
        sender: unknown;
        text?: string;
        file?: string | null;
        asset?: unknown;
    }
) => {
    try {
        await sendSinglePushNotification(
            receiverId,
            senderName,
            message.text || (message.asset ? 'Sent you a chat asset' : 'Sent you a file'),
            {
                type: 'message',
                conversationId: String(message.conversation),
                messageId: String(message._id),
                senderId: String(message.sender),
            }
        );
    } catch (error) {
        console.error('Offline message notification failed:', error);
    }
};

const normalizeMessageUrl = (message: unknown): TMessageResponse => {
    const messageObj = message && typeof message === 'object' && 'toObject' in message
        ? (message as { toObject: () => TMessageResponse }).toObject()
        : message as TMessageResponse;

    if (typeof messageObj.file === 'string') {
        messageObj.file = getPublicFileUrl(messageObj.file) || messageObj.file;
    }

    if (messageObj.asset?.url) {
        messageObj.asset.url = getPublicFileUrl(messageObj.asset.url) || messageObj.asset.url;
    }

    return messageObj;
};

const getConversationListForUser = async (userId: string) => {
    const [conversations, currentUser] = await Promise.all([
        Conversation.find({ participants: userId })
            .populate({
                path: 'participants',
                select: '_id fullName email profileImage',
            })
            .populate({
                path: 'lastMessage',
                populate: [
                    { path: 'sender', select: '_id fullName profileImage' },
                    { path: 'receiver', select: '_id fullName profileImage' },
                    { path: 'asset' },
                ],
            })
            .sort({ updatedAt: -1 })
            .lean(),
        User.findById(userId).select('+blockedUsers').lean(),
    ]);

    const blockedUserIds = new Set(
        (currentUser?.blockedUsers || []).map((blockedUserId) => blockedUserId.toString())
    );

    return conversations.map((conversation: any) => {
        const receiver = conversation.participants?.find(
            (participant: any) => participant._id.toString() !== userId
        );

        return {
            ...conversation,
            lastMessage: conversation.lastMessage
                ? normalizeMessageUrl(conversation.lastMessage)
                : null,
            receiver: receiver
                ? {
                    ...receiver,
                    isBlocked: blockedUserIds.has(receiver._id.toString()),
                }
                : null,
        };
    });
};

const emitConversations = async (userId: string) => {
    const conversations = await getConversationListForUser(userId);
    io.to(userId).emit('conversations', conversations);
};

const getLiveRooms = async (userId?: string) => {
    const filter = userId
        ? { members: new Types.ObjectId(userId) }
        : {};

    const rooms = await LiveDiscussion.find(filter)
        .populate('members', '_id fullName email profileImage')
        .populate({
            path: 'lastMessage',
            populate: {
                path: 'sender',
                select: '_id fullName email profileImage',
            },
        })
        .sort({ updatedAt: -1 })
        .lean();

    const normalizedRooms = rooms.map((room: any) => ({
        ...room,
        lastMessage: room.lastMessage
            ? normalizeMessageUrl(room.lastMessage)
            : null,
    }));

    if (userId) {
        normalizedRooms.sort((firstRoom: any, secondRoom: any) => {
            const firstMessageTime = firstRoom.lastMessage?.createdAt
                ? new Date(firstRoom.lastMessage.createdAt).getTime()
                : 0;
            const secondMessageTime = secondRoom.lastMessage?.createdAt
                ? new Date(secondRoom.lastMessage.createdAt).getTime()
                : 0;

            return secondMessageTime - firstMessageTime;
        });
    }

    return normalizedRooms;
};

const emitUpdatedLiveRoomLists = async (memberIds: string[]) => {
    const allRooms = await getLiveRooms();
    io.emit('live_rooms', allRooms);

    await Promise.all(
        memberIds.map(async (memberId) => {
            const joinedRooms = await getLiveRooms(memberId);
            io.to(memberId).emit('my_live_rooms', joinedRooms);
        })
    );
};

const initializeSocket = (server: HTTPServer) => {
    if (!io) {
        io = new IOServer(server, {
            pingTimeout: 60000,
            cors: {
                origin: [
                    'http://localhost:3007',
                    'http://localhost:3008',
                    'http://localhost:4000',
                ],
            },
        });

        io.on('connection', async (socket: Socket) => {
            const requestedUserId = socket.handshake.query.id;
            const userId = typeof requestedUserId === 'string' ? requestedUserId : '';

            if (!Types.ObjectId.isValid(userId)) {
                socket.disconnect();
                return;
            }

            const currentUser = await User.findById(userId).select('fullName');
            if (!currentUser) {
                socket.disconnect();
                return;
            }



            const currentUserId = currentUser._id.toString();
            socket.join(currentUserId);
            addOnlineUser(currentUserId, socket.id);
            await emitOnlineUsersForUser(currentUserId);
            await emitOnlineUsersToPartners(currentUserId);

            await markPendingMessagesAsDelivered(currentUserId);

            socket.on('get_conversations', async () => {
                try {
                    const conversations = await getConversationListForUser(currentUserId);
                    socket.emit('conversations', conversations);
                } catch (error) {
                    console.error('Socket get_conversations error:', error);
                    socket.emit('conversations_error', {
                        message: 'Failed to retrieve conversations',
                    });
                }
            });

            // ==================== Live Discussion Events ====================
            socket.on('get_live_rooms', async () => {
                try {
                    socket.emit('live_rooms', await getLiveRooms());
                } catch (error) {
                    console.error('Socket get_live_rooms error:', error);
                    socket.emit('live_rooms_error', {
                        message: 'Failed to retrieve live discussion rooms',
                    });
                }
            });

            socket.on('get_my_live_rooms', async () => {
                try {
                    socket.emit('my_live_rooms', await getLiveRooms(currentUserId));
                } catch (error) {
                    console.error('Socket get_my_live_rooms error:', error);
                    socket.emit('live_rooms_error', {
                        message: 'Failed to retrieve joined live discussion rooms',
                    });
                }
            });

            socket.on('get_live_messages', async (data: { roomId: string }) => {
                try {
                    const { roomId } = data || {};

                    if (!roomId || !Types.ObjectId.isValid(roomId)) {
                        socket.emit('live_messages_error', {
                            message: 'Valid roomId is required',
                        });
                        return;
                    }

                    const room = await LiveDiscussion.findById(roomId).select('members');
                    if (!room) {
                        socket.emit('live_messages_error', { message: 'Room not found' });
                        return;
                    }

                    const isMember = room.members.some(
                        (memberId) => memberId.toString() === currentUserId
                    );
                    if (!isMember) {
                        socket.emit('live_messages_error', {
                            message: 'You are not a member of this room',
                        });
                        return;
                    }

                    const messages = await LiveMessage.find({ room: roomId })
                        .populate('sender', '_id fullName email profileImage')
                        .sort({ createdAt: 1 });

                    socket.emit(
                        'live_messages',
                        messages.map((message) => normalizeMessageUrl(message))
                    );
                } catch (error) {
                    console.error('Socket get_live_messages error:', error);
                    socket.emit('live_messages_error', {
                        message: 'Failed to retrieve live discussion messages',
                    });
                }
            });

            socket.on('join_live_discussion', async (data: { roomId: string }) => {
                const { roomId } = data;
                if (!Types.ObjectId.isValid(roomId)) {
                    socket.emit('live_message_error', { message: 'Invalid roomId' });
                    return;
                }
                const room = await LiveDiscussion.findById(roomId);
                if (!room) {
                    socket.emit('live_message_error', { message: 'Room not found' });
                    return;
                }
                if (!room.members.includes(new Types.ObjectId(currentUserId))) {
                    socket.emit('live_message_error', { message: 'You are not a member of this room. Please join via API first.' });
                    return;
                }
                socket.join(roomId);
                console.log(`User ${currentUserId} joined live discussion room ${roomId}`);
            });

            socket.on('send_live_message', async (data: TLiveMessagePayload) => {
                try {
                    const { roomId, text, file } = data;
                    if (!roomId || (!text && !file)) {
                        socket.emit('live_message_error', { message: 'RoomId and text or file are required' });
                        return;
                    }

                    const room = await LiveDiscussion.findById(roomId);
                    if (!room) {
                        socket.emit('live_message_error', { message: 'Room not found' });
                        return;
                    }

                    if (!room.members.includes(new Types.ObjectId(currentUserId))) {
                        socket.emit('live_message_error', { message: 'You are not a member of this room' });
                        return;
                    }

                    const message = await LiveMessage.create({
                        room: room._id,
                        sender: new Types.ObjectId(currentUserId),
                        text: text || '',
                        file: file || null,
                    });

                    const populatedMessage = await message.populate('sender', 'fullName email profileImage');
                    const messageResponse = normalizeMessageUrl(populatedMessage);

                    const updatedRoom = await LiveDiscussion.findByIdAndUpdate(
                        roomId,
                        { lastMessage: message._id },
                        { new: true }
                    ).select('members');

                    io.to(roomId).emit('new_live_message', messageResponse);
                    await emitUpdatedLiveRoomLists(
                        (updatedRoom?.members || []).map((memberId) => memberId.toString())
                    );
                } catch (error) {
                    console.error('Socket send_live_message error:', error);
                    socket.emit('live_message_error', { message: 'Failed to send live message' });
                }
            });

            socket.on('send_message', async (data: TSendMessagePayload) => {
                // existing logic remains unchanged

                try {
                    const { conversationId, text, file, assetId } = data;
                    const normalizedText = text?.trim() || '';

                    if (!conversationId || (!normalizedText && !file && !assetId)) {
                        socket.emit('message_error', {
                            message: 'ConversationId and text, file or assetId are required',
                        });
                        return;
                    }

                    if (assetId && !Types.ObjectId.isValid(assetId)) {
                        socket.emit('message_error', { message: 'Invalid assetId' });
                        return;
                    }

                    const conversation = await getConversationForUser(
                        socket,
                        conversationId,
                        currentUserId
                    );

                    if (!conversation) {
                        return;
                    }

                    const receiverId = conversation.participants.find(
                        (participantId) => participantId.toString() !== currentUserId
                    );

                    if (!receiverId) {
                        socket.emit('message_error', { message: 'Message receiver not found' });
                        return;
                    }

                    const receiverUserId = receiverId.toString();
                    if (await areUsersBlocked(currentUserId, receiverUserId)) {
                        socket.emit('message_error', {
                            message: 'You cannot interact with this user because one of you has blocked the other',
                        });
                        return;
                    }
                    const status: TMessageStatus = isUserOnline(receiverUserId)
                        ? 'delivered'
                        : 'sent';
                    const asset = assetId
                        ? await ChatAsset.findOne({ _id: assetId, isActive: true })
                        : null;

                    if (assetId && !asset) {
                        socket.emit('message_error', { message: 'Chat asset not found' });
                        return;
                    }

                    const message = await Message.create({
                        conversation: conversation._id,
                        sender: new Types.ObjectId(currentUserId),
                        receiver: receiverId,
                        text: normalizedText,
                        file: file || null,
                        asset: asset?._id || null,
                        status,
                    });

                    await Conversation.findByIdAndUpdate(conversationId, {
                        lastMessage: message._id,
                    }, { new: true, runValidators: true });

                    const populatedMessage = await message.populate([
                        { path: 'sender', select: 'fullName email profileImage' },
                        { path: 'receiver', select: 'fullName email profileImage' },
                        { path: 'asset' },
                    ]);
                    const messageResponse = normalizeMessageUrl(populatedMessage);

                    if (isUserOnline(receiverUserId)) {
                        io.to(receiverUserId).emit('new_message', messageResponse);
                    } else {
                        await sendOfflineMessagePush(
                            receiverUserId,
                            currentUser.fullName || 'New message',
                            message
                        );
                    }

                    socket.emit('message_sent', messageResponse);
                    await Promise.all([
                        emitConversations(currentUserId),
                        emitConversations(receiverUserId),
                    ]);
                } catch (error) {
                    console.error('Socket send_message error:', error);
                    socket.emit('message_error', { message: 'Failed to send message' });
                }
            });

            // ==================== Call Events ====================
            // A user initiates a call
            socket.on('call_user', async (data: { receiverId: string; type: 'audio' | 'video' }) => {
                const { receiverId, type } = data;
                if (await areUsersBlocked(currentUserId, receiverId)) {
                    socket.emit('call_error', {
                        message: 'You cannot interact with this user because one of you has blocked the other',
                    });
                    return;
                }
                const roomName = `${currentUserId}-${receiverId}-${Date.now()}`;

                const [caller, receiver] = await Promise.all([
                    User.findById(currentUserId).select('fullName profileImage _id').lean(),
                    User.findById(receiverId).select('fullName profileImage _id').lean(),
                ]);

                activeCalls.set(roomName, {
                    caller: { id: currentUserId, fullName: caller?.fullName || '', profileImage: caller?.profileImage || '' },
                    receiver: { id: receiverId, fullName: receiver?.fullName || '', profileImage: receiver?.profileImage || '' },
                });

                if (isUserOnline(receiverId)) {
                    io.to(receiverId).emit('incoming_call', {
                        roomName,
                        type,
                        callerInfo: { id: currentUserId, fullName: caller?.fullName, profileImage: caller?.profileImage },
                        receiverInfo: { id: receiverId, fullName: receiver?.fullName, profileImage: receiver?.profileImage },
                    });
                } else {
                    await sendNotification(
                        receiverId,
                        `Incoming ${type} call`,
                        `Missed ${type} call from ${caller?.fullName || 'User'}`,
                        { type: 'call', callType: type, callerId: currentUserId }
                    );
                }
            });

            // accept_call
            socket.on('accept_call', async (data: { roomName: string; type: string }) => {
                const { roomName, type } = data;
                const callInfo = activeCalls.get(roomName);
                console.log(callInfo, "----------------------");
                if (callInfo) {
                    io.to(callInfo.caller.id).emit('call_accepted', {
                        roomName,
                        type,
                        callerInfo: callInfo.caller,
                        receiverInfo: callInfo.receiver,
                    });
                }
            });

            // reject_call
            socket.on('reject_call', async (data: { roomName: string }) => {
                const { roomName } = data;
                const callInfo = activeCalls.get(roomName);
                if (callInfo) {
                    io.to(callInfo.caller.id).emit('call_rejected', { roomName });
                    activeCalls.delete(roomName);
                }
            });

            // end_call
            socket.on('end_call', async (data: { roomName: string }) => {
                const { roomName } = data;
                const callInfo = activeCalls.get(roomName);
                if (callInfo) {
                    io.to(callInfo.caller.id).emit('call_ended', { roomName });
                    io.to(callInfo.receiver.id).emit('call_ended', { roomName });
                    activeCalls.delete(roomName);
                }
            });

            const markMessagesSeen = async (data: TSeenMessagePayload) => {
                try {
                    const { conversationId, messageId } = data;
                    const conversation = await getConversationForUser(
                        socket,
                        conversationId,
                        currentUserId
                    );

                    if (!conversation) {
                        return;
                    }

                    if (messageId && !Types.ObjectId.isValid(messageId)) {
                        socket.emit('message_error', { message: 'Invalid messageId' });
                        return;
                    }

                    const seenFilter = {
                        conversation: conversation._id,
                        receiver: new Types.ObjectId(currentUserId),
                        status: { $ne: 'seen' },
                        ...(messageId ? { _id: new Types.ObjectId(messageId) } : {}),
                    };

                    const messages = await Message.find(seenFilter).select(
                        '_id conversation sender'
                    );

                    if (!messages.length) {
                        return;
                    }

                    await Message.updateMany(
                        { _id: { $in: messages.map((message) => message._id) } },
                        { status: 'seen' }
                    );

                    const messageIds = messages.map((message) => message._id);
                    const payload = {
                        conversationId: conversation._id,
                        messageIds,
                        status: 'seen' as const,
                    };

                    socket.emit('messages_seen', payload);

                    const senderIds = new Set(
                        messages.map((message) => message.sender.toString())
                    );
                    senderIds.forEach((senderId) => {
                        io.to(senderId).emit('messages_seen', payload);
                    });

                    messages.forEach((message) => {
                        const statusPayload = {
                            conversationId: message.conversation,
                            messageId: message._id,
                            status: 'seen' as const,
                        };

                        emitMessageStatus(message.sender.toString(), statusPayload);
                        emitMessageStatus(currentUserId, statusPayload);
                    });
                } catch (error) {
                    console.error('Socket seen_message error:', error);
                    socket.emit('message_error', { message: 'Failed to mark messages as seen' });
                }
            };

            socket.on('typing', async (data: { conversationId: string; isTyping: boolean }) => {
                try {
                    const { conversationId, isTyping } = data;
                    if (!conversationId) {
                        return;
                    }
                    const conversation = await getConversationForUser(
                        socket,
                        conversationId,
                        currentUserId
                    );
                    if (!conversation) {
                        return;
                    }
                    const receiverId = conversation.participants.find(
                        (participantId) => participantId.toString() !== currentUserId
                    );
                    if (receiverId) {
                        const receiverUserId = receiverId.toString();
                        if (isUserOnline(receiverUserId)) {
                            io.to(receiverUserId).emit('typing', {
                                conversationId,
                                userId: currentUserId,
                                isTyping,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Socket typing error:', error);
                }
            });

            socket.on('seen_message', markMessagesSeen);
            socket.on('mark_messages_seen', markMessagesSeen);

            socket.on('disconnect', async (reason) => {
                console.log("DISCONNECTED", reason);
                for (const [room, participants] of activeCalls.entries()) {
                    if (participants.caller.id === currentUserId || participants.receiver.id === currentUserId) {
                        activeCalls.delete(room);
                        io.to(participants.caller.id).emit('call_ended', { roomName: room });
                        io.to(participants.receiver.id).emit('call_ended', { roomName: room });
                    }
                }
                removeOnlineUser(currentUserId, socket.id);
                if (!onlineUsers.has(currentUserId)) {
                    await emitOnlineUsersToPartners(currentUserId);
                }
            });
        });
    }
    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error(
            'Socket.io is not initialized. Call initializeSocket first.'
        );
    }
    return io;
};

export { emitConversations, getIO, initializeSocket };

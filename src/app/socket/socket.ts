/* eslint-disable no-console */
import { Server as HTTPServer } from 'http';
import { Types } from 'mongoose';
import { Server as IOServer, Socket } from 'socket.io';
import { getPublicFileUrl } from '../helper/multer-s3-uploader';
import { sendSinglePushNotification } from '../helper/sendPushNotification';
import { Conversation, Message } from '../modules/chat/chat.model';
import { ChatAsset } from '../modules/chat-asset/chat-asset.model';
import User from '../modules/user/user-model';

type TMessageStatus = 'sent' | 'delivered' | 'seen';

type TSendMessagePayload = {
    conversationId: string;
    text?: string;
    file?: string;
    assetId?: string;
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
const activeCalls = new Map<string, { caller: string; receiver: string }>();

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

const emitOnlineUsers = () => {
    io.emit('onlineUser', getOnlineUserIds());
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
                type: 'chat',
                conversationId: String(message.conversation),
                messageId: String(message._id),
                senderId: String(message.sender),
            }
        );
    } catch (error) {
        console.error('Offline message push notification failed:', error);
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
            emitOnlineUsers();

            await markPendingMessagesAsDelivered(currentUserId);

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
                } catch (error) {
                    console.error('Socket send_message error:', error);
                    socket.emit('message_error', { message: 'Failed to send message' });
                }
            });

            // ==================== Call Events ====================
            // A user initiates a call
            socket.on('call_user', async (data: { receiverId: string; type: 'audio' | 'video' }) => {
                const { receiverId, type } = data;
                const roomName = `${currentUserId}-${receiverId}-${Date.now()}`;
                // Store the active call
                activeCalls.set(roomName, { caller: currentUserId, receiver: receiverId });
                io.to(receiverId).emit('incoming_call', { caller: currentUserId, roomName, type });
            });

            // Receiver accepts the call
            socket.on('accept_call', async (data: { roomName: string }) => {
                const { roomName } = data;
                const callInfo = activeCalls.get(roomName);
                if (callInfo) {
                    io.to(callInfo.caller).emit('call_accepted', { roomName });
                }
            });

            // Receiver rejects the call
            socket.on('reject_call', async (data: { roomName: string }) => {
                const { roomName } = data;
                const callInfo = activeCalls.get(roomName);
                if (callInfo) {
                    io.to(callInfo.caller).emit('call_rejected', { roomName });
                    activeCalls.delete(roomName);
                }
            });

            // Either party ends the call
            socket.on('end_call', async (data: { roomName: string }) => {
                const { roomName } = data;
                const callInfo = activeCalls.get(roomName);
                if (callInfo) {
                    const otherId = callInfo.caller === currentUserId ? callInfo.receiver : callInfo.caller;
                    io.to(otherId).emit('call_ended', { roomName });
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

            socket.on('seen_message', markMessagesSeen);
            socket.on('mark_messages_seen', markMessagesSeen);

            socket.on('disconnect', (reason) => {
                console.log("DISCONNECTED", reason);
                // Clean up any active calls involving this user
                for (const [room, participants] of activeCalls.entries()) {
                    if (participants.caller === currentUserId || participants.receiver === currentUserId) {
                        activeCalls.delete(room);
                        const otherId = participants.caller === currentUserId ? participants.receiver : participants.caller;
                        io.to(otherId).emit('call_ended', { roomName: room });
                    }
                }
                removeOnlineUser(currentUserId, socket.id);
                emitOnlineUsers();
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

export { getIO, initializeSocket };

import { Chat, Message, StressScore, Notification } from '../models/index.js';
import { generateChatResponse, analyzeStressScore } from '../services/aiService.js';

export const startChat = async (req, res, next) => {
  try {
    const chat = await Chat.create({
      userId: req.user.id
    });

    const fullChat = await Chat.findByPk(chat.id, {
      include: [{ model: Message, as: 'messages' }]
    });

    res.status(201).json({ success: true, chat: fullChat });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req, res, next) => {
  try {
    const chats = await Chat.findAll({
      where: { userId: req.user.id },
      order: [['updatedAt', 'DESC']],
      include: [{ model: Message, as: 'messages' }]
    });
    res.status(200).json({ success: true, count: chats.length, chats });
  } catch (error) {
    next(error);
  }
};

export const getChatById = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Message, as: 'messages' }]
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }
    res.status(200).json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Please enter a message' });
    }

    const chat = await Chat.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Message, as: 'messages' }]
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat session not found' });
    }

    const existingMessages = chat.messages || [];

    // 1. Generate AI Response
    const aiText = await generateChatResponse(existingMessages, content);

    // 2. Analyze Stress Score
    const analysis = await analyzeStressScore(content, aiText);

    // 3. Save User Message & AI Message
    await Message.create({
      chatId: chat.id,
      sender: 'user',
      content,
      sentimentScore: (100 - analysis.score) / 50 - 1
    });

    await Message.create({
      chatId: chat.id,
      sender: 'ai',
      content: aiText
    });

    // Update session stats
    chat.stressScore = analysis.score;
    chat.category = analysis.category;
    chat.aiNotes = analysis.explanation;
    await chat.save();

    // 4. Save StressScore
    await StressScore.create({
      userId: req.user.id,
      score: analysis.score,
      category: analysis.category,
      source: 'Chat'
    });

    // 5. Trigger Notification
    if (analysis.category === 'Critical' || analysis.category === 'High') {
      await Notification.create({
        userId: req.user.id,
        title: `${analysis.category} Stress Detected`,
        message: `Your chat session indicated high tension. Please check our breathing and meditation shortcuts.`,
        type: 'stress_alert'
      });
    }

    const updatedChat = await Chat.findByPk(chat.id, {
      include: [{ model: Message, as: 'messages' }]
    });

    res.status(200).json({
      success: true,
      chat: updatedChat,
      analysis: {
        score: analysis.score,
        category: analysis.category,
        explanation: analysis.explanation
      }
    });
  } catch (error) {
    next(error);
  }
};

import express from 'express';
import Chat from '../models/Chat.js';
import ollama from 'ollama';

const router = express.Router();

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ updatedAt: -1 });
    const recentChats = await Chat.find()
          .sort({ updatedAt: -1 })
          .limit(5);
    res.render('history', { recentChats, chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new chat
router.post('/new', async (req, res) => {
  try {
    const { model, systemPrompt } = req.body;

    const messages = [];
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    const newChat = new Chat({
      model,
      messages
    });

    await newChat.save();
    res.redirect(`/chat/${newChat._id}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific chat
router.get('/:id', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.redirect('/');
    }

    const models = await ollama.list();

    const recentChats = await Chat.find()
          .sort({ updatedAt: -1 })
          .limit(5);

    res.render('chat', {
      chat,
      recentChats,
      models: models.models
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Add user message
    chat.messages.push({
      role: 'user',
      content: message
    });

    // Get response from Ollama
    const response = await ollama.chat({
      model: chat.model,
      messages: chat.messages
    });

    // Add assistant response
    chat.messages.push({
      role: 'assistant',
      content: response.message.content
    });

    // Update chat title if it's still the default
    if (chat.title === 'New Chat' && chat.messages.length > 0) {
      chat.title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
    }

    chat.updatedAt = Date.now();
    await chat.save();

    res.json({
      success: true,
      reply: response.message.content,
      chatId: chat._id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update chat settings
router.put('/:id', async (req, res) => {
  try {
    const { title, model } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    if (title) chat.title = title;
    if (model) chat.model = model;

    await chat.save();
    res.json({ success: true, chat });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete chat
router.delete('/:id', async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
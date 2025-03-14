import express from 'express';
import Chat from '../models/Chat.js';
import ollama from 'ollama';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const router = express.Router();

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ updatedAt: -1 });
    const recentChats = await Chat.find()
      .sort({ updatedAt: -1 })
      .limit(5);
    res.render('history', { recentChats, chats, });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new chat
router.post('/new', async (req, res) => {
  try {
    const { model, systemPrompt } = req.body;

    const messages = [];
    messages.push({
      role: 'system',
      // content: 'Respond in a simple, straightforward manner without being overly friendly or emotional. Output where necessary in HTML tags; your tags are injected into the chat interface frontend. Wrap code blocks with pre and code tags. Do not write in markdown unless asked.'
      content: 'Respond concisely and factually. Prioritize accuracy and clarity. Avoid speculation, opinions, or emotional language. When presenting information, use structured formats like lists or tables where appropriate.'
    });

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
      models: models.models,
      marked: marked,
      DOMPurify: DOMPurify
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
// router.post('/:id/message', async (req, res) => {
//   try {
//     const { message } = req.body;
//     const chat = await Chat.findById(req.params.id);

//     if (!chat) {
//       return res.status(404).json({ error: 'Chat not found' });
//     }

//     // Add user message
//     chat.messages.push({
//       role: 'user',
//       content: message
//     });

//     // Get response from Ollama
//     const response = await ollama.chat({
//       model: chat.model,
//       messages: chat.messages
//     });

//     // Add assistant response
//     chat.messages.push({
//       role: 'assistant',
//       content: response.message.content
//     });

//     // Update chat title if it's still the default
//     if (chat.title === 'New Chat' && chat.messages.length > 0) {
//       chat.title = message.substring(0, 20) + (message.length > 20 ? '...' : '');
//     }

//     chat.updatedAt = Date.now();
//     await chat.save();

//     res.json({
//       success: true,
//       reply: response.message.content,
//       chatId: chat._id
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

router.post('/:id/message', async (req, res) => {
  try {
    const { message } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Add user message
    chat.messages.push({ role: 'user', content: message });

    // Update chat title if it's still the default
    if (chat.title === 'New Chat' && chat.messages.length > 0) {
      chat.title = message.substring(0, 20) + (message.length > 20 ? '...' : '');
    }

    chat.updatedAt = Date.now();
    await chat.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/stream', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const lastUserMessage = chat.messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await ollama.chat({
      model: chat.model,
      messages: [{ role: 'user', content: lastUserMessage.content }],
      stream: true
    });

    let assistantResponse = '';

    for await (const part of stream) {
      res.write(`data: ${JSON.stringify(part)}\n\n`);
      assistantResponse += part.message.content;
    }

    res.write('data: [DONE]\n\n'); // Signal completion
    res.end();

    // Save assistant response
    chat.messages.push({ role: 'assistant', content: assistantResponse });
    chat.updatedAt = Date.now();
    await chat.save();
  } catch (error) {
    console.error(error);
    res.write(`data: {"error": "${error.message}"}\n\n`);
    res.end();
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